import ts from 'typescript';

import { MACRO_FUNCTIONS } from './constants';
import { ConfTSError, SourceLocation } from './error';
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
  { name: 'arrayFilter', argLength: 2 },
] satisfies MacroFunction[];

const ENV_MACRO_FUNCTIONS = [
  { name: 'env', argLength: 1 },
] satisfies MacroFunction[];

function evaluateEnv(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
  evaluatedFiles: Set<string>,
) {
  const callee = expression.expression.getText(sourceFile);
  const macroFunction = ENV_MACRO_FUNCTIONS.find(
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
      throw new ConfTSError(
        `Macro function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
        {
          file: sourceFile.fileName,
          ...ts.getLineAndCharacterOfPosition(
            sourceFile,
            expression.getStart(),
          ),
        },
      );
    }

    const argument = evaluate(
      expression.arguments[0],
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      false, // No macros in macros
      evaluatedFiles,
    );
    if (typeof argument !== 'string') {
      throw new ConfTSError('env macro argument must be a string', {
        file: sourceFile.fileName,
        ...ts.getLineAndCharacterOfPosition(
          sourceFile,
          expression.arguments[0].getStart(),
        ),
      });
    }
    // Support both Node and browser environments
    // eslint-disable-next-line no-undef
    const proc: any = typeof process !== 'undefined' ? process : undefined;
    return proc?.env?.[argument];
  }
  return undefined;
}

function evaluateTypeCasting(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
  evaluatedFiles: Set<string>,
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
      throw new ConfTSError(
        `Type casting function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
        {
          file: sourceFile.fileName,
          ...ts.getLineAndCharacterOfPosition(
            sourceFile,
            expression.getStart(),
          ),
        },
      );
    }

    const argument = evaluate(
      expression.arguments[0],
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      false, // No macros in macros
      evaluatedFiles,
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
  evaluatedFiles: Set<string>,
): any {
  const callee = expression.expression.getText(sourceFile);
  // Only process arrayMap here
  if (callee !== 'arrayMap' || expression.arguments.length !== 2) {
    return undefined;
  }
  // Check if the function is properly imported from @conf-ts/macro
  const allowedMacroImports = macroImportsMap[sourceFile.fileName] || new Set();
  if (!allowedMacroImports.has(callee)) {
    throw new ConfTSError(
      `Macro function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
      {
        file: sourceFile.fileName,
        ...ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart()),
      },
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
    evaluatedFiles,
  );
  // The callback function
  const callback = expression.arguments[1];
  if (!ts.isArrowFunction(callback)) {
    throw new ConfTSError('arrayMap: callback must be an arrow function', {
      file: sourceFile.fileName,
      ...ts.getLineAndCharacterOfPosition(sourceFile, callback.getStart()),
    });
  }
  // Only allow callbacks that use consts (no external references)
  // We check that the body only uses the parameter and literals
  if (callback.parameters.length !== 1) {
    throw new ConfTSError(
      'arrayMap: callback must have exactly one parameter',
      {
        file: sourceFile.fileName,
        ...ts.getLineAndCharacterOfPosition(sourceFile, callback.getStart()),
      },
    );
  }
  const paramName = callback.parameters[0].name.getText(sourceFile);
  function isAllowedIdentifier(node: ts.Node): boolean {
    if (ts.isIdentifier(node)) {
      if (node.text === paramName) {
        return true;
      }
      if (
        node.parent &&
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.name === node
      ) {
        let expr = node.parent.expression;
        while (ts.isPropertyAccessExpression(expr)) {
          expr = expr.expression;
        }
        if (ts.isIdentifier(expr) && expr.text === paramName) {
          return true;
        }
      }
      if (
        node.parent &&
        ts.isPropertyAssignment(node.parent) &&
        node.parent.name === node
      ) {
        return true;
      }
      return false;
    }
    return true;
  }
  function checkNode(node: ts.Node): void {
    if (ts.isIdentifier(node)) {
      if (!isAllowedIdentifier(node)) {
        throw new ConfTSError(
          'arrayMap: callback can only use its parameter and literals',
          {
            file: sourceFile.fileName,
            ...ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()),
          },
        );
      }
    }
    ts.forEachChild(node, checkNode);
  }
  if (ts.isBlock(callback.body)) {
    const stmts = callback.body.statements;
    if (
      stmts.length !== 1 ||
      !ts.isReturnStatement(stmts[0]) ||
      !stmts[0].expression
    ) {
      throw new ConfTSError(
        'arrayMap: callback body must be a single return statement',
        {
          file: sourceFile.fileName,
          ...ts.getLineAndCharacterOfPosition(
            sourceFile,
            callback.body.getStart(),
          ),
        },
      );
    }
    checkNode(stmts[0].expression);
  } else {
    checkNode(callback.body);
  }
  return arr.map((item: any) => {
    let expr: ts.Expression;
    if (ts.isBlock(callback.body)) {
      expr = (callback.body.statements[0] as ts.ReturnStatement).expression!;
    } else {
      expr = callback.body;
    }
    return evaluate(
      expr,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      true,
      evaluatedFiles,
      { [paramName]: item },
    );
  });
}

function evaluateArrayFilter(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
  evaluatedFiles: Set<string>,
): any {
  const callee = expression.expression.getText(sourceFile);
  // Only process arrayFilter here
  if (callee !== 'arrayFilter' || expression.arguments.length !== 2) {
    return undefined;
  }
  const allowedMacroImports = macroImportsMap[sourceFile.fileName] || new Set();
  if (!allowedMacroImports.has(callee)) {
    throw new ConfTSError(
      `Macro function '${callee}' must be imported from '@conf-ts/macro' to use in macro mode`,
      {
        file: sourceFile.fileName,
        ...ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart()),
      },
    );
  }
  const arr = evaluate(
    expression.arguments[0],
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
    false,
    evaluatedFiles,
  );
  const callback = expression.arguments[1];
  if (!ts.isArrowFunction(callback)) {
    throw new ConfTSError('arrayFilter: callback must be an arrow function', {
      file: sourceFile.fileName,
      ...ts.getLineAndCharacterOfPosition(sourceFile, callback.getStart()),
    });
  }
  if (callback.parameters.length !== 1) {
    throw new ConfTSError(
      'arrayFilter: callback must have exactly one parameter',
      {
        file: sourceFile.fileName,
        ...ts.getLineAndCharacterOfPosition(sourceFile, callback.getStart()),
      },
    );
  }
  const paramName = callback.parameters[0].name.getText(sourceFile);
  function isAllowedIdentifier(node: ts.Node): boolean {
    if (ts.isIdentifier(node)) {
      if (node.text === paramName) {
        return true;
      }
      if (
        node.parent &&
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.name === node
      ) {
        let expr = node.parent.expression;
        while (ts.isPropertyAccessExpression(expr)) {
          expr = expr.expression;
        }
        if (ts.isIdentifier(expr) && expr.text === paramName) {
          return true;
        }
      }
      if (
        node.parent &&
        ts.isPropertyAssignment(node.parent) &&
        node.parent.name === node
      ) {
        return true;
      }
      return false;
    }
    return true;
  }
  function checkNode(node: ts.Node): void {
    if (ts.isIdentifier(node)) {
      if (!isAllowedIdentifier(node)) {
        throw new ConfTSError(
          'arrayFilter: callback can only use its parameter and literals',
          {
            file: sourceFile.fileName,
            ...ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()),
          },
        );
      }
    }
    ts.forEachChild(node, checkNode);
  }
  if (ts.isBlock(callback.body)) {
    const stmts = callback.body.statements;
    if (
      stmts.length !== 1 ||
      !ts.isReturnStatement(stmts[0]) ||
      !stmts[0].expression
    ) {
      throw new ConfTSError(
        'arrayFilter: callback body must be a single return statement',
        {
          file: sourceFile.fileName,
          ...ts.getLineAndCharacterOfPosition(
            sourceFile,
            callback.body.getStart(),
          ),
        },
      );
    }
    checkNode(stmts[0].expression);
  } else {
    checkNode(callback.body);
  }
  return arr.filter((item: any) => {
    let expr: ts.Expression;
    if (ts.isBlock(callback.body)) {
      expr = (callback.body.statements[0] as ts.ReturnStatement).expression!;
    } else {
      expr = callback.body;
    }
    const result = evaluate(
      expr,
      sourceFile,
      typeChecker,
      enumMap,
      macroImportsMap,
      true,
      evaluatedFiles,
      { [paramName]: item },
    );
    return Boolean(result);
  });
}

export function evaluateMacro(
  expression: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  enumMap: { [filePath: string]: { [key: string]: any } },
  macroImportsMap: { [filePath: string]: Set<string> },
  evaluatedFiles: Set<string>,
): any {
  let result = evaluateTypeCasting(
    expression,
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
    evaluatedFiles,
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
    evaluatedFiles,
  );
  if (result !== undefined) {
    return result;
  }
  result = evaluateArrayFilter(
    expression,
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
    evaluatedFiles,
  );
  if (result !== undefined) {
    return result;
  }
  result = evaluateEnv(
    expression,
    sourceFile,
    typeChecker,
    enumMap,
    macroImportsMap,
    evaluatedFiles,
  );
  if (result !== undefined) {
    return result;
  }
  throw new ConfTSError(
    `Unsupported call expression in macro mode: ${expression.getText(sourceFile)}`,
    {
      file: sourceFile.fileName,
      ...ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart()),
    },
  );
}
