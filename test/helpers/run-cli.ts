import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const tsxBin = join(repoRoot, 'node_modules', '.bin', 'tsx');
const cliPath = join(repoRoot, 'src', 'cli.ts');

export interface CliProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function runCliProcess(args: string[], cwd: string): Promise<CliProcessResult> {
  try {
    const { stdout, stderr } = await execFileAsync(tsxBin, [cliPath, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: typeof failure.code === 'number' ? failure.code : 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}
