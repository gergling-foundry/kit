import { resolve } from "node:path";
import z from "zod";

export const verifyProposalOptionsSchema = z.object({
  maxLineDelta: z.number().default(120)
    .describe('Maximum allowed line-count change relative to the existing file (default: 120)'),
  maxLines: z.number().default(250)
    .describe('Maximum total lines allowed in the generated file (default: 250)'),
  rootDir: z.string().default(process.cwd())
    .describe('Root directory of the repository (defaults to process.cwd())'),
  runTests: z.boolean().default(true)
    .describe('Whether to run Vitest after tsc passes (default: true)'),
  tsconfigPath: z.string().default('tsconfig.json')
    .describe(`Path to tsconfig.json relative to rootDir (defaults to 'tsconfig.json')`),
}).transform(({ rootDir, ...options }) => ({
  ...options,
  rootDir: resolve(rootDir),
}));
export type VerifyProposalOptions = z.input<typeof verifyProposalOptionsSchema>;

export type VerificationResult = (
  | {
    ok: true;
    targetOutputPath: string;
    lineCount: number;
    lineDelta: number;
  }
  | {
    ok: false;
    stage: 'empty-output' | 'size-limit' | 'typecheck' | 'tests';
    reason: string;
    details?: string;
  }
);
