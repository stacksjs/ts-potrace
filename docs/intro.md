<p align="center"><img src="https://github.com/stacksjs/ts-potrace/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

# Introduction to ts-potrace

> A TypeScript implementation of potrace - transforming bitmaps into vector graphics

## What is ts-potrace?

`ts-potrace` is a TypeScript implementation of [Potrace](http://potrace.sourceforge.net/), a utility for tracing bitmap images and transforming them into smooth, scalable vector graphics. Originally developed by Peter Selinger, Potrace provides a way to convert images like PNGs and JPEGs into SVG format.

This library brings the power of Potrace to TypeScript and JavaScript environments, with added features like posterization for multi-level color tracing.

## Key Features

- **Bitmap Tracing**: Convert raster images to clean SVG vector paths
- **Posterization**: Create multi-level color traces for more detailed output
- **High-Quality Output**: Generate smooth, optimized vector graphics
- **Customization**: Extensive options for adjusting the tracing process
- **TypeScript Support**: Fully typed API for better development experience
- **Platform Independent**: Works in Bun & Node.js environments

_Browser support coming soon! 🚧_

## How it Works

At a high level, ts-potrace works by:

1. Processing an input image into a bitmap
2. Applying a threshold to convert the image to black and white
3. Tracing the boundaries between black and white regions
4. Creating smooth curves that follow these boundaries
5. Optimizing the resulting paths
6. Generating SVG output

For posterization, the process is extended to handle multiple color levels, creating a more detailed representation of the original image.

## Use Cases

ts-potrace is perfect for:

- Creating SVG icons from raster images
- Generating vector versions of logos and graphics
- Creating stylized artwork from photographs
- Web applications that need client-side image vectorization
- Server-side image processing pipelines
- Automating SVG creation in build processes

## Quick Example

```ts
import fs from 'node:fs'
import { trace } from 'ts-potrace'

// Simple bitmap tracing
trace('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output.svg', svg)
})
```

Ready to dive deeper? Check out the [Installation](./install) and [Usage](./usage) guides to get started with ts-potrace.
