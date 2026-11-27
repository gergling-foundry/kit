import { describe, expect, it } from 'vitest';
import type {
  FileHealth,
  ParsedCoverageSummary,
  TscDiagnostic,
} from '../types';
import {
  reduceFileHealth,
  reduceFileHealthReport,
  reduceCoverageMapping,
  reduceTscMapping,
} from './reducers';

describe('file health reducers', () => {
  // Adjust these fixtures if TscDiagnosticSchema or FileCoverageEntrySchema require additional fields
  const mockError: TscDiagnostic = {
    filePath: 'src/index.ts',
    line: 10,
    column: 5,
    code: 'TS2322',
    severity: 'error',
    message: "Type 'string' is not assignable to type 'number'.",
  };

  const mockWarning: TscDiagnostic = {
    filePath: 'src/index.ts',
    line: 12,
    column: 7,
    code: 'TS6133',
    severity: 'warning',
    message: "'unused' is declared but its value is never read.",
  };

  const mockCoverageEntry: ParsedCoverageSummary['files'][string] = {
    lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
    statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
    functions: { total: 2, covered: 2, skipped: 0, pct: 100 },
    branches: { total: 4, covered: 3, skipped: 0, pct: 75 },
  };

  describe('reduceFileHealth', () => {
    it('hydrates schema defaults and filePath when given an undefined state', () => {
      const result = reduceFileHealth.call(undefined as unknown as FileHealth, {
        type: 'tsc-diagnostic',
        filePath: 'src/app.ts',
        value: { ...mockWarning, filePath: 'src/app.ts' },
      });

      expect(result).toEqual({
        filePath: 'src/app.ts',
        coverage: null,
        extraMetrics: {},
        tscErrors: [],
      });
    });

    it('updates coverage and filePath on a coverage action', () => {
      const result = reduceFileHealth.call({} as FileHealth, {
        type: 'coverage',
        filePath: 'src/utils.ts',
        value: mockCoverageEntry,
      });

      expect(result).toEqual({
        filePath: 'src/utils.ts',
        coverage: mockCoverageEntry,
        extraMetrics: {},
        tscErrors: [],
      });
    });

    it('appends tsc diagnostics with severity "error" and ignores warnings', () => {
      const first = reduceFileHealth.call({} as FileHealth, {
        type: 'tsc-diagnostic',
        filePath: 'src/index.ts',
        value: mockError,
      });

      const afterWarning = reduceFileHealth.call(first, {
        type: 'tsc-diagnostic',
        filePath: 'src/index.ts',
        value: mockWarning,
      });

      const secondError: TscDiagnostic = {
        ...mockError,
        line: 20,
        code: 'TS2304',
        message: "Cannot find name 'foo'.",
      };

      const afterSecondError = reduceFileHealth.call(afterWarning, {
        type: 'tsc-diagnostic',
        filePath: 'src/index.ts',
        value: secondError,
      });

      expect(afterSecondError.tscErrors).toEqual([mockError, secondError]);
      expect(first.tscErrors).toHaveLength(1);
    });
  });

  describe('reduceFileHealthReport', () => {
    it('creates and updates entries keyed by filePath in the report map', () => {
      const state1 = reduceFileHealthReport.call(
        {},
        {
          type: 'coverage',
          filePath: 'src/a.ts',
          value: mockCoverageEntry,
        }
      );

      const state2 = reduceFileHealthReport.call(state1, {
        type: 'tsc-diagnostic',
        filePath: 'src/b.ts',
        value: { ...mockError, filePath: 'src/b.ts' },
      });

      expect(Object.keys(state2)).toEqual(['src/a.ts', 'src/b.ts']);
      expect(state2['src/a.ts'].coverage).toEqual(mockCoverageEntry);
      expect(state2['src/b.ts'].tscErrors).toHaveLength(1);
    });
  });

  describe('reduceCoverageMapping', () => {
    it('merges coverage for every file', () => {
      const summary: ParsedCoverageSummary = {
        total: mockCoverageEntry,
        files: {
          'src/file1.ts': mockCoverageEntry,
          'src/file2.ts': mockCoverageEntry,
        },
      };

      const result = reduceCoverageMapping({}, summary);

      expect(Object.keys(result)).toEqual([
        'src/file1.ts',
        'src/file2.ts',
      ]);
      expect(result['src/file1.ts']).toEqual({
        filePath: 'src/file1.ts',
        coverage: mockCoverageEntry,
        extraMetrics: {},
        tscErrors: [],
      });
    });
  });

  describe('reduceTscMapping', () => {
    it('normalizes diagnostic filePaths and correlates errors with existing coverage entries', () => {
      const initialReport = reduceCoverageMapping(
        {},
        {
          total: mockCoverageEntry,
          files: {
            'src/shared.ts': mockCoverageEntry,
          },
        }
      );

      const diagnostics: TscDiagnostic[] = [
        { ...mockError, filePath: 'src/shared.ts' },
        { ...mockWarning, filePath: 'src/shared.ts' },
        { ...mockError, filePath: 'src/only-errors.ts' },
      ];

      const result = reduceTscMapping(initialReport, diagnostics);

      expect(result['src/shared.ts']).toEqual({
        filePath: 'src/shared.ts',
        coverage: mockCoverageEntry,
        extraMetrics: {},
        tscErrors: [{ ...mockError, filePath: 'src/shared.ts' }],
      });

      expect(result['src/only-errors.ts']).toEqual({
        filePath: 'src/only-errors.ts',
        coverage: null,
        extraMetrics: {},
        tscErrors: [{ ...mockError, filePath: 'src/only-errors.ts' }],
      });
    });
  });
});
