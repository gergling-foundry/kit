import z from "zod";
import { TscDiagnosticSchema } from "./tsc";
import { FileCoverageEntrySchema } from "./coverage";

export const FileHealthSchema = z.object({
  filePath: z.string(),
  tscErrors: z.array(TscDiagnosticSchema),
  coverage: FileCoverageEntrySchema.nullable(),
  /** Placeholder map for future signals (e.g. eslint, knip, complexity) */
  extraMetrics: z.record(z.string(), z.unknown()).default({}),
});

export type FileHealth = z.infer<typeof FileHealthSchema>;

export const ActionableTaskSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fix-types'),
    priority: z.literal(1),
    filePath: z.string(),
    reason: z.string(),
    diagnostics: z.array(TscDiagnosticSchema).min(1),
  }),
  z.object({
    kind: z.literal('improve-coverage'),
    priority: z.literal(2),
    filePath: z.string(),
    reason: z.string(),
    branchPct: z.number(),
    linePct: z.number(),
  }),
]);

export type ActionableTask = z.infer<typeof ActionableTaskSchema>;

export interface BuildHealthOptions {
  /** Minimum acceptable branch coverage percentage before flagging a file (default: 80) */
  minBranchCoverage?: number;
  /** File patterns to ignore (e.g. test files or barrel files) */
  ignorePatterns?: RegExp[];
}
