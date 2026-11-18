import z from "zod";

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