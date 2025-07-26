import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'vitest';

import { compile } from '../src/compiler';

const SPEC_DIR = path.join(__dirname, 'specs');
const MACRO_DIR = path.join(__dirname, 'macros');

function assertOutput(
  inputFolder: string,
  testName: string,
  macroMode = false,
) {
  const inputFilePath = path.join(inputFolder, `${testName}.conf.ts`);
  const expectedOutputFilePath = path.join(inputFolder, `${testName}.json`);

  const expectedOutput = JSON.parse(
    fs.readFileSync(expectedOutputFilePath, 'utf-8'),
  );
  const expectedYamlOutputFilePath = path.join(inputFolder, `${testName}.yaml`);
  const expectedYamlOutput = fs.readFileSync(
    expectedYamlOutputFilePath,
    'utf-8',
  );

  const jsonResult = JSON.parse(
    compile(inputFilePath, 'json', macroMode).output,
  );
  const { output: yamlResult } = compile(inputFilePath, 'yaml', macroMode);
  expect(jsonResult).toEqual(expectedOutput);
  expect(yamlResult.trimEnd()).toEqual(expectedYamlOutput.trimEnd());
}

function assertError(
  inputFolder: string,
  testName: string,
  expectedError: string,
  macroMode = false,
) {
  const inputFilePath = path.join(inputFolder, `${testName}.conf.ts`);
  expect(() => compile(inputFilePath, 'json', macroMode)).toThrow(
    expectedError,
  );
}

export function assertSpecOutput(testName: string) {
  assertOutput(SPEC_DIR, testName, false);
}

export function assertSpecError(testName: string, expectedError: string) {
  assertError(SPEC_DIR, testName, expectedError, false);
}

export function assertMacroOutput(testName: string) {
  assertOutput(MACRO_DIR, testName, true);
}

export function assertMacroError(testName: string, expectedError: string) {
  assertError(MACRO_DIR, testName, expectedError, true);
}
