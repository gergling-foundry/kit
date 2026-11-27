/**
 * Normalizes Windows backslashes to forward slashes so tsc and coverage paths match reliably.
 */
export function normaliseFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}
