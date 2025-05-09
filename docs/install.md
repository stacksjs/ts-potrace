# Installation

ts-potrace can be installed from npm, and works in Node.js environments.

## Requirements

- Node.js 22 or newer
- Bun 1.2.13 or newer

## Using npm

```bash
npm install ts-potrace
```

## Using Yarn

```bash
yarn add ts-potrace
```

## Using pnpm

```bash
pnpm add ts-potrace
```

## Using Bun

```bash
bun add ts-potrace
```

## Dependencies

`ts-potrace` has the following key dependencies:

- **Jimp**: For image loading and manipulation
- **node:buffer**: For handling binary data

These dependencies will be automatically installed when you install `ts-potrace`.

## TypeScript Configuration

`ts-potrace` is written in TypeScript and provides type definitions out of the box. No additional configuration is needed to use it in a TypeScript project.

If you're using TypeScript, make sure your `tsconfig.json` includes the following settings for optimal compatibility:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

## Verification

You can verify that ts-potrace is installed correctly by running a simple test:

```ts
import { trace } from 'ts-potrace'

// Log the version information
console.log('ts-potrace is installed!')

// Try a simple trace operation with a test image
trace('test.png', (err, svg) => {
  if (err) {
    console.error('Error during test:', err)
  }
  else {
    console.log('Successfully traced test image')
  }
})
```

## Next Steps

Now that you have installed ts-potrace, you can proceed to the [Usage](./usage) guide to learn how to use the library.
