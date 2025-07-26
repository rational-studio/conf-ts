import ts from 'typescript';

import { MACRO_FUNCTIONS } from './constants';
import { evaluateMacro } from './macro';

export function evaluate(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
  macro: boolean,
  evaluatedFiles: Set<string>,
  context?: { [name: string]: any },
): any {
  evaluatedFiles.add(sourceFile.fileName);
  if (macro) {
    // Populate macroImportsMap for the current sourceFile
    if (!macroImportsMap[sourceFile.fileName]) {
      macroImportsMap[sourceFile.fileName] = new Set<string>();
      sourceFile.statements.forEach(statement => {
        if (ts.isImportDeclaration(statement)) {
          const moduleSpecifier = statement.moduleSpecifier.getText(sourceFile);
          if (moduleSpecifier === "'@conf-ts/macro'") {
            if (
              statement.importClause &&
              statement.importClause.namedBindings
            ) {
              const namedBindings = statement.importClause.namedBindings;
              if (ts.isNamedImports(namedBindings)) {
                namedBindings.elements.forEach(element => {
                  macroImportsMap[sourceFile.fileName].add(
                    element.name.getText(sourceFile),
                  );
                });
              }
            }
          }
        }
      });
    }
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  } else if (ts.isTemplateExpression(expression)) {
    let result = expression.head.text;
    for (const span of expression.templateSpans) {
      result += evaluate(
        span.expression,
        sourceFile,
        typeChecker,
        enumMap,
        macroImportsMap,
        macro,
        evaluatedFiles,
        context,
      );
      result += span.literal.text;
    }
    return result;
  } else if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  } else if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  } else if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  } else if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  } else if (ts.isObjectLiteralExpression(expression)) {
    const obj: { [key: string]: any } = {};
    expression.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop)) {
        const name = prop.name.getText(sourceFile);
        obj[name] = evaluate(
          prop.initializer,
          sourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
          context,
        );
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        const name = prop.name.getText(sourceFile);
        const shorthandSymbol =
          typeChecker.getShorthandAssignmentValueSymbol(prop);
        if (shorthandSymbol) {
          let resolvedSymbol = shorthandSymbol;
          if (shorthandSymbol.flags & ts.SymbolFlags.Alias) {
            resolvedSymbol = typeChecker.getAliasedSymbol(shorthandSymbol);
          }

          if (
            resolvedSymbol.valueDeclaration &&
            ts.isVariableDeclaration(resolvedSymbol.valueDeclaration) &&
            resolvedSymbol.valueDeclaration.initializer
          ) {
            obj[name] = evaluate(
              resolvedSymbol.valueDeclaration.initializer,
              resolvedSymbol.valueDeclaration.getSourceFile(),
              typeChecker,
              enumMap,
              macroImportsMap,
              macro,
              evaluatedFiles,
              context,
            );
          } else {
            throw new Error(
              `Could not resolve shorthand property '${name}' because its declaration is not a variable or has no initializer.`,
            );
          }
        } else {
          throw new Error(
            `Could not find symbol for shorthand property '${name}'.`,
          );
        }
      } else if (ts.isSpreadAssignment(prop)) {
        const spreadObj = evaluate(
          prop.expression,
          sourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
          context,
        );
        Object.assign(obj, spreadObj);
      }
    });
    return obj;
  } else if (ts.isArrayLiteralExpression(expression)) {
    const elements: any[] = [];
    for (const element of expression.elements) {
      if (ts.isSpreadElement(element)) {
        const spreadElements = evaluate(
          element.expression,
          sourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
          context,
        );
        elements.push(...spreadElements);
      } else {
        elements.push(
          evaluate(
            element,
            sourceFile,
            typeChecker,
            enumMap,
            macroImportsMap,
            macro,
            evaluatedFiles,
            context,
          ),
        );
      }
    }
    return elements;
  } else if (ts.isIdentifier(expression)) {
    if (
      context &&
      Object.prototype.hasOwnProperty.call(context, expression.text)
    ) {
      return context[expression.text];
    }
    const symbol = typeChecker.getSymbolAtLocation(expression);
    if (symbol) {
      let resolvedSymbol = symbol;
      if (symbol.flags & ts.SymbolFlags.Alias) {
        resolvedSymbol = typeChecker.getAliasedSymbol(symbol);
      }

      if (resolvedSymbol.valueDeclaration) {
        if (
          ts.isVariableDeclaration(resolvedSymbol.valueDeclaration) &&
          resolvedSymbol.valueDeclaration.initializer
        ) {
          return evaluate(
            resolvedSymbol.valueDeclaration.initializer,
            resolvedSymbol.valueDeclaration.getSourceFile(),
            typeChecker,
            enumMap,
            macroImportsMap,
            macro,
            evaluatedFiles,
            context,
          );
        } else if (ts.isEnumMember(resolvedSymbol.valueDeclaration)) {
          const enumName = resolvedSymbol.valueDeclaration.parent.name.getText(
            resolvedSymbol.valueDeclaration.getSourceFile(),
          );
          const memberName = resolvedSymbol.valueDeclaration.name.getText(
            resolvedSymbol.valueDeclaration.getSourceFile(),
          );
          const fullEnumMemberName = `${enumName}.${memberName}`;
          if (
            enumMap[sourceFile.fileName] &&
            enumMap[sourceFile.fileName].hasOwnProperty(fullEnumMemberName)
          ) {
            return enumMap[sourceFile.fileName][fullEnumMemberName];
          }
        }
      }
    }
    throw new Error(
      `Unsupported variable type for identifier: ${expression.text}`,
    );
  } else if (ts.isPropertyAccessExpression(expression)) {
    try {
      const obj = evaluate(
        expression.expression,
        sourceFile,
        typeChecker,
        enumMap,
        macroImportsMap,
        macro,
        evaluatedFiles,
        context,
      );
      const propertyName = expression.name.getText(sourceFile);
      if (obj && typeof obj === 'object' && propertyName in obj) {
        return obj[propertyName];
      }
    } catch (error) {
      // This can happen when the property access is on an enum,
      // so we fall through to the enum handling logic.
    }

    const name = expression.getText(sourceFile);
    if (
      enumMap[sourceFile.fileName] &&
      enumMap[sourceFile.fileName].hasOwnProperty(name)
    ) {
      return enumMap[sourceFile.fileName][name];
    }
    const symbol = typeChecker.getSymbolAtLocation(expression);
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations && declarations.length > 0) {
        const declaration = declarations[0];
        if (ts.isEnumMember(declaration)) {
          if (declaration.initializer) {
            return evaluate(
              declaration.initializer,
              declaration.getSourceFile(),
              typeChecker,
              enumMap,
              macroImportsMap,
              macro,
              evaluatedFiles,
              context,
            );
          }
        }
      }
    }
    throw new Error(
      `Unsupported property access expression: ${expression.getText(sourceFile)}`,
    );
  } else if (ts.isPrefixUnaryExpression(expression)) {
    const operand = evaluate(
      expression.operand,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );

    switch (expression.operator) {
      case ts.SyntaxKind.PlusToken:
        return +operand;
      case ts.SyntaxKind.MinusToken:
        return -operand;
      case ts.SyntaxKind.ExclamationToken:
        return !operand;
      case ts.SyntaxKind.TildeToken:
        return ~operand;
      default:
        throw new Error(
          `Unsupported unary operator: ${ts.SyntaxKind[expression.operator]}`,
        );
    }
  } else if (ts.isBinaryExpression(expression)) {
    const left = evaluate(
      expression.left,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );
    const right = evaluate(
      expression.right,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );

    switch (expression.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return left + right;
      case ts.SyntaxKind.MinusToken:
        return left - right;
      case ts.SyntaxKind.AsteriskToken:
        return left * right;
      case ts.SyntaxKind.SlashToken:
        return left / right;
      case ts.SyntaxKind.PercentToken:
        return left % right;
      case ts.SyntaxKind.GreaterThanToken:
        return left > right;
      case ts.SyntaxKind.LessThanToken:
        return left < right;
      case ts.SyntaxKind.GreaterThanEqualsToken:
        return left >= right;
      case ts.SyntaxKind.LessThanEqualsToken:
        return left <= right;
      case ts.SyntaxKind.EqualsEqualsToken:
        return left == right;
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        return left === right;
      case ts.SyntaxKind.ExclamationEqualsToken:
        return left != right;
      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        return left !== right;
      default:
        throw new Error(
          `Unsupported binary operator: ${
            ts.SyntaxKind[expression.operatorToken.kind]
          }`,
        );
    }
  } else if (
    ts.isArrowFunction(expression) ||
    ts.isFunctionExpression(expression)
  ) {
    throw new Error('Unsupported type: Function');
  } else if (ts.isNewExpression(expression)) {
    if (expression.expression.getText(sourceFile) === 'Date') {
      throw new Error('Unsupported type: Date');
    }
    throw new Error(
      `Unsupported "new" expression: ${expression.expression.getText(sourceFile)}`,
    );
  } else if (ts.isCallExpression(expression)) {
    if (macro) {
      return evaluateMacro(
        expression,
        sourceFile,
        typeChecker,
        enumMap,
        macroImportsMap,
        evaluatedFiles,
      );
    }
    const callee = expression.expression.getText(sourceFile);
    // @ts-expect-error
    if (MACRO_FUNCTIONS.includes(callee)) {
      throw new Error(`Function "${callee}" is only allowed in macro mode`);
    } else {
      throw new Error(
        `Unsupported call expression: ${expression.getText(sourceFile)}`,
      );
    }
  } else if (ts.isParenthesizedExpression(expression)) {
    return evaluate(
      expression.expression,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );
  } else if (ts.isRegularExpressionLiteral(expression)) {
    throw new Error('Unsupported type: RegExp');
  } else if (ts.isSatisfiesExpression(expression)) {
    return evaluate(
      expression.expression,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );
  } else if (ts.isConditionalExpression(expression)) {
    const condition = evaluate(
      expression.condition,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      macro,
      evaluatedFiles,
      context,
    );
    return condition
      ? evaluate(
          expression.whenTrue,
          sourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
          context,
        )
      : evaluate(
          expression.whenFalse,
          sourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
          context,
        );
  } else {
    throw new Error(
      `Unsupported syntax kind: ${ts.SyntaxKind[expression.kind]}`,
    );
  }
}
