import { ActionableTask } from "@/schema";

export const taskInstructions = ({
  filePath, kind, targetOutputPath
}: Pick<ActionableTask, 'filePath' | 'kind'> & {
  targetOutputPath: string
}) => ({
  'fix-types': [
    '<instructions>',
    `Fix all TypeScript compiler errors listed in <diagnostics> inside ${filePath}.`,
    `Return the COMPLETE, corrected TypeScript file for ${targetOutputPath}.`,
    'Output ONLY raw TypeScript code—no JSON, no markdown fences, and no explanations.',
    '</instructions>',
  ].join('\n'),
  'improve-coverage': [
    '<instructions>',
    `Write a complete Vitest unit test suite for ${filePath} to cover all branches and edge cases.`,
    `Import test helpers from 'vitest' (import { describe, it, expect } from 'vitest';).`,
    `Import the functions under test from '${filePath}' using a relative path.`,
    `Return the COMPLETE TypeScript test file for ${targetOutputPath}.`,
    'Output ONLY raw TypeScript code—no JSON, no markdown fences, and no explanations.',
    '</instructions>',
  ].join('\n')
} satisfies Record<ActionableTask['kind'], string>)[kind];