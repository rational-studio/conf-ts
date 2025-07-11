import ts from 'typescript';

const TYPE_CASTING_FUNCTIONS = ['String', 'Number', 'Boolean'];

export function evaluate(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  loose: boolean,
): any {
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
        loose,
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
          loose,
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
              loose,
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
          loose,
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
          loose,
        );
        elements.push(...spreadElements);
      } else {
        elements.push(
          evaluate(element, sourceFile, typeChecker, enumMap, loose),
        );
      }
    }
    return elements;
  } else if (ts.isIdentifier(expression)) {
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
            loose,
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
              loose,
            );
          }
        }
      }
    }
    throw new Error(
      `Unsupported property access expression: ${expression.getText(
        sourceFile,
      )}`,
    );
  } else if (ts.isBinaryExpression(expression)) {
    const left = evaluate(
      expression.left,
      sourceFile,
      typeChecker,
      enumMap,
      loose,
    );
    const right = evaluate(
      expression.right,
      sourceFile,
      typeChecker,
      enumMap,
      loose,
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
      `Unsupported "new" expression: ${expression.expression.getText(
        sourceFile,
      )}`,
    );
  } else if (ts.isCallExpression(expression)) {
    const callee = expression.expression.getText(sourceFile);
    if (loose) {
      if (
        TYPE_CASTING_FUNCTIONS.includes(callee) &&
        expression.arguments.length === 1
      ) {
        const argument = evaluate(
          expression.arguments[0],
          sourceFile,
          typeChecker,
          enumMap,
          loose,
        );
        if (callee === 'String') {
          return String(argument);
        }
        if (callee === 'Number') {
          return Number(argument);
        }
        if (callee === 'Boolean') {
          return Boolean(argument);
        }
      }
    }
    if (TYPE_CASTING_FUNCTIONS.includes(callee)) {
      throw new Error(
        'Type casting using String(), Number(), and Boolean() is only allowed in loose mode',
      );
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
      loose,
    );
  } else if (ts.isRegularExpressionLiteral(expression)) {
    throw new Error('Unsupported type: RegExp');
  } else {
    throw new Error(
      `Unsupported syntax kind: ${ts.SyntaxKind[expression.kind]}`,
    );
  }
}
