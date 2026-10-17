import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSourceFile, updateExports, updateImports } from '../../src/runtime/source-update';

test('merges a named import and alphabetizes members', () => {
  const source = [
    "import './setup';",
    "import { Button } from './ui';",
    "import { Card } from './card';",
    '',
  ].join('\n');

  const output = updateImports('file.ts', source, {
    from: './ui',
    members: ['Card'],
  });

  assert.equal(
    output,
    [
      "import './setup';",
      "import { Button, Card } from './ui';",
      "import { Card } from './card';",
      '',
    ].join('\n'),
  );
});

test('a new module import preserves the existing declaration order', () => {
  const source = ["import './setup';", "import { Button } from './ui';", ''].join('\n');

  const output = updateImports('file.ts', source, {
    from: './new',
    members: ['Zeta', 'Alpha'],
  });

  assert.equal(
    output,
    [
      "import './setup';",
      "import { Button } from './ui';",
      "import { Alpha, Zeta } from './new';",
      '',
    ].join('\n'),
  );
});

test('side-effect imports are never merged or reordered', () => {
  const source = ["import './initialize-runtime';", "import { Button } from './ui';", ''].join(
    '\n',
  );

  const output = updateImports('file.ts', source, {
    from: './initialize-runtime',
    members: ['thing'],
  });

  assert.equal(
    output,
    [
      "import './initialize-runtime';",
      "import { Button } from './ui';",
      "import { thing } from './initialize-runtime';",
      '',
    ].join('\n'),
  );
});

test('updates a JSX file that contains side-effect imports', () => {
  const source = [
    "import './setup';",
    "import { Button } from './ui';",
    'export const App = () => <div><Button /></div>;',
    '',
  ].join('\n');

  const output = updateImports('App.jsx', source, {
    from: './ui',
    members: ['Card'],
  });

  assert.match(output, /import \{ Button, Card \} from '\.\/ui';/);
  assert.match(output, /<div><Button \/><\/div>/);
});

test('merge is idempotent', () => {
  const source = "import { Card } from './ui';\n";
  const once = updateImports('file.ts', source, {
    from: './ui',
    members: ['Card'],
  });
  const twice = updateImports('file.ts', once, {
    from: './ui',
    members: ['Card'],
  });

  assert.equal(twice, once);
});

test('merges a named export and preserves declaration order', () => {
  const source = [
    "export { Button } from './Button';",
    "export { theme } from './theme';",
    '',
  ].join('\n');

  const output = updateExports('file.ts', source, {
    from: './Button',
    members: ['ButtonProps'],
  });

  assert.equal(
    output,
    [
      "export { Button, ButtonProps } from './Button';",
      "export { theme } from './theme';",
      '',
    ].join('\n'),
  );
});

test('a new export preserves the existing export order', () => {
  const source = "export { Button } from './Button';\n";

  const output = updateExports('file.ts', source, {
    from: './Icon',
    members: ['Icon'],
  });

  assert.equal(output, "export { Button } from './Button';\nexport { Icon } from './Icon';\n");
});

test('export merge is idempotent', () => {
  const source = "export { Button } from './Button';\n";
  const once = updateExports('file.ts', source, {
    from: './Button',
    members: ['ButtonProps'],
  });
  const twice = updateExports('file.ts', once, {
    from: './Button',
    members: ['ButtonProps'],
  });

  assert.equal(twice, once);
});

test('a syntax error is reported without producing edits', () => {
  assert.throws(() => parseSourceFile('broken.ts', 'const = ;'), /Failed to parse broken\.ts/);
});
