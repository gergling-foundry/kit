import { execFileAsync } from "@/node/lib";

export async function runProjectCommand(
  args: string[],
  rootDir: string
): Promise<{ ok: boolean; output: string }> {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    const { stdout, stderr } = await execFileAsync(npxCmd, args, {
      cwd: rootDir,
      shell: process.platform === 'win32',
    });
    return { ok: true, output: `${stdout}\n${stderr}`.trim() };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'stdout' in err) {
      const execErr = err as { stdout?: string; stderr?: string };
      return {
        ok: false,
        output: `${execErr.stdout ?? ''}\n${execErr.stderr ?? ''}`.trim(),
      };
    }
    throw err;
  }
}
