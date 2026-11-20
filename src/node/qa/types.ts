import { Delta, Reducer } from "../../core";
import { ActionableTask, PackTaskContextOptions } from "../../schema";

export type ContextState = {
  includedFiles: string[];
  sections: string[];
  truncatedFiles: string[];
  usedChars: number;
};

type ContextReducerAction = (
  & Pick<ContextState, 'usedChars'>
  & Required<Pick<PackTaskContextOptions, 'maxTotalChars'>>
  & {
    includedFile: string;
    section: string;
  }
);

export type ContextReducer = Reducer<
  ContextState,
  ContextReducerAction
>;

export type ContextBaseAction = (
  & ContextReducerAction
  & Required<Pick<PackTaskContextOptions, 'includeLocalImports'>>
  & {
    delta: ContextReducer;
    includeExistingTest: boolean;
    rootDir: string;
    targetAbs: string;
    targetContent: string;
    targetOutputPath: string;
    task: ActionableTask;
  }
);
