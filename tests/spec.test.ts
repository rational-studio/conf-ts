import { describe, it } from 'vitest';

import { assertError, assertOutput } from './test-utils';

describe('Spec Test', () => {
  it('should compile a default export correctly', () => {
    assertOutput('basic-default-export');
  });

  it('should handle enums correctly', () => {
    assertOutput('enums');
  });

  it('should handle constants referencing other constants', () => {
    assertOutput('constants-reference');
  });

  it('should compile complex types correctly', () => {
    assertOutput('complex-types');
  });

  it('should throw an error for basic types without default export', () => {
    assertError(
      'no-default-export',
      'No default export found in the entry file',
    );
  });

  it('should throw an error for unsupported function type', () => {
    assertError('unsupported-function', 'Unsupported type: Function');
  });

  it('should throw an error for unsupported date type', () => {
    assertError('unsupported-date', 'Unsupported type: Date');
  });

  it('should throw an error for unsupported regex type', () => {
    assertError('unsupported-regex', 'Unsupported type: RegExp');
  });

  it('should handle object and array spread', () => {
    assertOutput('spread');
  });

  it('should handle binary expressions for basic arithmetic operations', () => {
    assertOutput('arithmetic');
  });

  it('should throw an error for type casting using String(), Number(), and Boolean() by default', () => {
    assertError(
      'type-casting',
      'Type casting using String(), Number(), and Boolean() is only allowed in loose mode',
    );
  });

  it('should handle type casting using String(), Number(), and Boolean() in Loose Mode', () => {
    assertOutput('type-casting', true);
  });

  it('should handle string template literals', () => {
    assertOutput('string-template-literal');
  });

  it('should handle unary prefix expressions', () => {
    assertOutput('unary-prefix');
  });
});
