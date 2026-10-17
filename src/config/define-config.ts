export interface SnipkitConfig {
  generators: string[];
}

export function defineConfig<TConfig extends SnipkitConfig>(config: TConfig): TConfig {
  return config;
}
