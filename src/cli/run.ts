import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSnipkitConfig } from '../config/load-config';
import type { ActionHandlerRegistry } from '../runtime/actions';
import { createRunHooks, type RunHookable } from '../runtime/hooks';
import { resolveGenerator } from '../runtime/resolve-generator';
import { resolvePrompts } from '../runtime/resolve-prompts';
import { runGenerator } from '../runtime/run-generator';
import { createClackAdapter } from './clack-adapter';
import { parseGlobalFlags, parsePromptValues } from './parse-args';
import type { PromptAdapter } from './prompt-adapter';

const HELP = `snipkit - snippet-based code generation

Usage:
  snipkit <generator> [options]

Options:
  --dry-run        Report the files that would be written without writing them
  --force          Replace existing files that collide with generated output
  -h, --help       Show this help
  -v, --version    Show the version

Every generator prompt can be supplied as a CLI flag (for example a "name"
prompt becomes --name). Missing values are prompted interactively when a TTY
is available and fail otherwise.`;

function readVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));

  while (true) {
    const packageJsonPath = join(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
          name?: string;
          version?: string;
        };
        if (pkg.name === 'snipkit') return pkg.version ?? '0.0.0';
      } catch {
        // ignore malformed package.json
      }
    }

    const parent = dirname(dir);
    if (parent === dir) return '0.0.0';
    dir = parent;
  }
}

export interface RunCliOptions {
  cwd?: string;
  adapter?: PromptAdapter;
  hooks?: RunHookable;
  handlers?: ActionHandlerRegistry;
  stdout?: (message: string) => void;
}

export interface RunCliResult {
  kind: 'help' | 'version' | 'run';
  generator?: string;
  files: string[];
  dryRun: boolean;
  written: boolean;
}

function report(
  stdout: (message: string) => void,
  generatorName: string,
  files: string[],
  dryRun: boolean,
): void {
  if (dryRun) {
    stdout(`Dry run for "${generatorName}": ${files.length} file(s) would be written.`);
  } else {
    stdout(`Generator "${generatorName}" wrote ${files.length} file(s).`);
  }
  for (const file of files) stdout(`  ${file}`);
}

export async function runCli(argv: string[], options: RunCliOptions = {}): Promise<RunCliResult> {
  const stdout = options.stdout ?? ((message) => process.stdout.write(`${message}\n`));
  const { global, generatorName } = parseGlobalFlags(argv);

  if (global.help) {
    stdout(HELP);
    return { kind: 'help', files: [], dryRun: false, written: false };
  }

  if (global.version) {
    stdout(readVersion());
    return { kind: 'version', files: [], dryRun: false, written: false };
  }

  const cwd = options.cwd ?? process.cwd();
  const adapter = options.adapter ?? createClackAdapter();
  const hooks = options.hooks ?? createRunHooks();

  const loaded = await loadSnipkitConfig(cwd);
  await hooks.callHook('config:resolve', {
    configPath: loaded.configPath,
    configDir: loaded.configDir,
    config: loaded.config,
  });

  const resolved = await resolveGenerator({
    generators: loaded.generators,
    name: generatorName,
    prompts: adapter,
  });
  const generator = resolved.generator;

  const values = parsePromptValues(argv, generator.prompts ?? {});
  const answers = await resolvePrompts({
    prompts: generator.prompts,
    values,
    adapter,
  });
  await hooks.callHook('prompts:resolve', { generator, answers });

  const result = await runGenerator({
    generator,
    configDir: loaded.configDir,
    moduleDir: resolved.moduleDir,
    answers,
    dryRun: global.dryRun,
    force: global.force,
    hooks,
    handlers: options.handlers,
  });

  report(stdout, generator.name, result.files, global.dryRun);

  return {
    kind: 'run',
    generator: generator.name,
    files: result.files,
    dryRun: global.dryRun,
    written: result.written,
  };
}
