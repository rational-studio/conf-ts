import { describe, expect, it } from 'vitest';

import { arrayMap, Boolean, Number, String } from '../src/runtime';

describe('Runtime Test', () => {
  it('should handle type casting', () => {
    expect(String(123)).toBe('123');
    expect(Number('123')).toBe(123);
    expect(Boolean(1)).toBe(true);
  });

  it('should handle arrayMap', () => {
    expect(arrayMap([1, 2, 3], x => x * 2)).toEqual([2, 4, 6]);
  });
});
