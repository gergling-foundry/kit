import { describe, it, expect } from 'vitest';
import { compareActionableTasks } from './comparators';
import { ActionableTask } from '../types';
import { TscDiagnostic } from '../types/tsc';

const makeDiagnostic = (index: number): TscDiagnostic => ({
  filePath: 'src/example.ts',
  line: index + 1,
  column: 1,
  severity: 'error',
  code: 'TS2322',
  message: `Type error ${index + 1}`,
});

const makeFixTypesTask = (
  diagnosticCount: number,
  filePath = 'src/fix-types.ts',
): ActionableTask => ({
  kind: 'fix-types',
  priority: 1,
  filePath,
  reason: 'Has type errors',
  diagnostics: Array.from({ length: diagnosticCount }, (_, i) => makeDiagnostic(i)),
});

const makeImproveCoverageTask = (
  branchPct: number,
  linePct = 80,
  filePath = 'src/improve-coverage.ts',
): ActionableTask => ({
  kind: 'improve-coverage',
  priority: 2,
  filePath,
  reason: 'Low branch coverage',
  branchPct,
  linePct,
});

describe('compareActionableTasks', () => {
  it('prioritises tasks with lower priority number (ASC)', () => {
    const fixTypes = makeFixTypesTask(1);
    const improveCoverage = makeImproveCoverageTask(10);

    expect(compareActionableTasks.run(fixTypes, improveCoverage)).toBeLessThan(0);
    expect(compareActionableTasks.run(improveCoverage, fixTypes)).toBeGreaterThan(0);
  });

  describe('fix-types tasks (equal priority)', () => {
    it('prioritises tasks with more diagnostics (DESC)', () => {
      const moreErrors = makeFixTypesTask(5, 'src/a.ts');
      const fewerErrors = makeFixTypesTask(2, 'src/b.ts');

      expect(compareActionableTasks.run(moreErrors, fewerErrors)).toBeLessThan(0);
      expect(compareActionableTasks.run(fewerErrors, moreErrors)).toBeGreaterThan(0);
    });

    it('returns 0 when diagnostic counts are equal', () => {
      const taskA = makeFixTypesTask(3, 'src/a.ts');
      const taskB = makeFixTypesTask(3, 'src/b.ts');

      expect(compareActionableTasks.run(taskA, taskB)).toBe(0);
    });
  });

  describe('improve-coverage tasks (equal priority)', () => {
    it('prioritises tasks with lower branch coverage percentage (ASC)', () => {
      const lowerBranch = makeImproveCoverageTask(25, 90, 'src/a.ts');
      const higherBranch = makeImproveCoverageTask(60, 40, 'src/b.ts');

      expect(compareActionableTasks.run(lowerBranch, higherBranch)).toBeLessThan(0);
      expect(compareActionableTasks.run(higherBranch, lowerBranch)).toBeGreaterThan(0);
    });

    it('returns 0 when branch coverage percentages are equal', () => {
      const taskA = makeImproveCoverageTask(50, 40, 'src/a.ts');
      const taskB = makeImproveCoverageTask(50, 90, 'src/b.ts');

      expect(compareActionableTasks.run(taskA, taskB)).toBe(0);
    });
  });

  it('returns 0 when tasks have the same priority but different kinds', () => {
    const fixTypes = makeFixTypesTask(3);
    const mismatchedPriorityCoverage = {
      ...makeImproveCoverageTask(20),
      priority: 1,
    } as unknown as ActionableTask;

    expect(compareActionableTasks.run(fixTypes, mismatchedPriorityCoverage)).toBe(0);
  });

  it('sorts a mixed list of actionable tasks by priority then kind-specific metric', () => {
    const covHigh = makeImproveCoverageTask(75, 80, 'cov-75.ts');
    const covLow = makeImproveCoverageTask(20, 80, 'cov-20.ts');
    const fixFew = makeFixTypesTask(1, 'fix-1.ts');
    const fixMany = makeFixTypesTask(4, 'fix-4.ts');

    const sorted = compareActionableTasks.sort([covHigh, fixFew, covLow, fixMany]);

    expect(sorted.map((t) => t.filePath)).toEqual([
      'fix-4.ts',
      'fix-1.ts',
      'cov-20.ts',
      'cov-75.ts',
    ]);
  });
});
