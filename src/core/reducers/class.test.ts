import { describe, expect, it, vi } from 'vitest';
import { ReducerStack } from './class';
import type { Reducer } from './types';

interface AppState {
  count: number;
  user: {
    name: string;
    role: 'guest' | 'member';
  };
  history: string[];
}

type AppAction =
  | { type: 'INCREMENT'; by: number }
  | { type: 'PROMOTE'; name: string }
  | { type: 'RESET' };

const initialState: AppState = {
  count: 0,
  user: { name: 'Anon', role: 'guest' },
  history: [],
};

describe('ReducerStack', () => {
  describe('static factory methods', () => {
    it('creates an empty pass-through stack when called with no arguments', () => {
      const stack = ReducerStack.create<AppState, AppAction>();
      const result = stack.call(initialState, { type: 'INCREMENT', by: 1 });

      expect(result).toBe(initialState);
    });

    it('initialises a stack that always starts from the given initial state', () => {
      const stack = ReducerStack.initialise<AppState, AppAction>(initialState).delta(
        ({ state, action }) =>
          action.type === 'INCREMENT' ? { count: state.count + action.by } : undefined
      );

      // Even when passed undefined as incoming state, initialise seeds it
      const result = stack.call(undefined as unknown as AppState, {
        type: 'INCREMENT',
        by: 5,
      });

      expect(result).toEqual({
        ...initialState,
        count: 5,
      });
    });

    it('creates a stack from a single factory function', () => {
      const stack = ReducerStack.create<AppState, AppAction>(({ state, action, deepReduce }) => {
        const base = state ?? initialState;
        return action.type === 'PROMOTE'
          ? deepReduce(base, { user: { name: action.name, role: 'member' } })
          : base;
      });

      const result = stack.call(initialState, { type: 'PROMOTE', name: 'Alice' });
      expect(result.user).toEqual({ name: 'Alice', role: 'member' });
    });

    it('creates a stack from an array of factory functions executed in order', () => {
      const stack = ReducerStack.create<number, number>([
        ({ state = 0, action }) => state + action,
        ({ state = 0, action }) => state * action,
      ]);

      // (2 + 3) * 3 = 15
      expect(stack.call(2, 3)).toBe(15);
    });

    it('creates a stack from a { deltas } configuration object', () => {
      const stack = ReducerStack.create<AppState, AppAction>({
        deltas: [
          ({ state, action }) =>
            action.type === 'INCREMENT' ? { count: state.count + action.by } : undefined,
          ({ state, action }) =>
            action.type === 'INCREMENT'
              ? { history: [...state.history, `+${action.by}`] }
              : undefined,
        ],
      });

      const result = stack.call(initialState, { type: 'INCREMENT', by: 4 });
      expect(result.count).toBe(4);
      expect(result.history).toEqual(['+4']);
    });

    it('creates a stack from a { reducers } configuration object', () => {
      const addOne: Reducer<number, void> = (s) => s + 1;
      const double: Reducer<number, void> = (s) => s * 2;

      const stack = ReducerStack.create({ reducers: [addOne, double] });

      // (3 + 1) * 2 = 8
      expect(stack.call(3, undefined)).toBe(8);
    });
  });

  describe('chaining & immutability', () => {
    it('does not mutate earlier stack instances when chaining new steps', () => {
      const baseStack = ReducerStack.create<number, number>().reduce(
        (state, action) => state + action
      );

      const extendedStack = baseStack.reduce((state) => state * 10);

      expect(baseStack.call(1, 2)).toBe(3);
      expect(extendedStack.call(1, 2)).toBe(30);
    });

    it('passes the step index (idx) to both .reduce() and .delta() handlers', () => {
      const reduceIndices: (number | undefined)[] = [];
      const deltaIndices: (number | undefined)[] = [];

      const stack = ReducerStack.create<{ steps: number }, void>()
        .reduce((state, _action, idx) => {
          reduceIndices.push(idx);
          return state;
        })
        .delta(({ idx }) => {
          deltaIndices.push(idx);
          return undefined;
        })
        .reduce((state, _action, idx) => {
          reduceIndices.push(idx);
          return state;
        });

      stack.call({ steps: 0 }, undefined);

      expect(reduceIndices).toEqual([0, 2]);
      expect(deltaIndices).toEqual([1]);
    });
  });

  describe('step methods (.delta, .enrich, .create)', () => {
    it('.delta() skips deepReduce and preserves state reference when returning undefined', () => {
      const spyDelta = vi.fn(() => undefined);
      const stack = ReducerStack.create<AppState, AppAction>().delta(spyDelta);

      const result = stack.call(initialState, { type: 'RESET' });

      expect(spyDelta).toHaveBeenCalledWith({
        state: initialState,
        action: { type: 'RESET' },
        idx: 0,
      });
      expect(result).toBe(initialState);
    });

    it('.delta() deeply merges partial updates into state', () => {
      const stack = ReducerStack.create<AppState, AppAction>().delta(({ action }) =>
        action.type === 'PROMOTE' ? { user: { role: 'member' } } : undefined
      );

      const result = stack.call(initialState, { type: 'PROMOTE', name: 'Bob' });

      expect(result.user).toEqual({ name: 'Anon', role: 'member' });
      expect(result).not.toBe(initialState);
    });

    it('.enrich() transforms state using object-destructured { state, action }', () => {
      const stack = ReducerStack.create<AppState, AppAction>().enrich(({ state, action }) => ({
        ...state,
        history: [...state.history, action.type],
      }));

      const result = stack.call(initialState, { type: 'RESET' });
      expect(result.history).toEqual(['RESET']);
    });

    it('.create() injects deepReduce helper into the callback', () => {
      const stack = ReducerStack.create<AppState, AppAction>().create(
        ({ state, action, deepReduce }) => {
          if (!state || action.type !== 'PROMOTE') return state!;
          return deepReduce(state, { user: { name: action.name } });
        }
      );

      const result = stack.call(initialState, { type: 'PROMOTE', name: 'Charlie' });
      expect(result.user).toEqual({ name: 'Charlie', role: 'guest' });
    });
  });
});
