import { DeepPartial, getObjectKeys } from "../objects";
import { Reducer } from "./types";

/**
 * The function is primarily to cut down on deep object spreads
 * @param state The current state.
 * @param extension A deep-partial of the state type to extend or override the
 * state.
 * @returns The state.
 */
export const deepReduce = <State>(
  state: State, extension: DeepPartial<State>
): State => {
  if (state === extension
    || typeof extension !== 'object' || extension === null || !state
  ) return extension as State;
  if (Array.isArray(extension) && Array.isArray(state)) {
    return extension.map((item, idx) => {
      const stateItem = state[idx];
      return deepReduce(stateItem, item)
    }) as State;
  }
  return getObjectKeys(extension).reduce((acc, key) => {
    const value = extension[key];
    const existing = state[key];
    if (typeof value !== 'object'
      || value === null
      || typeof existing !== 'object'
      || existing === null
    ) return { ...acc, [key]: value };

    const reduced = deepReduce(existing, value);
    return {
      ...acc,
      [key]: reduced,
    };
  }, { ...state });
}

export const stackReducers = <State, Action>(
  reducers: Reducer<State, Action>[]
): Reducer<State, Action> => (
  state, action
) => reducers.reduce((state, reducer) => reducer(state, action), state);

export const stackDeltas = <State, Action>(
  deltas: (
    (state: State, action: Action) => (DeepPartial<State> | undefined)
  )[]
): Reducer<State, Action> => (
  state, action
) => deltas.reduce((state, delta) => {
  const changes = delta(state, action);
  if (!changes) return state;
  return deepReduce<State>(state, changes);
}, state);
