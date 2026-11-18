import { DeepPartial } from "../objects";

export type Reducer<State, Action, Async extends boolean = false> = (
  state: State, action: Action
) => State;
export type AsyncReducer<State, Action> = Reducer<
  State, Action, true
>;

export type Delta<State, Action, Async extends boolean = false> = (
  params: { state: State, action: Action }
) => DeepPartial<State> | undefined;
