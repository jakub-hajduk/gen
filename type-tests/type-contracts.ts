import { addTemplates, defineConfig, defineGenerator, text, updateImports } from '../src/index';

// @ts-expect-error basePath is required on every generator
defineGenerator({ name: 'missing-base-path', actions: [] });

export const generator = defineGenerator({
  name: 'component',
  description: 'Create a component',
  basePath: 'src/components',
  prompts: {
    name: text({ message: 'Component name' }),
  },
  actions: [
    addTemplates({ from: 'templates', to: 'components' }),
    updateImports({ file: 'index.ts', from: './button', members: [] }),
  ],
});

export const config = defineConfig({ generators: ['./generators/**/*.generator.ts'] });
