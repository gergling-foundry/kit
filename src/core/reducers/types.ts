import { DeepPartial } from "../objects";

export type Reducer<State, Action, Async extends boolean = false> = (
  state: State, action: Action
) => State;
export type AsyncReducer<State, Action> = (
  state: State, action: Action
) => Promise<State>;

export type Delta<State, Action, Async extends boolean = false> = (
  params: { state: State, action: Action }
) => DeepPartial<State> | undefined;
