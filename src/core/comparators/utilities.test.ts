import { describe, it, expect } from 'vitest';
import { compareUndefinedAsc, compareAlphabeticalAsc } from './utilities';

describe('compareUndefinedAsc', () => {
  it('should return 0 if both are undefined', () => {
    const result = compareUndefinedAsc(undefined, undefined);
    expect(result).toBe(0);
  });

  it('should return -1 if a is undefined and b is not', () => {
    const result = compareUndefinedAsc(undefined, 'test');
    expect(result).toBe(-1);
  });

  it('should return 1 if a is not undefined and b is', () => {
    const result = compareUndefinedAsc('test', undefined);
    expect(result).toBe(1);
  });
});

describe('compareAlphabeticalAsc', () => {
  it('should return 0 if both strings are equal', () => {
    const result = compareAlphabeticalAsc('apple', 'apple');
    expect(result).toBe(0);
  });

  it('should return -1 if a is less than b', () => {
    const result = compareAlphabeticalAsc('apple', 'cherry');
    expect(result).toBe(-1);
  });

  it('should return 1 if a is greater than b', () => {
    const result = compareAlphabeticalAsc('banana', 'apple');
    expect(result).toBe(1);
  });
});
