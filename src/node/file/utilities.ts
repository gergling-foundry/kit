import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  parseTscOutput,
  parseCoverageSummary,
  buildHealthQueue,
  type BuildHealthOptions,
  type FileHealth,
  type ActionableTask,
  type ParsedCoverageSummary,
} from '../../schema';
import { readFileAsync } from './fs';

const execFileAsync = promisify(execFile);

export interface HealthExtractConfig extends BuildHealthOptions {
  /** Root directory of the target repository (defaults to process.cwd()) */
  rootDir?: string;
  /** Path to tsconfig.json relative to rootDir (defaults to 'tsconfig.json') */
  tsconfigPath?: string;
  /** Path to coverage-summary.json relative to rootDir (defaults to 'coverage/coverage-summary.json') */
  coverageSummaryPath?: string;
  /** Whether to execute tsc as part of extraction (defaults to true) */
  runTsc?: boolean;
}

export interface HealthReport {
  generatedAt: string;
  rootDir: string;
  summary: {
    totalFiles: number;
    filesWithTypeErrors: number;
    actionableTasks: number;
    overallBranchPct: number | null;
  };
  files: FileHealth[];
  tasks: ActionableTask[];
}

/**
 * Runs `tsc --noEmit --pretty false` and returns stdout/stderr even when type errors exist.
 */
async function executeTsc(rootDir: string, tsconfigPath: string): Promise<string> {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    const { stdout, stderr } = await execFileAsync(
      npxCmd,
      ['tsc', '--noEmit', '--pretty', 'false', '-p', tsconfigPath],
      { cwd: rootDir, shell: process.platform === 'win32' }
    );
    return `${stdout}\n${stderr}`;
  } catch (err: unknown) {
    // tsc exits with code 1 or 2 when type errors are found; extract its output safely
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return `${execErr.stdout ?? ''}\n${execErr.stderr ?? ''}`;
    }
    throw err;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts TypeScript diagnostics and Vitest coverage from disk and produces
 * a unified, priority-ranked health report.
 */
export async function extractLocalHealthReport(
  config: HealthExtractConfig = {}
): Promise<HealthReport> {
  const rootDir = resolve(config.rootDir ?? process.cwd());
  const tsconfigPath = config.tsconfigPath ?? 'tsconfig.json';
  const coverageFile = resolve(
    rootDir,
    config.coverageSummaryPath ?? 'coverage/coverage-summary.json'
  );

  // 1. Extract tsc diagnostics
  const rawTsc = config.runTsc === false ? '' : await executeTsc(rootDir, tsconfigPath);
  const tscDiagnostics = parseTscOutput(rawTsc);

  // 2. Extract coverage summary (gracefully handles missing coverage file)
  let coverageSummary: ParsedCoverageSummary = { total: null, files: {} };
  if (await fileExists(coverageFile)) {
    const rawJson = JSON.parse(await readFileAsync(coverageFile));
    coverageSummary = parseCoverageSummary(rawJson, rootDir);
  }

  // 3. Merge and rank via @gergling-foundry/kit/schema
  const { files, tasks } = buildHealthQueue(tscDiagnostics, coverageSummary, {
    minBranchCoverage: config.minBranchCoverage,
    ignorePatterns: config.ignorePatterns,
  });

  return {
    generatedAt: new Date().toISOString(),
    rootDir,
    summary: {
      totalFiles: files.length,
      filesWithTypeErrors: files.filter((f) => f.tscErrors.length > 0).length,
      actionableTasks: tasks.length,
      overallBranchPct: coverageSummary.total?.branches.pct ?? null,
    },
    files,
    tasks,
  };
}
