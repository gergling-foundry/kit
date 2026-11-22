import { ComparatorFactory } from '@/core';
import {
  ActionableTask,
  BuildHealthOptions,
  FileHealth,
  ParsedCoverageSummary,
  TscDiagnostic
} from '../types'
import { normalizeRepoPath } from './tsc';

const compareActionableTasks = ComparatorFactory.instantiate<ActionableTask>([
  (a, b) => a.priority - b.priority,
  (a, b) => {
    // if (a.kind === b.kind) {
    //   switch (a.kind) {
    //     case 'fix-types': return b.diagnostics.length - a.diagnostics.length;
    //   }
    // }
    if (a.kind === 'fix-types' && b.kind === 'fix-types') {
      return b.diagnostics.length - a.diagnostics.length;
    }
    if (a.kind === 'improve-coverage' && b.kind === 'improve-coverage') {
      return a.branchPct - b.branchPct;
    }
    return 0;
  },
]);

const DEFAULT_IGNORES = [/\/index\.ts$/];
const DEFAULT_TEST_PATTERNS = [/\.test\.ts$/, /\.spec\.ts$/];

/**
 * Merges tsc diagnostics and coverage summaries into per-file health records
 * and returns a priority-ordered queue of single-file AI tasks.
 */
export function buildHealthQueue(
  tscDiagnostics: TscDiagnostic[],
  coverageSummary: ParsedCoverageSummary,
  options: BuildHealthOptions = {}
): { files: FileHealth[]; tasks: ActionableTask[] } {
  const minBranchCoverage = options.minBranchCoverage ?? 80;
  const testPatterns = options.testPatterns ?? DEFAULT_TEST_PATTERNS;
  const ignorePatterns = options.ignorePatterns ?? DEFAULT_IGNORES;

  const fileMap = new Map<string, FileHealth>();

  const getOrCreate = (rawPath: string): FileHealth => {
    const filePath = normalizeRepoPath(rawPath);
    let record = fileMap.get(filePath);
    if (!record) {
      record = {
        filePath,
        tscErrors: [],
        coverage: null,
        extraMetrics: {},
      };
      fileMap.set(filePath, record);
    }
    return record;
  };

  for (const diag of tscDiagnostics) {
    if (diag.severity === 'error') {
      getOrCreate(diag.filePath).tscErrors.push(diag);
    }
  }

  for (const [filePath, cov] of Object.entries(coverageSummary.files)) {
    getOrCreate(filePath).coverage = cov;
  }

  const files = Array.from(fileMap.values()).sort((a, b) =>
    a.filePath.localeCompare(b.filePath)
  );

  const tasks = files.reduce((tasks, file): ActionableTask[] => {
    if (
      ignorePatterns.some((pattern) => pattern.test(file.filePath))
    ) return tasks;

    // Gate 1: Type errors block test generation for this file
    if (file.tscErrors.length > 0) return [
      ...tasks, {
        kind: 'fix-types',
        priority: 1,
        filePath: file.filePath,
        reason: `${file.tscErrors.length} TypeScript error(s) must be resolved before testing.`,
        diagnostics: file.tscErrors,
      }
    ];

    if (testPatterns.some((pattern) => pattern.test(file.filePath))) return tasks;

    // Gate 2: Only suggest coverage improvements if the file compiles cleanly
    if (file.coverage && file.coverage.branches.pct < minBranchCoverage) return [
      ...tasks, {
        kind: 'improve-coverage',
        priority: 2,
        filePath: file.filePath,
        reason: `Branch coverage is ${file.coverage.branches.pct}% (target: ${minBranchCoverage}%).`,
        branchPct: file.coverage.branches.pct,
        linePct: file.coverage.lines.pct,
      }
    ];

    return tasks;
  }, []).sort(compareActionableTasks.run);

  // This should be reduced.
  // const tasks: ActionableTask[] = [];

  // for (const file of files) {
  //   if (ignorePatterns.some((pattern) => pattern.test(file.filePath))) {
  //     continue;
  //   }

  //   // Gate 1: Type errors block test generation for this file
  //   if (file.tscErrors.length > 0) {
  //     tasks.push({
  //       kind: 'fix-types',
  //       priority: 1,
  //       filePath: file.filePath,
  //       reason: `${file.tscErrors.length} TypeScript error(s) must be resolved before testing.`,
  //       diagnostics: file.tscErrors,
  //     });
  //     continue;
  //   }

  //   if (testPatterns.some((pattern) => pattern.test(file.filePath))) {
  //     continue;
  //   }

  //   // Gate 2: Only suggest coverage improvements if the file compiles cleanly
  //   if (file.coverage && file.coverage.branches.pct < minBranchCoverage) {
  //     tasks.push({
  //       kind: 'improve-coverage',
  //       priority: 2,
  //       filePath: file.filePath,
  //       reason: `Branch coverage is ${file.coverage.branches.pct}% (target: ${minBranchCoverage}%).`,
  //       branchPct: file.coverage.branches.pct,
  //       linePct: file.coverage.lines.pct,
  //     });
  //   }
  // }

  // // Sort by priority first, then worst coverage / most errors
  // tasks.sort(compareActionableTasks.run);
  // tasks.sort((a, b) => {
  //   if (a.priority !== b.priority) return a.priority - b.priority;
  //   if (a.kind === 'fix-types' && b.kind === 'fix-types') {
  //     return b.diagnostics.length - a.diagnostics.length;
  //   }
  //   if (a.kind === 'improve-coverage' && b.kind === 'improve-coverage') {
  //     return a.branchPct - b.branchPct;
  //   }
  //   return 0;
  // });

  return { files, tasks };
}
