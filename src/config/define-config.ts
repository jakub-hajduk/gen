export interface SnipoConfig {
  generators: string[];
}

export function defineConfig<TConfig extends SnipoConfig>(config: TConfig): TConfig {
  return config;
}
