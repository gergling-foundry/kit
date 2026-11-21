import { resolve } from "node:path";
import { ActionableTask } from "@/schema";
import {
  assertWithinRoot,
  readFileAsync,
  resolveTargetOutputPath
} from "@/node/file";

export const readTarget = async ({
  rootDir,
  task,
}: {
  rootDir: string;
  task: ActionableTask;
}) => {
  const targetAbs = assertWithinRoot(rootDir, resolve(rootDir, task.filePath));
  const targetContent = await readFileAsync(targetAbs);
  const targetOutputPath = resolveTargetOutputPath(task);
  return { targetAbs, targetContent, targetOutputPath };
};
