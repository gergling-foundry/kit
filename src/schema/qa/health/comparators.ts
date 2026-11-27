import { ComparatorFactory } from "@/core";
import { ActionableTask } from "../types";

export const compareActionableTasks = ComparatorFactory.instantiate<ActionableTask>([
  // ASC: Priority. Tasks are provided with a hard-coded priority type.
  (a, b) => a.priority - b.priority,
  (a, b) => {
    // DESC: Total type errors, in which more type errors are prioritised.
    if (a.kind === 'fix-types' && b.kind === 'fix-types') {
      return b.diagnostics.length - a.diagnostics.length;
    }
    // ASC: Lower coverage branch %age is prioritised.
    if (a.kind === 'improve-coverage' && b.kind === 'improve-coverage') {
      return a.branchPct - b.branchPct;
    }
    return 0;
  },
]);
