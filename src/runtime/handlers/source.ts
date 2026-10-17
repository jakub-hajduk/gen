import { extname } from 'node:path';
import type { RunContext } from '../context';
import { resolveWithinBase } from '../paths';
import { renderTemplateContent } from '../render';
import { SUPPORTED_SOURCE_EXTENSIONS } from '../source-update';

export interface SourceFileTarget {
  filePath: string;
  contents: string;
}

export function readSourceTarget(file: string, context: RunContext): SourceFileTarget {
  const renderedPath = renderTemplateContent(file, context.answers);
  const filePath = resolveWithinBase(context.basePath, renderedPath, 'source file');

  const extension = extname(filePath).toLowerCase();
  if (!SUPPORTED_SOURCE_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported source file extension "${extension}" for ${filePath}. Supported: .ts, .tsx, .js, .jsx.`,
    );
  }

  const contents = context.read(filePath);
  if (contents === undefined) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  return { filePath, contents };
}
