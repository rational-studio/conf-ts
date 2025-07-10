import { expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { compile } from "../src/compiler";

const SPEC_DIR = path.join(__dirname, "specs");

export function assertOutput(testName: string, looseMode = false) {
  const inputFilePath = path.join(SPEC_DIR, `${testName}.conf.ts`);
  const expectedOutputFilePath = path.join(SPEC_DIR, `${testName}.json`);

  const expectedOutput = fs.readFileSync(expectedOutputFilePath, "utf-8");
  const expectedYamlOutputFilePath = path.join(SPEC_DIR, `${testName}.yaml`);
  const expectedYamlOutput = fs.readFileSync(
    expectedYamlOutputFilePath,
    "utf-8"
  );

  const jsonResult = compile(inputFilePath, "json", looseMode);
  const yamlResult = compile(inputFilePath, "yaml", looseMode);
  expect(jsonResult.trimEnd()).toEqual(expectedOutput.trimEnd());
  expect(yamlResult.trimEnd()).toEqual(expectedYamlOutput.trimEnd());
}

export function assertError(
  testName: string,
  expectedError: string,
  looseMode = false
) {
  const inputFilePath = path.join(SPEC_DIR, `${testName}.conf.ts`);
  expect(() => compile(inputFilePath, "json", looseMode)).toThrow(
    expectedError
  );
}
