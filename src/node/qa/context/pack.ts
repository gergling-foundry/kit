import { stackReducersAsync } from "@/core";
import {
  ActionableTask,
  PackedContextResult,
  PackTaskContextOptions
} from "@/schema";
import { ContextBaseAction, ContextState } from "../types";
import { reduceContextTask } from "./task";
import { reduceContextForCoverage } from "./coverage";
import { reduceContextForLocalImports } from "./import";
import { resolve } from "node:path";
import { readTarget } from "../utilities";
import { contextReducer } from "./utilities";

const reduceContext = stackReducersAsync<ContextState, ContextBaseAction>([
  async (state, action) => reduceContextTask(state, action),
  reduceContextForCoverage,
  reduceContextForLocalImports,
]);

export async function packTaskContext(
  task: ActionableTask,
  options: PackTaskContextOptions = {}
): Promise<PackedContextResult> {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const maxTotalChars = options.maxTotalChars ?? 24_000;
  const includeExistingTest = options.includeExistingTest ?? true;
  const includeLocalImports = options.includeLocalImports ?? true;

  const {
    targetAbs, targetContent, targetOutputPath
  } = await readTarget({ rootDir, task });

  const {
    includedFiles, sections, truncatedFiles, usedChars
  } = await reduceContext({
    includedFiles: [task.filePath],
    sections: [],
    truncatedFiles: [],
    usedChars: targetContent.length,
  }, {
    delta: contextReducer,
    includedFile: '',
    includeExistingTest,
    includeLocalImports,
    maxTotalChars,
    rootDir,
    section: '',
    targetAbs,
    targetContent,
    targetOutputPath,
    task,
    usedChars: 0,
  });

  return {
    task,
    targetOutputPath,
    includedFiles,
    truncatedFiles,
    totalChars: usedChars,
    promptXml: sections.join('\n\n'),
  };
}
