import { existsSync, readFileSync } from 'node:fs';
import { Writepool } from 'writepool';

export interface RunContext {
  files: Writepool;
  answers: Record<string, unknown>;
  configDir: string;
  moduleDir: string;
  basePath: string;
  dryRun: boolean;
  force: boolean;
  read(absolutePath: string): string | undefined;
}

export interface CreateRunContextOptions {
  configDir: string;
  moduleDir?: string;
  basePath: string;
  answers?: Record<string, unknown>;
  dryRun?: boolean;
  force?: boolean;
}

export function createRunContext(options: CreateRunContextOptions): RunContext {
  const files = new Writepool();

  return {
    files,
    answers: options.answers ?? {},
    configDir: options.configDir,
    moduleDir: options.moduleDir ?? options.configDir,
    basePath: options.basePath,
    dryRun: options.dryRun ?? false,
    force: options.force ?? false,
    read(absolutePath) {
      const staged = files.files.get(absolutePath);
      if (staged !== undefined) return staged;
      if (existsSync(absolutePath)) return readFileSync(absolutePath, 'utf8');
      return undefined;
    },
  };
}
