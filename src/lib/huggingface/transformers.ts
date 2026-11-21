import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers';

export interface LocalHfConfig {
  /** Hugging Face ONNX model ID (e.g. 'onnx-community/Qwen2.5-Coder-1.5B-Instruct') */
  model?: string;
  /** Quantization dtype: 'q4', 'q4f16', 'q8', or 'fp16' (default: 'q4') */
  dtype?: 'q4' | 'q4f16' | 'q8' | 'fp16';
  /** Maximum new tokens to generate (default: 1024) */
  maxNewTokens?: number;
  /** Optional local directory to store downloaded model weights */
  cacheDir?: string;
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a strict code transformer. Output ONLY valid code for the requested target file. Do not wrap output in markdown fences or add explanations.';

/**
 * Creates a self-contained, offline text-generation transformer running in-process
 * via ONNX Runtime. Downloads model weights once, then requires zero network or servers.
 */
export function createLocalHfTransformer(config: LocalHfConfig = {}) {
  const modelId = config.model ?? 'onnx-community/Qwen2.5-Coder-1.5B-Instruct';
  const dtype = config.dtype ?? 'q4';
  const maxNewTokens = config.maxNewTokens ?? 1024;
  const systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  // Lazy-load and cache the pipeline instance across multiple calls in the same process
  let generatorPromise: Promise<TextGenerationPipeline> | null = null;

  const getGenerator = (): Promise<TextGenerationPipeline> => {
    if (!generatorPromise) {
      generatorPromise = pipeline('text-generation', modelId, {
        dtype,
        ...(config.cacheDir ? { cache_dir: config.cacheDir } : {}),
      });
    }
    return generatorPromise;
  };

  return async (userPrompt: string): Promise<string> => {
    const generator = await getGenerator();

    const output = await generator(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        max_new_tokens: maxNewTokens,
        temperature: 0.1,
        do_sample: false,
      }
    );

    // Extract the assistant's reply from the chat-templated output
    const firstResult = Array.isArray(output) ? output : output;
    const generated = (firstResult as { generated_text?: unknown }).generated_text;

    const rawText = Array.isArray(generated)
      ? String((generated.at(-1) as { content?: string } | undefined)?.content ?? '')
      : String(generated ?? '');

    return rawText
      .replace(/^```[a-zA-Z0-9_-]*\(\r?\n?/, '').replace(/\r\)?\n?```$/, '')
      .trim();
  };
}
