import { sep } from 'path';
import ts from 'typescript';
import { stringify as yamlStringify } from 'yaml';

import { MACRO_FUNCTIONS, MACRO_PACKAGE } from './constants';
import { evaluate } from './eval';

function validateMacroImports(
  sourceFile: ts.SourceFile,
  macro: boolean,
): Set<string> {
  const macroImports = new Set<string>();

  if (!macro) {
    return macroImports;
  }

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleSpecifier = node.moduleSpecifier
        .getText(sourceFile)
        .slice(1, -1); // Remove quotes
      if (moduleSpecifier === MACRO_PACKAGE) {
        if (node.importClause && node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(
              importSpecifier => {
                const importedName = importSpecifier.name.getText(sourceFile);
                // @ts-expect-error
                if (MACRO_FUNCTIONS.includes(importedName)) {
                  macroImports.add(importedName);
                }
              },
            );
          }
        }
      }
    }
  });

  return macroImports;
}

function _compile(
  inputFile: string,
  macro: boolean,
): { output: object; evaluatedFiles: Set<string> } {
  const tsConfigPath = ts.findConfigFile(inputFile, ts.sys.fileExists);

  if (!tsConfigPath) {
    throw new Error('Could not find a tsconfig.json file.');
  }

  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    tsConfigPath.substring(0, tsConfigPath.lastIndexOf(sep)),
  );

  const program = ts.createProgram(
    [inputFile, ...compilerOptions.fileNames],
    compilerOptions.options,
  );
  const typeChecker = program.getTypeChecker();
  const enumMap: { [filePath: string]: { [key: string]: any } } = {};
  const macroImportsMap: { [filePath: string]: Set<string> } = {};
  let output: { [key: string]: any } = {};
  const evaluatedFiles: Set<string> = new Set();

  // First pass: collect enum values and macro imports from all files
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    // Validate macro imports for this file
    macroImportsMap[sourceFile.fileName] = validateMacroImports(
      sourceFile,
      macro,
    );

    ts.forEachChild(sourceFile, node => {
      if (ts.isEnumDeclaration(node)) {
        let nextEnumValue = 0;
        node.members.forEach(member => {
          const enumName = node.name.getText(sourceFile);
          const memberName = member.name.getText(sourceFile);
          const fullEnumMemberName = `${enumName}.${memberName}`;
          if (!enumMap[sourceFile.fileName]) {
            enumMap[sourceFile.fileName] = {};
          }
          if (member.initializer) {
            const value = evaluate(
              member.initializer,
              sourceFile,
              typeChecker,
              enumMap,
              macroImportsMap,
              macro,
              evaluatedFiles,
            );
            enumMap[sourceFile.fileName][fullEnumMemberName] = value;
            if (typeof value === 'number') {
              nextEnumValue = value + 1;
            }
          } else {
            enumMap[sourceFile.fileName][fullEnumMemberName] = nextEnumValue;
            nextEnumValue++;
          }
        });
      }
    });
  }

  // Second pass: evaluate the default export from the entry file only
  const entrySourceFile = program.getSourceFile(inputFile);
  if (entrySourceFile) {
    let foundDefaultExport = false;
    ts.forEachChild(entrySourceFile, node => {
      if (ts.isExportAssignment(node)) {
        output = evaluate(
          node.expression,
          entrySourceFile,
          typeChecker,
          enumMap,
          macroImportsMap,
          macro,
          evaluatedFiles,
        );
        foundDefaultExport = true;
      }
    });
    if (!foundDefaultExport) {
      throw new Error(
        `No default export found in the entry file: ${entrySourceFile.fileName}`,
      );
    }
  }

  return { output, evaluatedFiles };
}

export function compile(
  inputFile: string,
  format: 'json' | 'yaml',
  macro: boolean,
) {
  const { output, evaluatedFiles } = _compile(inputFile, macro);
  const fileNames = Array.from(evaluatedFiles);
  if (format === 'json') {
    return { output: JSON.stringify(output, null, 2), dependencies: fileNames };
  } else if (format === 'yaml') {
    return { output: yamlStringify(output), dependencies: fileNames };
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
}
