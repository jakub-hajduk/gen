import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { AddTemplatesAction } from '../../actions/types';
import type { RunContext } from '../context';
import { resolveWithinBase } from '../paths';
import { expandTemplateSegment, renderTemplateContent } from '../render';
import { stageFile } from '../stage';

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

export function applyAddTemplates(action: AddTemplatesAction, context: RunContext): void {
  const fromDir = resolve(context.moduleDir, action.from);

  if (!existsSync(fromDir) || !statSync(fromDir).isDirectory()) {
    throw new Error(`Template directory not found: ${fromDir}`);
  }

  const destination = renderTemplateContent(action.to, context.answers);
  resolveWithinBase(context.basePath, destination, 'destination');

  for (const file of walk(fromDir)) {
    const relativePath = relative(fromDir, file);
    const expandedPath = relativePath
      .split(sep)
      .map((segment) => expandTemplateSegment(segment, context.answers))
      .join(sep);

    const isEta = expandedPath.endsWith('.eta');
    const outputRelative = isEta ? expandedPath.slice(0, -'.eta'.length) : expandedPath;

    const outputPath = resolveWithinBase(
      context.basePath,
      join(destination, outputRelative),
      'template output',
    );

    const contents = readFileSync(file, 'utf8');
    const rendered = isEta ? renderTemplateContent(contents, context.answers) : contents;

    stageFile(context, outputPath, rendered);
  }
}
