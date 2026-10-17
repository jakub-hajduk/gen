import { dirname } from 'node:path';
import { createJiti, type Jiti } from 'jiti';
import { glob } from 'tinyglobby';
import { isGenerator, type Generator } from './define-generator';

export interface DiscoveredGenerator {
  generator: Generator;
  moduleDir: string;
  modulePath: string;
}

export interface DiscoverGeneratorsOptions {
  configDir: string;
  patterns: string[];
  jiti?: Jiti;
}

function isPluginObject(value: unknown): value is { generators: unknown[] } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (isGenerator(value)) return false;
  return Array.isArray((value as { generators?: unknown }).generators);
}

function collectGenerators(value: unknown, out: Generator[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectGenerators(item, out);
    return;
  }

  if (isGenerator(value)) {
    out.push(value);
    return;
  }

  if (isPluginObject(value)) {
    collectGenerators(value.generators, out);
  }
}

function collectModuleExports(moduleExports: unknown, out: Generator[]): void {
  if (isGenerator(moduleExports) || Array.isArray(moduleExports)) {
    collectGenerators(moduleExports, out);
    return;
  }

  if (typeof moduleExports === 'object' && moduleExports !== null) {
    for (const value of Object.values(moduleExports)) {
      collectGenerators(value, out);
    }
  }
}

export async function resolveGeneratorModules(
  patterns: string[],
  configDir: string,
): Promise<string[]> {
  const files: string[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: configDir, absolute: true });
    for (const file of matches.sort()) {
      if (seen.has(file)) continue;
      seen.add(file);
      files.push(file);
    }
  }

  return files;
}

export async function discoverGenerators(
  options: DiscoverGeneratorsOptions,
): Promise<DiscoveredGenerator[]> {
  const { configDir, patterns } = options;
  const jiti = options.jiti ?? createJiti(configDir, { interopDefault: true });
  const files = await resolveGeneratorModules(patterns, configDir);

  const discovered: DiscoveredGenerator[] = [];
  const seenGenerators = new Set<Generator>();
  const byName = new Map<string, DiscoveredGenerator>();

  for (const modulePath of files) {
    let moduleExports: unknown;
    try {
      moduleExports = await jiti.import(modulePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load generator module ${modulePath}: ${message}`);
    }

    const generators: Generator[] = [];
    collectModuleExports(moduleExports, generators);
    const moduleDir = dirname(modulePath);

    for (const generator of generators) {
      if (seenGenerators.has(generator)) continue;

      const existing = byName.get(generator.name);
      if (existing) {
        throw new Error(
          `Duplicate generator name "${generator.name}" supplied by ${existing.modulePath} and ${modulePath}. Generator names must be unique.`,
        );
      }

      seenGenerators.add(generator);
      const entry: DiscoveredGenerator = { generator, moduleDir, modulePath };
      byName.set(generator.name, entry);
      discovered.push(entry);
    }
  }

  return discovered;
}
