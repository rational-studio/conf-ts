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
      // Only allow a single return statement
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
        evaluatedFiles,
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
    `Unsupported call expression in macro mode: ${expression.getText(
      sourceFile,
    )}`,
    {
      file: sourceFile.fileName,
      ...ts.getLineAndCharacterOfPosition(sourceFile, expression.getStart()),
    },
  );
}
