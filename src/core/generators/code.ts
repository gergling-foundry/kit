export interface ChatCompletionConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a strict code transformer. Output ONLY valid code for the requested target file. Do not wrap output in markdown fences or add explanations.';

/**
 * Strips leading/trailing markdown code fences if a model includes them despite instructions.
 */
export function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```[a-zA-Z0-9_-]*\(\r?\n?/, '').replace(/\r\)?\n?```$/, '')
    .trim();
}

/**
 * Extracts code from a fenced markdown block if present, or returns trimmed raw text.
 */
export function extractCodeBlock(raw: string): string {
  const fenced = /```(?:ts|typescript|js|javascript)?\(\r\)?\n([\s\(\S\)]*?)```/i.exec(raw);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return raw.trim();
}


/**
 * Provider-agnostic, zero-dependency OpenAI-compatible chat completion caller.
 * Works with local Ollama, Gemini OpenAI-compat endpoint, Groq, and OpenRouter.
 */
export async function callChatTransformer(
  userPrompt: string,
  config: ChatCompletionConfig
): Promise<string> {
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature ?? 0.1,
      messages: [
        { role: 'system', content: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned an empty completion response.');
  }

  return extractCodeBlock(content);
}
