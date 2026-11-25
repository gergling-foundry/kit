import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  reduceObject,
  deepReduce,
  stackReducers,
  stackDeltas,
  stackReducersAsync,
} from './utilities';
import type { Reducer, AsyncReducer } from './types';

describe('reducer utilities', () => {
  describe('reduceObject', () => {
    it('reduces an array into a typed object with an empty default initial value', () => {
      const items = [
        { id: 'a', val: 1 },
        { id: 'b', val: 2 },
      ];

      const result = reduceObject<
        { id: string; val: number },
        Record<string, number>
      >(items, (acc, item) => ({
        ...acc,
        [item.id]: item.val,
      }));

      expect(result).toEqual({ a: 1, b: 2 });
      expectTypeOf(result).toEqualTypeOf<Record<string, number>>();
    });

    it('uses the provided initial state object when passed', () => {
      const items = ['x', 'y'];
      const initial: Record<string, boolean> = { existing: true };

      const result = reduceObject(
        items,
        (acc, key) => ({ ...acc, [key]: false }),
        initial
      );

      expect(result).toEqual({ existing: true, x: false, y: false });
    });
  });

  describe('deepReduce', () => {
    interface TestState {
      user: {
        name: string;
        prefs: {
          theme: 'light' | 'dark';
          notifications: boolean;
        };
      };
      tags: string[];
      nestedItems: { id: number; active: boolean }[];
      count: number;
      nullableObj: { a: number } | null;
    }

    const baseState: TestState = {
      user: {
        name: 'Alice',
        prefs: {
          theme: 'light',
          notifications: true,
        },
      },
      tags: ['admin', 'editor'],
      nestedItems: [
        { id: 1, active: true },
        { id: 2, active: false },
      ],
      count: 10,
      nullableObj: { a: 1 },
    };

    it('merges deeply nested properties without mutating the original state', () => {
      const nextState = deepReduce(baseState, {
        user: {
          prefs: {
            theme: 'dark',
          },
        },
      });

      expect(nextState.user.prefs).toEqual({
        theme: 'dark',
        notifications: true,
      });
      expect(nextState.user.name).toBe('Alice');
      // Immutability checks
      expect(nextState).not.toBe(baseState);
      expect(nextState.user).not.toBe(baseState.user);
      expect(baseState.user.prefs.theme).toBe('light');
    });

    it('handles falsy values (0, false, empty string, null) accurately', () => {
      const nextState = deepReduce(baseState, {
        count: 0,
        user: {
          name: '',
          prefs: {
            notifications: false,
          },
        },
        nullableObj: null,
      });

      expect(nextState.count).toBe(0);
      expect(nextState.user.name).toBe('');
      expect(nextState.user.prefs.notifications).toBe(false);
      expect(nextState.nullableObj).toBeNull();
    });

    it('overwrites a null property with an object', () => {
      const stateWithNull: TestState = { ...baseState, nullableObj: null };
      const nextState = deepReduce(stateWithNull, {
        nullableObj: { a: 42 },
      });

      expect(nextState.nullableObj).toEqual({ a: 42 });
    });

    it('deep reduces arrays by matching indices', () => {
      const nextState = deepReduce(baseState, {
        nestedItems: [{ active: false }, { id: 99 }],
      });

      expect(nextState.nestedItems).toEqual([
        { id: 1, active: false },
        { id: 99, active: false },
      ]);
    });

    it('returns extension directly if state and extension are identical references or primitives', () => {
      expect(deepReduce(baseState, baseState)).toBe(baseState);
      expect(deepReduce<number>(5, 10)).toBe(10);
      expect(deepReduce({ a: 1 }, null as unknown as { a: number })).toBeNull();
    });
  });

  describe('stackReducers', () => {
    it('executes reducers in sequence and passes the index to each', () => {
      type Action = { type: 'INC'; amount: number };
      const r1: Reducer<number[], Action> = (state, action, idx) => [
        ...state,
        action.amount + (idx ?? 0),
      ];
      const r2: Reducer<number[], Action> = (state, action, idx) => [
        ...state,
        action.amount * 10 + (idx ?? 0),
      ];

      const combined = stackReducers([r1, r2]);
      const result = combined([], { type: 'INC', amount: 5 });

      expect(result).toEqual([5, 51]);
    });

    it('returns the original state when given an empty reducer array', () => {
      const combined = stackReducers<number, string>([]);
      expect(combined(42, 'NOOP')).toBe(42);
    });
  });

  describe('stackDeltas', () => {
    interface CounterState {
      count: number;
      meta: { updated: boolean; lastBy: string };
    }

    it('applies partial state changes sequentially via deepReduce', () => {
      const initial: CounterState = {
        count: 0,
        meta: { updated: false, lastBy: 'system' },
      };

      const incrementDelta = (state: CounterState, action: string) =>
        action === 'ADD' ? { count: state.count + 1 } : undefined;

      const metaDelta = (_state: CounterState, action: string) =>
        action === 'ADD' ? { meta: { updated: true } } : undefined;

      const reducer = stackDeltas([incrementDelta, metaDelta]);
      const next = reducer(initial, 'ADD');

      expect(next).toEqual({
        count: 1,
        meta: { updated: true, lastBy: 'system' },
      });
    });

    it('skips deepReduce and preserves state reference when deltas return undefined', () => {
      const initial: CounterState = {
        count: 5,
        meta: { updated: false, lastBy: 'system' },
      };

      const noopDelta = () => undefined;
      const reducer = stackDeltas([noopDelta]);
      const next = reducer(initial, 'IGNORE');

      expect(next).toBe(initial);
    });
  });

  describe('stackReducersAsync', () => {
    it('executes async reducers sequentially, passing resolved state to the next', async () => {
      const order: string[] = [];

      const asyncAdd: AsyncReducer<number, number> = async (state, action) => {
        await new Promise((r) => setTimeout(r, 15));
        order.push('add');
        return state + action;
      };

      const asyncMultiply: AsyncReducer<number, number> = async (
        state,
        action
      ) => {
        await new Promise((r) => setTimeout(r, 5));
        order.push('multiply');
        return state * action;
      };

      const combined = stackReducersAsync([asyncAdd, asyncMultiply]);
      // (2 + 3) * 3 = 15
      const result = await combined(2, 3);

      expect(result).toBe(15);
      expect(order).toEqual(['add', 'multiply']);
    });

    it('resolves immediately with initial state if given an empty array', async () => {
      const combined = stackReducersAsync<{ ok: boolean }, void>([]);
      const initial = { ok: true };

      const result = await combined(initial);
      expect(result).toBe(initial);
    });

    it('propagates errors if any async reducer rejects', async () => {
      const failingReducer: AsyncReducer<number, void> = vi
        .fn()
        .mockRejectedValue(new Error('Async failure'));
      const neverCalled: AsyncReducer<number, void> = vi.fn();

      const combined = stackReducersAsync([failingReducer, neverCalled]);

      await expect(combined(1)).rejects.toThrow('Async failure');
      expect(neverCalled).not.toHaveBeenCalled();
    });
  });
});
