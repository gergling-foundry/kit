import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  applyAndVerifyProposal,
  extractLocalHealthReport,
  packTaskContext,
  writeFileAsync
} from '@/node';
import { callChatTransformer } from '@/core';

const report = await extractLocalHealthReport({ minBranchCoverage: 85 });
const [nextTask] = report.tasks;

if (!nextTask) {
  console.log('All files pass typechecks and coverage thresholds.');
  process.exit(0);
}

console.log(`Target: ${nextTask.filePath} (${nextTask.kind})`);
const context = await packTaskContext(nextTask);

console.log('Selected Task:', context.task);
console.log('Allowed Output:', context.targetOutputPath);
console.log('Included Files:', context.includedFiles);
console.log('Truncated Files:', context.truncatedFiles);
console.log('Total Chars:', context.totalChars);

const proposedCode = await callChatTransformer(context.promptXml, {
  baseUrl: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY ?? '',
  model: process.env.LLM_MODEL ?? 'qwen2.5-coder:1.5b',
});

const verification = await applyAndVerifyProposal(
  context.targetOutputPath,
  proposedCode
);

if (!verification.ok) {
  console.error(`Rejected at [${verification.stage}]: ${verification.reason}`);
  if (verification.details) console.error(verification.details);
  process.exit(1);
}

console.log(
  `Verified ${verification.targetOutputPath} (${verification.lineCount} lines, delta: ${verification.lineDelta}). Ready for git branch/PR.`
);

// const previewPath = resolve('.ai-staging', 'prompt-preview.xml');
// await mkdir(dirname(previewPath), { recursive: true });
// await writeFileAsync(previewPath, context.promptXml);
// console.log(`Wrote prompt preview to ${previewPath}`);

// Pass `context.promptXml` to any async LLM function (Ollama, Gemini Flash, etc.)
// const proposedCode = await myLlmTransformer(context.promptXml);

// Write ONLY to `.ai-staging/<allowed_output_file>` for verification before touching src/
// const stagedPath = resolve('.ai-staging', context.targetOutputPath);
// await mkdir(dirname(stagedPath), { recursive: true });
// await writeFileAsync(stagedPath, proposedCode, 'utf8');
