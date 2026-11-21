import * as dotenv from 'dotenv';

dotenv.config();

type Key = keyof {
  [K in keyof NodeJS.ProcessEnv as string extends K ? never : number extends K ? never : K]: NodeJS.ProcessEnv[K];
};

export const getEnvVar = <K extends Key>(
  key: K, fallback?: NodeJS.ProcessEnv[K]
): Required<NodeJS.ProcessEnv>[K] => {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing main environment variable: ${key}`);
};
