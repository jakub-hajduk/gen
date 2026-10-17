import type { UpdateImportsAction } from '../../actions/types';
import type { RunContext } from '../context';
import { renderTemplateContent } from '../render';
import { updateImports } from '../source-update';
import { stageSourceFile } from '../stage';
import { readSourceTarget } from './source';

export function applyUpdateImports(action: UpdateImportsAction, context: RunContext): void {
  const { filePath, contents } = readSourceTarget(action.file, context);

  const updated = updateImports(filePath, contents, {
    from: renderTemplateContent(action.from, context.answers),
    members: action.members.map((member) => renderTemplateContent(member, context.answers)),
    typeOnly: action.typeOnly,
  });

  stageSourceFile(context, filePath, updated);
}
