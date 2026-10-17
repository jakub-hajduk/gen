import { extname } from 'node:path';
import ts from 'typescript';

export const SUPPORTED_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
};

interface NamedMember {
  imported: string;
  local?: string;
}

export function scriptKindFor(extension: string): ts.ScriptKind {
  const kind = SCRIPT_KINDS[extension];
  if (kind === undefined) {
    throw new Error(
      `Unsupported source file extension "${extension}". Supported: .ts, .tsx, .js, .jsx.`,
    );
  }
  return kind;
}

export function parseSourceFile(fileName: string, text: string): ts.SourceFile {
  const extension = extname(fileName).toLowerCase();
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(extension),
  );

  const diagnostics = (sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;

  if (diagnostics && diagnostics.length > 0) {
    throw new Error(`Failed to parse ${fileName}: the file contains syntax errors.`);
  }

  return sourceFile;
}

function readMembers(
  elements: readonly ts.ImportSpecifier[] | readonly ts.ExportSpecifier[],
): NamedMember[] {
  return elements.map((element) => ({
    imported: (element.propertyName ?? element.name).text,
    local: element.propertyName ? element.name.text : undefined,
  }));
}

function mergeMembers(
  existing: NamedMember[],
  additions: string[],
): { members: NamedMember[]; changed: boolean } {
  const byImported = new Map<string, NamedMember>();
  for (const member of existing) {
    byImported.set(member.imported, member);
  }

  let changed = false;
  for (const name of additions) {
    if (!byImported.has(name)) {
      byImported.set(name, { imported: name });
      changed = true;
    }
  }

  const members = [...byImported.values()].sort((a, b) =>
    a.imported < b.imported ? -1 : a.imported > b.imported ? 1 : 0,
  );

  if (!changed) {
    changed = members.some((member, index) => member.imported !== existing[index]?.imported);
  }

  return { members, changed };
}

function renderMembers(members: NamedMember[]): string {
  return `{ ${members
    .map((member) => (member.local ? `${member.imported} as ${member.local}` : member.imported))
    .join(', ')} }`;
}

function insertionIndexForShebang(text: string): number {
  if (text.startsWith('#!')) {
    const newline = text.indexOf('\n');
    return newline === -1 ? text.length : newline + 1;
  }
  return 0;
}

export interface ImportUpdate {
  from: string;
  members: string[];
  typeOnly?: boolean;
}

export function updateImports(fileName: string, text: string, update: ImportUpdate): string {
  const sourceFile = parseSourceFile(fileName, text);
  let lastImport: ts.ImportDeclaration | undefined;
  let matched: ts.ImportDeclaration | undefined;
  let namedBindings: ts.NamedImports | undefined;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    lastImport = statement;

    const specifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(specifier) || specifier.text !== update.from) {
      continue;
    }

    const clause = statement.importClause;
    if (!clause || !clause.namedBindings) continue;
    if (!ts.isNamedImports(clause.namedBindings)) continue;

    matched = statement;
    namedBindings = clause.namedBindings;
    break;
  }

  if (matched && namedBindings) {
    const existing = readMembers(namedBindings.elements);
    const { members, changed } = mergeMembers(existing, update.members);
    if (!changed) return text;

    const start = namedBindings.getStart(sourceFile);
    const end = namedBindings.getEnd();
    return text.slice(0, start) + renderMembers(members) + text.slice(end);
  }

  const prefix = update.typeOnly ? 'type ' : '';
  const importText = `import ${prefix}${renderMembers(
    mergeMembers([], update.members).members,
  )} from '${update.from}';`;

  if (lastImport) {
    const end = lastImport.getEnd();
    return `${text.slice(0, end)}\n${importText}${text.slice(end)}`;
  }

  const index = insertionIndexForShebang(text);
  return `${text.slice(0, index)}${importText}\n${text.slice(index)}`;
}

export interface ExportUpdate {
  from: string;
  members: string[];
  typeOnly?: boolean;
}

export function updateExports(fileName: string, text: string, update: ExportUpdate): string {
  const sourceFile = parseSourceFile(fileName, text);
  let lastExport: ts.ExportDeclaration | undefined;
  let matched: ts.ExportDeclaration | undefined;
  let exportClause: ts.NamedExports | undefined;

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    lastExport = statement;

    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) continue;
    if (specifier.text !== update.from) continue;
    if (!statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;

    matched = statement;
    exportClause = statement.exportClause;
    break;
  }

  if (matched && exportClause) {
    const existing = readMembers(exportClause.elements);
    const { members, changed } = mergeMembers(existing, update.members);
    if (!changed) return text;

    const start = exportClause.getStart(sourceFile);
    const end = exportClause.getEnd();
    return text.slice(0, start) + renderMembers(members) + text.slice(end);
  }

  const prefix = update.typeOnly ? 'type ' : '';
  const exportText = `export ${prefix}${renderMembers(
    mergeMembers([], update.members).members,
  )} from '${update.from}';`;

  if (lastExport) {
    const end = lastExport.getEnd();
    return `${text.slice(0, end)}\n${exportText}${text.slice(end)}`;
  }

  return `${text.replace(/\n?$/, '\n')}${exportText}\n`;
}
