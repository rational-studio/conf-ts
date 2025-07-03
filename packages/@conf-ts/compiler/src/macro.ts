import ts from 'typescript';

import { MACRO_FUNCTIONS } from './constants';
import { evaluate } from './eval';

type MacroFunction = {
  name: (typeof MACRO_FUNCTIONS)[number];
  argLength: number;
};

const TYPE_CASTING_FUNCTIONS = [
  { name: 'String', argLength: 1 },
  { name: 'Number', argLength: 1 },
  { name: 'Boolean', argLength: 1 },
] satisfies MacroFunction[];

const ARRAY_MACRO_FUNCTIONS = [
  { name: 'arrayMap', argLength: 2 },
] satisfies MacroFunction[];

function evaluateTypeCasting(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
) {
  const callee = expression.expression.getText(sourceFile);
  const macroFunction = TYPE_CASTING_FUNCTIONS.find(
    macro => macro.name === callee,
  );
  if (
    macroFunction &&
    expression.arguments.length === macroFunction.argLength
  ) {
    // Check if the function is properly imported from @conf-ts/macro
    const allowedMacroImports =
      macroImportsMap[sourceFile.fileName] || new Set();
    if (!allowedMacroImports.has(callee)) {
      throw new Error(
        `Type casting function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
      );
    }

    const argument = evaluate(
      expression.arguments[0],
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      false, // No macros in macros
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
  return undefined;
}

function evaluateArrayMap(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
): any {
  const callee = expression.expression.getText(sourceFile);
  const macroFunction = ARRAY_MACRO_FUNCTIONS.find(
    macro => macro.name === callee,
  );
  if (
    macroFunction &&
    expression.arguments.length === macroFunction.argLength
  ) {
    // Check if the function is properly imported from @conf-ts/macro
    const allowedMacroImports =
      macroImportsMap[sourceFile.fileName] || new Set();
    if (!allowedMacroImports.has(callee)) {
      throw new Error(
        `Macro function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
      );
    }
    // Evaluate the array argument
    const arr = evaluate(
      expression.arguments[0],
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      false,
    );
    // The callback function
    const callback = expression.arguments[1];
    if (!ts.isArrowFunction(callback)) {
      throw new Error('arrayMap: callback must be an arrow function');
    }
    // Only allow callbacks that use consts (no external references)
    // We check that the body only uses the parameter and literals
    if (callback.parameters.length !== 1) {
      throw new Error('arrayMap: callback must have exactly one parameter');
    }
    const paramName = callback.parameters[0].name.getText(sourceFile);
    // Helper to check if an identifier is allowed (either the param or a literal)
    function isAllowedIdentifier(node: ts.Node): boolean {
      if (ts.isIdentifier(node)) {
        return node.text === paramName;
      }
      return true;
    }
    // Recursively check the callback body for disallowed identifiers
    function checkNode(node: ts.Node): void {
      if (ts.isIdentifier(node)) {
        if (!isAllowedIdentifier(node)) {
          throw new Error(
            'arrayMap: callback can only use its parameter and literals',
          );
        }
      }
      ts.forEachChild(node, checkNode);
    }
    if (ts.isBlock(callback.body)) {
      // Only allow a single return statement
      const stmts = callback.body.statements;
      if (
        stmts.length !== 1 ||
        !ts.isReturnStatement(stmts[0]) ||
        !stmts[0].expression
      ) {
        throw new Error(
          'arrayMap: callback body must be a single return statement',
        );
      }
      checkNode(stmts[0].expression);
    } else {
      // Expression body
      checkNode(callback.body);
    }
    // Now, map the array using the callback
    return arr.map((item: any) => {
      let expr: ts.Expression;
      if (ts.isBlock(callback.body)) {
        expr = (callback.body.statements[0] as ts.ReturnStatement).expression!;
      } else {
        expr = callback.body;
      }
      // Use evaluate with context binding paramName to item
      return evaluate(
        expr,
        sourceFile,
        typeChecker,
        enumMap,
        macroImportsMap,
        true,
        { [paramName]: item },
      );
    });
  }
  return undefined;
}

export function evaluateMacro(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
): any {
  let result = evaluateTypeCasting(
    expression,
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
  );
  if (result !== undefined) {
    return result;
  }
  result = evaluateArrayMap(
    expression,
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
  );
  if (result !== undefined) {
    return result;
  }
  throw new Error(
    `Unsupported call expression in macro mode: ${expression.getText(
      sourceFile,
    )}`,
  );
}
