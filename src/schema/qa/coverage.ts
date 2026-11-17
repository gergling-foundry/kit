import { z } from 'zod';
import { normalizeRepoPath } from './tsc.js';

export const CoverageMetricSchema = z.object({
  total: z.number().nonnegative(),
  covered: z.number().nonnegative(),
  skipped: z.number().nonnegative(),
  pct: z.union([z.number(), z.literal('Unknown')]).transform((val) =>
    val === 'Unknown' ? 100 : val
  ),
});

export const FileCoverageEntrySchema = z.object({
  lines: CoverageMetricSchema,
  statements: CoverageMetricSchema,
  functions: CoverageMetricSchema,
  branches: CoverageMetricSchema,
});

export const RawCoverageSummarySchema = z.record(
  z.string(),
  FileCoverageEntrySchema
);

export type CoverageMetric = z.infer<typeof CoverageMetricSchema>;
export type FileCoverageEntry = z.infer<typeof FileCoverageEntrySchema>;

export interface ParsedCoverageSummary {
  total: FileCoverageEntry | null;
  files: Record<string, FileCoverageEntry>;
}

/**
 * Validates and normalizes `coverage-summary.json` into a clean map keyed by normalized file path.
 * Optionally strips a root directory prefix (e.g. `process.cwd()`) if Vitest emitted absolute paths.
 */
export function parseCoverageSummary(
  input: unknown,
  rootPrefix?: string
): ParsedCoverageSummary {
  const raw = RawCoverageSummarySchema.parse(input);
  const normalizedPrefix = rootPrefix
    ? `${normalizeRepoPath(rootPrefix).replace(/\/$/, '')}/`
    : undefined;

  let total: FileCoverageEntry | null = null;
  const files: Record<string, FileCoverageEntry> = {};

  for (const [rawKey, entry] of Object.entries(raw)) {
    if (rawKey === 'total') {
      total = entry;
      continue;
    }

    let cleanPath = normalizeRepoPath(rawKey);
    if (normalizedPrefix && cleanPath.startsWith(normalizedPrefix)) {
      cleanPath = cleanPath.slice(normalizedPrefix.length);
    }

    files[cleanPath] = entry;
  }

  return { total, files };
}
