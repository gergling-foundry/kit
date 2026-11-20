import { AsyncReducer } from "@/core";
import { ContextBaseAction, ContextState } from "../types";
import { assertWithinRoot, fileExists, readFileAsync } from "@/node/file";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

type R = AsyncReducer<ContextState, Pick<
  ContextBaseAction,
  | 'delta'
  | 'includeExistingTest'
  | 'maxTotalChars'
  | 'rootDir'
  | 'targetOutputPath'
  | 'task'
>>;

export const reduceContextForCoverage: R = async (
  state, {
    delta, includeExistingTest, maxTotalChars, rootDir, targetOutputPath, task
  }
) => {
  if (includeExistingTest && task.kind === 'improve-coverage') {
    const testAbs = assertWithinRoot(rootDir, resolve(rootDir, targetOutputPath));
    if (await fileExists(testAbs)) {
      const testContent = await readFileAsync(testAbs);
      return delta(state, {
        includedFile: targetOutputPath,
        maxTotalChars,
        section: `<existing_test path="${targetOutputPath}">\n${testContent}\n</existing_test>`,
        usedChars: testContent.length,
      });
    }
  }
  return state;
};
