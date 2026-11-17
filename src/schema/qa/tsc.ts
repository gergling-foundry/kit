import { z } from 'zod';

export const TscDiagnosticSchema = z.object({
  filePath: z.string().min(1),
  line: z.coerce.number().int().positive(),
  column: z.coerce.number().int().positive(),
  severity: z.enum(['error', 'warning']),
  code: z.string().regex(/^TS\d+$/),
  message: z.string(),
});

export type TscDiagnostic = z.infer<typeof TscDiagnosticSchema>;

const TSC_LINE_REGEX = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

/**
 * Normalizes Windows backslashes to forward slashes so tsc and coverage paths match reliably.
 */
export function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Parses raw stdout from `tsc --noEmit --pretty false` into validated diagnostics.
 * Unrecognized lines (such as multi-line continuation details or summary footers) are safely ignored.
 */
export function parseTscOutput(rawOutput: string): TscDiagnostic[] {
  const diagnostics: TscDiagnostic[] = [];

  for (const rawLine of rawOutput.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = TSC_LINE_REGEX.exec(line);
    if (!match) continue;

    const parsed = TscDiagnosticSchema.safeParse({
      filePath: normalizeRepoPath(match[1]),
      line: match[2],
      column: match[3],
      severity: match[4],
      code: match[5],
      message: match[6].trim(),
    });

    if (parsed.success) {
      diagnostics.push(parsed.data);
    }
  }

  return diagnostics;
}
