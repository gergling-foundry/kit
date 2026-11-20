import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  extractLocalHealthReport,
  packTaskContext,
  writeFileAsync
} from '@/node';

const report = await extractLocalHealthReport({ minBranchCoverage: 85 });
const [nextTask] = report.tasks;

if (!nextTask) {
  console.log('All files pass typechecks and coverage thresholds.');
  process.exit(0);
}

const context = await packTaskContext(nextTask);

console.log('Selected Task:', context.task);
console.log('Allowed Output:', context.targetOutputPath);
console.log('Included Files:', context.includedFiles);
console.log('Truncated Files:', context.truncatedFiles);
console.log('Total Chars:', context.totalChars);

const previewPath = resolve('.ai-staging', 'prompt-preview.xml');
await mkdir(dirname(previewPath), { recursive: true });
await writeFileAsync(previewPath, context.promptXml);
console.log(`Wrote prompt preview to ${previewPath}`);

// Pass `context.promptXml` to any async LLM function (Ollama, Gemini Flash, etc.)
// const proposedCode = await myLlmTransformer(context.promptXml);

// Write ONLY to `.ai-staging/<allowed_output_file>` for verification before touching src/
// const stagedPath = resolve('.ai-staging', context.targetOutputPath);
// await mkdir(dirname(stagedPath), { recursive: true });
// await writeFileAsync(stagedPath, proposedCode, 'utf8');
