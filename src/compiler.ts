import ts from 'typescript';
import { stringify as yamlStringify } from 'yaml';

import { evaluate } from './eval';

function _compile(inputFile: string, loose: boolean): object {
  const tsConfigPath = ts.findConfigFile(inputFile, ts.sys.fileExists);

  if (!tsConfigPath) {
    throw new Error('Could not find a tsconfig.json file.');
  }

  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    tsConfigPath.substring(0, tsConfigPath.lastIndexOf('/')),
  );

  const program = ts.createProgram(
    [inputFile, ...compilerOptions.fileNames],
    compilerOptions.options,
  );
  const typeChecker = program.getTypeChecker();
  const enumMap: { [filePath: string]: { [key: string]: any } } = {};
  let output: { [key: string]: any } = {};

  // First pass: collect enum values from all files
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }
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
              loose,
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
          loose,
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

  return output;
}

export function compile(
  inputFile: string,
  format: 'json' | 'yaml',
  loose: boolean,
) {
  const output = _compile(inputFile, loose);
  if (format === 'json') {
    return JSON.stringify(output, null, 2);
  } else if (format === 'yaml') {
    return yamlStringify(output);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
}
