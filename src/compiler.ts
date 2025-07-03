import ts from "typescript";
import { stringify } from "yaml";
import { evaluate } from "./eval";

function _compile(inputFiles: string[]): object {
  const program = ts.createProgram(inputFiles, {});
  const typeChecker = program.getTypeChecker();
  const enumMap: { [key: string]: any } = {};
  let output: { [key: string]: any } = {};

  // First pass: collect enum values from all files
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isEnumDeclaration(node)) {
        let nextEnumValue = 0;
        node.members.forEach((member) => {
          const enumName = node.name.getText(sourceFile);
          const memberName = member.name.getText(sourceFile);
          const fullEnumMemberName = `${enumName}.${memberName}`;

          if (member.initializer) {
            const value = evaluate(
              member.initializer,
              sourceFile,
              typeChecker,
              enumMap
            );
            enumMap[fullEnumMemberName] = value;
            if (typeof value === "number") {
              nextEnumValue = value + 1;
            }
          } else {
            enumMap[fullEnumMemberName] = nextEnumValue;
            nextEnumValue++;
          }
        });
      }
    });
  }

  // Second pass: evaluate the default export from the entry file only
  const entrySourceFile = program.getSourceFile(
    inputFiles[inputFiles.length - 1]
  ); // The last input file is the entry file
  if (entrySourceFile) {
    let foundDefaultExport = false;
    ts.forEachChild(entrySourceFile, (node) => {
      if (ts.isExportAssignment(node)) {
        output = evaluate(
          node.expression,
          entrySourceFile,
          typeChecker,
          enumMap
        );
        foundDefaultExport = true;
      }
    });
    if (!foundDefaultExport) {
      throw new Error(
        `No default export found in the entry file: ${entrySourceFile.fileName}`
      );
    }
  }

  return output;
}

export function compile(inputFiles: string[], format: "json" | "yaml") {
  const output = _compile(inputFiles);
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  } else if (format === "yaml") {
    return stringify(output);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
}
