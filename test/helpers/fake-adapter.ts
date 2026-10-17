import type {
  ConfirmInteractionOptions,
  GeneratorChoice,
  MultiselectInteractionOptions,
  NumberInteractionOptions,
  PasswordInteractionOptions,
  PromptAdapter,
  SelectInteractionOptions,
  TextInteractionOptions,
} from '../../src/cli/prompt-adapter';

export interface FakeAdapterCall {
  method: string;
  options: unknown;
}

export interface FakeAdapterOptions {
  interactive?: boolean;
  generator?: string;
  text?: string;
  password?: string;
  number?: number;
  confirm?: boolean;
  select?: string;
  multiselect?: string[];
}

export interface FakeAdapter extends PromptAdapter {
  calls: FakeAdapterCall[];
}

export function createFakeAdapter(options: FakeAdapterOptions = {}): FakeAdapter {
  const calls: FakeAdapterCall[] = [];

  return {
    interactive: options.interactive ?? false,
    calls,

    async selectGenerator(choices: GeneratorChoice[]): Promise<string> {
      calls.push({ method: 'selectGenerator', options: choices });
      return options.generator ?? choices[0]?.name ?? '';
    },

    async text(interaction: TextInteractionOptions): Promise<string> {
      calls.push({ method: 'text', options: interaction });
      return options.text ?? interaction.default ?? '';
    },

    async password(interaction: PasswordInteractionOptions): Promise<string> {
      calls.push({ method: 'password', options: interaction });
      return options.password ?? '';
    },

    async number(interaction: NumberInteractionOptions): Promise<number> {
      calls.push({ method: 'number', options: interaction });
      return options.number ?? interaction.default ?? 0;
    },

    async confirm(interaction: ConfirmInteractionOptions): Promise<boolean> {
      calls.push({ method: 'confirm', options: interaction });
      return options.confirm ?? interaction.default ?? false;
    },

    async select(interaction: SelectInteractionOptions): Promise<string> {
      calls.push({ method: 'select', options: interaction });
      return options.select ?? interaction.default ?? '';
    },

    async multiselect(interaction: MultiselectInteractionOptions): Promise<string[]> {
      calls.push({ method: 'multiselect', options: interaction });
      return options.multiselect ?? interaction.default ?? [];
    },
  };
}
