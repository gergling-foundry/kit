import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    '*/index': 'src/*/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  splitting: false,
  external: ['zod'],
});
