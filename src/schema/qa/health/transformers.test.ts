import { describe, expect, it } from 'vitest';
import { transformFileHealthMap } from './transformers';
import type {
  FileCoverageEntry,
  ParsedCoverageSummary,
  TscDiagnostic,
} from '../types';

describe('transformFileHealthMap', () => {
  const createCoverageEntry = (pct = 80): FileCoverageEntry => ({
    lines: { total: 10, covered: 8, skipped: 0, pct },
    statements: { total: 10, covered: 8, skipped: 0, pct },
    functions: { total: 2, covered: 2, skipped: 0, pct: 100 },
    branches: { total: 4, covered: 3, skipped: 0, pct },
  });

  const createDiagnostic = (
    overrides: Partial<TscDiagnostic> = {}
  ): TscDiagnostic => ({
    filePath: 'src/index.ts',
    line: 10,
    column: 5,
    severity: 'error',
    code: 'TS2322',
    message: "Type 'string' is not assignable to type 'number'.",
    ...overrides,
  });

  it('returns an empty map when there are no diagnostics and no coverage files', () => {
    const result = transformFileHealthMap({
      coverageSummary: { total: null, files: {} },
      tscDiagnostics: [],
    });

    expect(result).toEqual({});
  });

  it('correlates tsc diagnostics and coverage entries under normalized repo paths', () => {
    const sharedCoverage = createCoverageEntry(75);
    const coverageOnly = createCoverageEntry(95);

    const coverageSummary: ParsedCoverageSummary = {
      total: createCoverageEntry(85),
      files: {
        'src/shared.ts': sharedCoverage,
        'src/covered-only.ts': coverageOnly,
      },
    };

    const tscDiagnostics: TscDiagnostic[] = [
      createDiagnostic({ filePath: 'src/shared.ts', line: 12 }),
      createDiagnostic({
        filePath: 'src/shared.ts',
        line: 18,
        severity: 'warning',
        code: 'TS6133',
        message: 'Unused variable',
      }),
      createDiagnostic({ filePath: 'src/errors-only.ts', line: 4 }),
    ];

    const result = transformFileHealthMap({
      coverageSummary,
      tscDiagnostics,
    });

    expect(Object.keys(result).sort()).toEqual([
      'src/covered-only.ts',
      'src/errors-only.ts',
      'src/shared.ts',
    ]);

    // File with both coverage and diagnostics (warnings excluded)
    expect(result['src/shared.ts']).toEqual({
      filePath: 'src/shared.ts',
      coverage: sharedCoverage,
      extraMetrics: {},
      tscErrors: [
        createDiagnostic({ filePath: 'src/shared.ts', line: 12 }),
      ],
    });

    // File with coverage only
    expect(result['src/covered-only.ts']).toEqual({
      filePath: 'src/covered-only.ts',
      coverage: coverageOnly,
      extraMetrics: {},
      tscErrors: [],
    });

    // File with tsc errors only (coverage remains null)
    expect(result['src/errors-only.ts']).toEqual({
      filePath: 'src/errors-only.ts',
      coverage: null,
      extraMetrics: {},
      tscErrors: [
        createDiagnostic({ filePath: 'src/errors-only.ts', line: 4 }),
      ],
    });
  });

  it('accumulates multiple tsc errors for the same file in order', () => {
    const firstError = createDiagnostic({
      filePath: 'src/multi.ts',
      line: 1,
      code: 'TS2304',
    });
    const secondError = createDiagnostic({
      filePath: 'src/multi.ts',
      line: 25,
      code: 'TS2322',
    });

    const result = transformFileHealthMap({
      coverageSummary: { total: null, files: {} },
      tscDiagnostics: [firstError, secondError],
    });

    expect(result['src/multi.ts'].tscErrors).toEqual([
      firstError,
      secondError,
    ]);
  });
});
