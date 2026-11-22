import z from "zod";
import { TscDiagnosticSchema } from "./tsc";
import { FileCoverageEntrySchema } from "./coverage";
import { getObjectEntries } from "@/core";

export const FileHealthSchema = z.object({
  filePath: z.string(),
  tscErrors: z.array(TscDiagnosticSchema),
  coverage: FileCoverageEntrySchema.nullable(),
  /** Placeholder map for future signals (e.g. eslint, knip, complexity) */
  extraMetrics: z.record(z.string(), z.unknown()).default({}),
});

export type FileHealth = z.infer<typeof FileHealthSchema>;

// const createConfig = <T extends Record<
//   string, number
// >>(config: T) => getObjectEntries(config).reduce(() => ({

// }), {});
// const unionMapping = createConfig({
//   'fix-types': 1,
//   'improve-coverage': 2,
// });

// const kinds = {
//   fixTypes: 'fix-types',
//   improveCoverage: 'improve-coverage',
// } as const;
// type X = typeof kinds;
// type Y = keyof X;
// type Z = typeof kinds[Y];

// export const ActionableTaskSchema = z.object({
//   kind: z.enum(Object.values(kinds)),
//   priority: z.number().optional(),
//   filePath: z.string(),
//   reason: z.string(),
// }).transform(({ kind, ...value }) => {
//   const priority = kind === 'fix-types' ? 1 : 2;
//   return {
//     ...value,
//     kind,
//     priority,
//   };
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

// const x = (params: Pick<ActionableTask, 'filePath'>) => ActionableTaskSchema.decode({
//   kind: 'fix-types',
//   priority: 1,
//   reason,
//   ...params
// });

export interface BuildHealthOptions {
  /** Minimum acceptable branch coverage percentage before flagging a file (default: 80) */
  minBranchCoverage?: number;
  /** File patterns to ignore (e.g. test files or barrel files) */
  ignorePatterns?: RegExp[];
  /** File patterns to applied to test/spec files. These will be ignored unless running tests. */
  testPatterns?: RegExp[];
}
