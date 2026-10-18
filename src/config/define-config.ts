export interface GenConfig {
  generators: string[];
}

export function defineConfig<TConfig extends GenConfig>(config: TConfig): TConfig {
  return config;
}
