import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  VerificationResult,
  VerifyProposalOptions,
  verifyProposalOptionsSchema
} from './types';
import {
  assertWithinRoot,
  fileExists,
  readFileAsync,
  writeFileAsync
} from '@/node/file';
import { countLines } from '@/core';
import { runProjectCommand } from './cmd';

const handleSnapshot = async (targetAbs: string) => {
  const existedBefore = await fileExists(targetAbs);
  const originalContent = existedBefore ? await readFileAsync(targetAbs) : null;

  const rollback = async (): Promise<void> => {
    if (existedBefore && originalContent !== null) {
      await writeFile(targetAbs, originalContent, 'utf8');
    } else if (await fileExists(targetAbs)) {
      await rm(targetAbs, { force: true });
    }
  };

  return { existedBefore, originalContent, rollback };
};

/**
 * Atomically applies a proposed file change, verifies it with `tsc` and `vitest`,
 * and automatically reverts the filesystem if any check fails.
 */
export async function applyAndVerifyProposal(
  targetOutputPath: string,
  proposedCode: string,
  options: VerifyProposalOptions = {}
): Promise<VerificationResult> {
  const {
    rootDir,
    maxLines,
    maxLineDelta,
    rollbackOnFailure,
    runTests,
    tsconfigPath,
  } = verifyProposalOptionsSchema.decode(options);

  if (!proposedCode.trim()) {
    return {
      ok: false,
      stage: 'empty-output',
      reason: 'Proposed code was empty.',
    };
  }

  // 1. Enforce strict path boundary
  const targetAbs = assertWithinRoot(rootDir, resolve(rootDir, targetOutputPath));

  // 2. Snapshot original file state
  const {
    existedBefore, originalContent, rollback
  } = await handleSnapshot(targetAbs);

  // 3. Enforce PR / file size limits before writing
  const newLines = countLines(proposedCode);
  const oldLines = originalContent !== null ? countLines(originalContent) : 0;
  const lineDelta = Math.abs(newLines - oldLines);

  if (newLines > maxLines) {
    return {
      ok: false,
      stage: 'size-limit',
      reason: `Generated file has ${newLines} lines (max allowed: ${maxLines}).`,
    };
  }

  if (lineDelta > maxLineDelta) {
    return {
      ok: false,
      stage: 'size-limit',
      reason: `Line delta of ${lineDelta} exceeds limit of ${maxLineDelta} lines.`,
    };
  }

  try {
    // 4. Write candidate file
    await mkdir(dirname(targetAbs), { recursive: true });
    await writeFileAsync(targetAbs, `${proposedCode.trimEnd()}\n`);

    // 5. Gate A: TypeScript compilation
    const tscCheck = await runProjectCommand(
      ['tsc', '--noEmit', '--pretty', 'false', '-p', tsconfigPath],
      rootDir
    );
    if (!tscCheck.ok) {
      await rollback();
      return {
        ok: false,
        stage: 'typecheck',
        reason: 'TypeScript compilation failed; changes were reverted.',
        details: tscCheck.output,
      };
    }

    // 6. Gate B: Vitest suite (runs targeted test if target is a test file, else full suite)
    if (runTests) {
      const isTestFile = /\.(test|spec)\.tsx?$/.test(targetOutputPath);
      const vitestArgs = isTestFile
        ? ['vitest', 'run', targetOutputPath]
        : ['vitest', 'run'];

      const testCheck = await runProjectCommand(vitestArgs, rootDir);
      if (!testCheck.ok) {
        await rollback();
        return {
          ok: false,
          stage: 'tests',
          reason: 'Vitest verification failed; changes were reverted.',
          details: testCheck.output,
        };
      }
    }

    return {
      ok: true,
      targetOutputPath,
      lineCount: newLines,
      lineDelta,
    };
  } catch (err) {
    if (rollbackOnFailure) await rollback();
    throw err;
  }
}
