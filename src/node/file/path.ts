import { dirname, resolve, relative, extname, join } from 'node:path';
import { fileExists } from './fs';
import { ActionableTask } from '../../schema';

/**
 * Ensures a resolved path cannot escape the repository root.
 */
export function assertWithinRoot(rootDir: string, candidatePath: string): string {
  const absRoot = resolve(rootDir);
  const absTarget = resolve(candidatePath);
  const rel = relative(absRoot, absTarget);

  if (rel.startsWith('..') || rel.includes('..\\') || rel.includes('../')) {
    throw new Error(`Security boundary violation: "${candidatePath}" escapes rootDir.`);
  }
  return absTarget;
}

/**
 * Resolves a TypeScript relative import specifier (including NodeNext `.js` extensions)
 * back to an actual `.ts` file on disk.
 */
export async function resolveLocalTsImport(
  fromFileAbs: string,
  specifier: string,
  rootDir: string
): Promise<string | null> {
  const baseDir = dirname(fromFileAbs);
  const stripped = specifier.replace(/\.(js|mjs|cjs)$/, '');
  const candidates = [
    `${stripped}.ts`,
    `${stripped}.tsx`,
    join(stripped, 'index.ts'),
  ];

  for (const candidate of candidates) {
    const absCandidate = assertWithinRoot(rootDir, resolve(baseDir, candidate));
    if (await fileExists(absCandidate)) {
      return absCandidate;
    }
  }
  return null;
}

/**
 * Determines the single safe output path an LLM transformer is permitted to write to.
 */
export function resolveTargetOutputPath(task: ActionableTask): string {
  if (task.kind === 'fix-types') {
    return task.filePath;
  }
  // For coverage tasks, only allow writing to the corresponding test file
  const ext = extname(task.filePath);
  const base = task.filePath.slice(0, -ext.length);
  return `${base}.test${ext}`;
}
