import { describe, expect, it } from 'vitest';

import { compile } from '../src/compiler';
import { assertMacroError, assertMacroOutput } from './test-utils';

describe('Macro Test', () => {
  it('should handle type casting using String(), Number(), and Boolean() in Macro Mode', () => {
    assertMacroOutput('type-casting');
  });

  it('should handle arrayMap macro for mapping arrays', () => {
    assertMacroOutput('array-map');
  });

  it('should throw error when arrayMap callback is a function expression', () => {
    assertMacroError(
      'invalid-array-map-callback',
      'arrayMap: callback must be an arrow function',
    );
  });

  it('should throw error when type casting functions are not imported from @conf-ts/macro', () => {
    expect(() => {
      compile('tests/macros/invalid-imports.conf.ts', 'json', true);
    }).toThrow(
      "Type casting function 'String' must be imported from '@conf-ts/macro' to use in macro mode",
    );
  });

  it('should throw error when only some type casting functions are imported', () => {
    expect(() => {
      compile('tests/macros/partial-imports.conf.ts', 'json', true);
    }).toThrow(
      "Type casting function 'Boolean' must be imported from '@conf-ts/macro' to use in macro mode",
    );
  });

  it('should handle ternary operator in macro mode', () => {
    assertMacroOutput('ternary');
  });
});
