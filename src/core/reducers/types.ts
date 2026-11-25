import { DeepPartial } from "../objects";

export type Reducer<State, Action> = (
  state: State, action: Action, idx?: number
) => State;

export type AsyncReducer<State, Action> = (
  state: State, action: Action
) => Promise<State>;

export type Delta<State, Action, Params extends object = object> = (
  params: { state: State, action: Action } & Params
) => DeepPartial<State> | undefined;
