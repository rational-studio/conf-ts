import path from 'path';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compiler';

describe('Multi-file test', () => {
  it('should handle multiple file edits correctly', () => {
    const configPath = path.resolve(__dirname, 'multi-file');
    const result = compile(path.join(configPath, 'index.ts'), 'json', false);
    expect(JSON.parse(result)).toEqual({
      multiFileValue: 'hello from multi-file',
    });
  });
});
