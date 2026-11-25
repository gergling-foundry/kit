import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  getObjectKeys,
  getObjectEntries,
  getObjectFromEntries,
} from './utilities';

describe('object utilities', () => {
  describe('getObjectKeys', () => {
    it('returns the keys of an object and preserves key types', () => {
      const user = { id: 1, name: 'Alice', isAdmin: false };
      const keys = getObjectKeys(user);

      expect(keys).toEqual(['id', 'name', 'isAdmin']);
      expectTypeOf(keys).toEqualTypeOf<('id' | 'name' | 'isAdmin')[]>();
    });

    it('returns an empty array for an empty object', () => {
      const empty = {};
      const keys = getObjectKeys(empty);

      expect(keys).toEqual([]);
      expectTypeOf(keys).toEqualTypeOf<never[]>();
    });

    it('excludes non-enumerable and symbol properties at runtime', () => {
      const sym = Symbol('secret');
      const obj = { visible: 'yes', [sym]: 'hidden' };
      Object.defineProperty(obj, 'nonEnum', {
        value: 'hidden',
        enumerable: false,
      });

      const keys = getObjectKeys(obj);

      expect(keys).toEqual(['visible']);
    });
  });

  describe('getObjectEntries', () => {
    it('returns key-value pairs and preserves entry types', () => {
      const config = { retries: 3, endpoint: '/api' } as const;
      const entries = getObjectEntries(config);

      expect(entries).toEqual([
        ['retries', 3],
        ['endpoint', '/api'],
      ]);
      expectTypeOf(entries).toEqualTypeOf<
        ['retries' | 'endpoint', 3 | '/api'][]
      >();
    });

    it('returns an empty array for an empty object', () => {
      const entries = getObjectEntries({});

      expect(entries).toEqual([]);
      expectTypeOf(entries).toEqualTypeOf<[never, never][]>();
    });
  });

  describe('getObjectFromEntries', () => {
    it('constructs an object from entries and preserves Record types', () => {
      type Role = 'admin' | 'guest';
      const entries: [Role, number][] = [
        ['admin', 1],
        ['guest', 2],
      ];

      const result = getObjectFromEntries(entries);

      expect(result).toEqual({ admin: 1, guest: 2 });
      expectTypeOf(result).toEqualTypeOf<Record<Role, number>>();
    });

    it('overwrites earlier values when duplicate keys exist', () => {
      const entries: ['a' | 'b', number][] = [
        ['a', 1],
        ['a', 2],
        ['b', 3],
      ];

      const result = getObjectFromEntries(entries);

      expect(result).toEqual({ a: 2, b: 3 });
    });

    it('returns an empty object when given an empty array', () => {
      const entries: [string, boolean][] = [];
      const result = getObjectFromEntries(entries);

      expect(result).toEqual({});
      expectTypeOf(result).toEqualTypeOf<Record<string, boolean>>();
    });
  });
});
