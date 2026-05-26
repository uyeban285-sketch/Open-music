export interface AIModuleManifest {
  id: string;
  type: 'embedding' | 'ranking' | 'profiling' | 'generation';
  capabilities: string[];
  inputSchema: string;
  outputSchema: string;
  estimatedCostPerCall: number | null;
  privacyClass: 'local' | 'cloud' | 'hybrid';
}

export interface RecoSourceManifest {
  id: string;
  name: string;
  type: 'content' | 'collaborative' | 'semantic' | 'local_ai';
  weight: number;
}

export interface AnalyticsManifest {
  id: string;
  name: string;
  type: string;
  refreshInterval: number;
}

export interface AIModuleRegistry {
  register(manifest: AIModuleManifest): void;
  get(id: string): AIModuleManifest | undefined;
  list(): AIModuleManifest[];
}

export interface RecoSourceRegistry {
  register(manifest: RecoSourceManifest): void;
  get(id: string): RecoSourceManifest | undefined;
  list(): RecoSourceManifest[];
}

export interface AnalyticsRegistry {
  register(manifest: AnalyticsManifest): void;
  get(id: string): AnalyticsManifest | undefined;
  list(): AnalyticsManifest[];
}
