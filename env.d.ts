declare namespace NodeJS {
  interface ProcessEnv {
    readonly LLM_API_KEY?: string;
    readonly LLM_BASE_URL?: string;
    readonly LLM_MODEL?: string;
  }
}
