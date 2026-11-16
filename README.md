# @gergling-foundry/kit

Personal TypeScript utility toolkit containing zero-dependency core helpers and Zod schema utilities.

## Installation

```bash
npm install @gergling-foundry/kit
```

If you plan to use the `@gergling-foundry/kit/schema` subpath, ensure `zod` is also installed in your project:

```bash
npm install zod
```

## Usage

### Core Utilities (`@gergling-foundry/kit/core`)

Zero-dependency TypeScript utilities. Importing from `/core` does not require `zod` to be installed.

```ts
import { /* your core helpers */ } from '@gergling-foundry/kit/core';
```

### Schema Utilities (`@gergling-foundry/kit/schema`)

Reusable Zod schemas, parsers, and validation helpers.

```ts
import { /* your schema helpers */ } from '@gergling-foundry/kit/schema';
```

## Development

```bash
# Typecheck
npm run typecheck

# Build ESM, CJS, and TypeScript declarations
npm run build
```

## License

[MIT](./LICENSE) © Gergling Foundry
