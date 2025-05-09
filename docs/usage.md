# Basic Usage

This guide covers the basic usage of ts-potrace for common tracing tasks.

## Simple Tracing

The simplest way to use ts-potrace is with the `trace` function, which provides a straightforward API for converting an image to SVG:

```ts
import fs from 'node:fs'
import { trace } from 'ts-potrace'

// Trace an image file and save the resulting SVG
trace('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output.svg', svg)
  console.log('Image traced successfully')
})
```

## Using the Potrace Class

For more control over the tracing process, you can use the `Potrace` class directly:

```ts
import fs from 'node:fs'
import { Potrace } from 'ts-potrace'

// Create a new Potrace instance with custom options
const potrace = new Potrace({
  turdSize: 5, // Suppress speckles of this size
  alphaMax: 1, // Corner threshold parameter
  optCurve: true, // Optimize curves
  optTolerance: 0.2, // Curve optimization tolerance
  threshold: 128, // Threshold for black/white classification (0-255)
  blackOnWhite: true, // Trace dark areas
  color: '#3498db', // Fill color
  background: '#f0f0f0', // Background color
})

// Load and trace an image
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG output
  const svg = potrace.getSVG()
  fs.writeFileSync('output.svg', svg)

  // Or just get the path element for embedding
  const path = potrace.getPathTag()
  console.log(path)
})
```

## Posterization

For creating multi-level color traces, use the `posterize` function or `Posterizer` class:

```ts
import fs from 'node:fs'
import { posterize } from 'ts-potrace'

// Simple posterization with default settings
posterize('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('posterized.svg', svg)
})

// With custom options
posterize('input.png', {
  steps: 5, // Number of color levels
  fillStrategy: 'dominant', // Color selection strategy
  rangeDistribution: 'auto', // How to distribute color ranges
  background: '#ffffff', // Background color
  color: 'auto', // Foreground color (auto = derive from image)
}, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('custom-posterized.svg', svg)
})
```

## Working with Buffers and Jimp Instances

Instead of file paths, you can also pass Buffer objects or Jimp instances:

```ts
import fs from 'node:fs'
import { Jimp } from 'jimp'
import { trace } from 'ts-potrace'

// Using a buffer
const imageBuffer = fs.readFileSync('input.png')
trace(imageBuffer, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('from-buffer.svg', svg)
})

// Using a Jimp instance for pre-processing
Jimp.read('input.png')
  .then((image) => {
    // Pre-process the image
    image.grayscale().blur(1)

    // Then trace it
    trace(image, (err, svg) => {
      if (err)
        throw err
      fs.writeFileSync('processed.svg', svg)
    })
  })
  .catch((err) => {
    console.error('Error processing image:', err)
  })
```

## SVG Output Options

You can customize the SVG output in several ways:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the full SVG document
  const fullSvg = potrace.getSVG()

  // Get just the path tag (for embedding in existing SVGs)
  const pathOnly = potrace.getPathTag()

  // Get the path as an SVG symbol (for reuse)
  const symbol = potrace.getSymbol('my-icon')

  // Set parameters and regenerate (without reloading the image)
  potrace.setParameters({
    color: 'red',
    optTolerance: 0.5,
  })

  // Get SVG with new parameters
  const updatedSvg = potrace.getSVG()
})
```

## Next Steps

For more detailed information on the available options and advanced usage, check out:

- [Bitmap Tracing](./features/bitmap-tracing)
- [Posterization](./features/posterization)
- [API Reference](./api-reference)
- [Advanced usage examples](./advanced/custom-parameters)
