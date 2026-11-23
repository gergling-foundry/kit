import { deepReduce, Reducer } from "@/core";
import { ActionableTask } from "@/schema";
import { ContextBaseAction, ContextState } from "../types";
import { taskInstructions } from "./instructions";

export const reduceContextTask: Reducer<ContextState, ContextBaseAction> = (
  state,
  { targetContent, targetOutputPath, task }: {
    targetContent: string;
    targetOutputPath: string;
    task: ActionableTask;
  }
) => deepReduce(state, {
  sections: [
    `<task kind="${task.kind}" target_file="${task.filePath}" allowed_output_file="${targetOutputPath}">`,
    `  <reason>${task.reason}</reason>`,
    task.kind === 'fix-types'
      ? `  <diagnostics>\n${task.diagnostics
        .map((d) => `    <error line="${d.line}" col="${d.column}" code="${d.code}">${d.message}</error>`)
        .join('\n')}\n  </diagnostics>`
      : `  <coverage branch_pct="${task.branchPct}" line_pct="${task.linePct}" />`,
    `</task>`,
    `<target_source path="${task.filePath}">\n${targetContent}\n</target_source>`,
    taskInstructions({ ...task, targetOutputPath }),
  ]
});
