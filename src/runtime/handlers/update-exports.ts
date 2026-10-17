import type { UpdateExportsAction } from '../../actions/types';
import type { RunContext } from '../context';
import { renderTemplateContent } from '../render';
import { updateExports } from '../source-update';
import { stageSourceFile } from '../stage';
import { readSourceTarget } from './source';

export function applyUpdateExports(action: UpdateExportsAction, context: RunContext): void {
  const { filePath, contents } = readSourceTarget(action.file, context);

  const updated = updateExports(filePath, contents, {
    from: renderTemplateContent(action.from, context.answers),
    members: action.members.map((member) => renderTemplateContent(member, context.answers)),
    typeOnly: action.typeOnly,
  });

  stageSourceFile(context, filePath, updated);
}
