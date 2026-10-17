import type { PromptAdapter } from '../cli/prompt-adapter';
import type { DiscoveredGenerator } from '../config/discover-generators';

function listNames(generators: DiscoveredGenerator[]): string {
  return generators.map((discovered) => discovered.generator.name).join(', ');
}

export interface ResolveGeneratorOptions {
  generators: DiscoveredGenerator[];
  name?: string;
  prompts: PromptAdapter;
}

export async function resolveGenerator(
  options: ResolveGeneratorOptions,
): Promise<DiscoveredGenerator> {
  const { generators, name, prompts } = options;

  if (generators.length === 0) {
    throw new Error('No generators are defined in the snipo configuration.');
  }

  if (name) {
    const generator = generators.find((candidate) => candidate.generator.name === name);
    if (!generator) {
      throw new Error(
        `Unknown generator "${name}". Available generators: ${listNames(generators)}.`,
      );
    }
    return generator;
  }

  if (!prompts.interactive) {
    throw new Error(
      `No generator selected. Available generators: ${listNames(generators)}. Run "snipo <generator>" to choose one.`,
    );
  }

  const selected = await prompts.selectGenerator(
    generators.map((candidate) => ({
      name: candidate.generator.name,
      description: candidate.generator.description,
    })),
  );

  const generator = generators.find((candidate) => candidate.generator.name === selected);
  if (!generator) {
    throw new Error(`Unknown generator "${selected}".`);
  }

  return generator;
}
