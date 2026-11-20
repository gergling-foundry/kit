import { access, readFile, writeFile } from 'node:fs/promises';

export async function fileExists(absPath: string): Promise<boolean> {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

export const readFileAsync = (path: string) => readFile(path, 'utf8');

export const writeFileAsync = (
  path: string, content: string
) => writeFile(path, content, 'utf8');
