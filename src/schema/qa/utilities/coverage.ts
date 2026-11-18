import { FileCoverageEntry, ParsedCoverageSummary, RawCoverageSummarySchema } from "../types";
import { normalizeRepoPath } from "./tsc";

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
