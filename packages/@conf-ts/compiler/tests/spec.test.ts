import { describe, it } from 'vitest';

import { assertSpecError, assertSpecOutput } from './test-utils';

describe('Spec Test', () => {
  it('should compile a default export correctly', () => {
    assertSpecOutput('basic-default-export');
  });

  it('should handle enums correctly', () => {
    assertSpecOutput('enums');
  });

  it('should handle constants referencing other constants', () => {
    assertSpecOutput('constants-reference');
  });

  it('should compile complex types correctly', () => {
    assertSpecOutput('complex-types');
  });

  it('should throw an error for basic types without default export', () => {
    assertSpecError(
      'no-default-export',
      'No default export found in the entry file',
    );
  });

  it('should throw an error for unsupported function type', () => {
    assertSpecError('unsupported-function', 'Unsupported type: Function');
  });

  it('should throw an error for unsupported date type', () => {
    assertSpecError('unsupported-date', 'Unsupported type: Date');
  });

  it('should throw an error for unsupported regex type', () => {
    assertSpecError('unsupported-regex', 'Unsupported type: RegExp');
  });

  it('should handle object and array spread', () => {
    assertSpecOutput('spread');
  });

  it('should handle binary expressions for basic arithmetic operations', () => {
    assertSpecOutput('arithmetic');
  });

  it('should handle string template literals', () => {
    assertSpecOutput('string-template-literal');
  });

  it('should handle unary prefix expressions', () => {
    assertSpecOutput('unary-prefix');
  });

  it('should handle satisfies expressions', () => {
    assertSpecOutput('satisfies');
  });

  it('should handle as-expressions (type assertions and as const)', () => {
    assertSpecOutput('as-expression');
  });

  it('should handle property access in object constants', () => {
    assertSpecOutput('property-access');
  });

  it('should throw an error for let/var variables', () => {
    assertSpecError(
      'unsupported-let-var',
      "Failed to evaluate variable \"c\". Only 'const' declarations are supported, but it was declared with 'let'.",
    );
  });
});
