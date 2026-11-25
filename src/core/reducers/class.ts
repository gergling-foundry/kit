import { Delta, Reducer } from "./types";
import { deepReduce } from "./utilities";

type StackDelta<State, Action> = Delta<State, Action, { idx?: number; }>;

type ReducerStackCreateParams<State, Action> = {
  action: Action;
  deepReduce: typeof deepReduce<State>;
  state: State | undefined;
};

type ReducerStackFactory<State, Action> = ((
  params: ReducerStackCreateParams<State, Action>
) => State);

type ReducerStackParams<State, Action> = (
  | ReducerStackFactory<State, Action>
  | (ReducerStackFactory<State, Action>[])
  | ({
    deltas: StackDelta<State, Action>[];
  } | {
    reducers: Reducer<State, Action>[];
  })
);

export class ReducerStack<
  State, Action
> extends Function {
  static create<
    State, Action
  >(params?: ReducerStackParams<State, Action>) {
    if (typeof params === 'function') return new ReducerStack<State, Action>(
      []
    ).create(params);
    if (Array.isArray(params)) return params.reduce(
      (stacker, factory) => stacker.create(factory),
      new ReducerStack<State, Action>([])
    );
    if (params === undefined) return new ReducerStack<State, Action>([]);
    if ('deltas' in params) return params.deltas.reduce(
      (stacker, delta) => stacker.delta(delta),
      new ReducerStack<State, Action>([])
    );
    return new ReducerStack(params.reducers);
  }
  static initialise<State, Action>(
    initialState: State
  ) { return ReducerStack.create<State, Action>(() => initialState); }
  constructor(private reducers: Reducer<State, Action>[]) { super(); }
  call(state: State, action: Action) {
    return this.reducers.reduce(
      (state, reducer, idx) => reducer(state, action, idx),
      state
    );
  }
  create(factory: ReducerStackFactory<State, Action>) {
    return this.reduce(
      (state, action) => factory({
        action, deepReduce, state
      })
    );
  }
  delta(delta: StackDelta<State, Action>) {
    return this.reduce((state, action, idx) => {
      const changes = delta({ action, idx, state });
      if (!changes) return state;
      return deepReduce<State>(state, changes);
    });
  }
  enrich(enricher: (params: { state: State, action: Action }) => State) {
    return this.reduce(
      (state: State, action: Action) => enricher({ action, state })
    );
  }
  reduce(reducer: Reducer<State, Action>) {
    return new ReducerStack([...this.reducers, reducer]);
  }
  get toReducer() { return this.call.bind(this); }
}
