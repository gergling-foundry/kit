import { normaliseFilePath, ReducerStack } from "@/core";
import {
  FileHealth,
  fileHealthSchema,
  ParsedCoverageSummary,
  TscDiagnostic
} from "../types";

export type FileHealthMap = Record<string, FileHealth>;
type Action = { filePath: string; } & (
  | ({
    value: TscDiagnostic;
    type: 'tsc-diagnostic';
  })
  | ({
    value: ParsedCoverageSummary['files'][string];
    type: 'coverage';
  })
);

export const reduceFileHealth = ReducerStack.create<
  FileHealth, Action
>({
  deltas: [
    ({ action, state }) => fileHealthSchema.parse({
      ...state,
      filePath: action.filePath,
    }),
    ({ state, action }) => {
      switch (action.type) {
        case 'coverage': return { coverage: action.value };
        case 'tsc-diagnostic': if (action.value.severity === 'error') return {
          tscErrors: [...state.tscErrors, action.value],
        };
      }
    }
  ],
});

export const reduceFileHealthReport = ReducerStack.delta<FileHealthMap, Action>(
  ({ action, state }) => ({
    [action.filePath]: reduceFileHealth.toReducer(state[action.filePath], action)
  })
);

export const reduceCoverageMapping = (
  state: Record<string, FileHealth>,
  coverageSummary: ParsedCoverageSummary
) => Object.entries(coverageSummary.files).reduce(
  (state, [filePath, value]) => reduceFileHealthReport.toReducer(
    state, { filePath, type: 'coverage', value }
  ), state
);
export const reduceTscMapping = (
  state: Record<string, FileHealth>, values: TscDiagnostic[]
) => values.reduce(
  (state, value) => reduceFileHealthReport.toReducer(
    state, { filePath: value.filePath, type: 'tsc-diagnostic', value }
  ), state
);
