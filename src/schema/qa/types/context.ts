import { ActionableTask } from "./health";

export interface PackTaskContextOptions {
  /** Root directory of the repository (defaults to process.cwd()) */
  rootDir?: string;
  /** Maximum total character budget across all packed files (default: 24000) */
  maxTotalChars?: number;
  /** Whether to include the target's existing .test.ts file if one exists (default: true) */
  includeExistingTest?: boolean;
  /** Whether to include directly imported local TypeScript files (default: true) */
  includeLocalImports?: boolean;
}

export interface PackedContextResult {
  task: ActionableTask;
  targetOutputPath: string;
  includedFiles: string[];
  truncatedFiles: string[];
  totalChars: number;
  promptXml: string;
}
