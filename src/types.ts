export interface OutputFormatConfig {
  enabled: boolean;
  filename?: string;
}

export type OutputFormatValue = boolean | OutputFormatConfig;

export interface CatalogConfig {
  include: string[];
  exclude: string[];
  barrelFilePatterns: string[];
  storyFilePatterns: string[];
  constantsFilePatterns: string[];
  similarityThreshold: number;
  outputPath?: string;
  cacheDir?: string;
  output?: {
    markdown?: OutputFormatValue;
    llmTxt?: OutputFormatValue;
    json?: OutputFormatValue;
  };
}

export type ComponentType = "component" | "hook" | "utility" | "class" | "type";

export interface ComponentMetadata {
  name: string;
  type: ComponentType;
  filePath: string;
  exportType: "default" | "named";
  signature?: string;
  props?: PropDefinition[];
  returnType?: string;
  jsDoc?: string;
  implementationHash: string;
  interfaceHash: string;
  usedIn: UsageReference[];
  stories?: StoryExample[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface UsageReference {
  filePath: string;
  line: number;
}

export interface StoryExample {
  name: string;
  filePath: string;
  code?: string;
  args?: Record<string, any>;
}

export interface CatalogCache {
  version: string;
  lastGenerated: string;
  components: Record<string, CachedComponent>;
}

export interface CachedComponent {
  implementationHash: string;
  interfaceHash: string;
  lastEnhanced?: string;
  description?: {
    what: string;
    whenToUse: string;
  };
}
