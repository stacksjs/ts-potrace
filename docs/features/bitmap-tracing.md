# Bitmap Tracing

ts-potrace provides powerful bitmap tracing functionality that allows you to convert raster images (like PNGs, JPGs) into scalable vector graphics (SVG).

## How Bitmap Tracing Works

Bitmap tracing, also known as vectorization, works by:

1. **Thresholding**: Converting the image to black and white based on a threshold value
2. **Edge Detection**: Finding the boundaries between black and white areas
3. **Path Creation**: Creating smooth paths that follow these boundaries
4. **Path Optimization**: Simplifying the paths to reduce complexity while maintaining visual quality

## Basic Usage

The simplest way to trace a bitmap is to use the `trace` function:

```ts
import fs from 'node:fs'
import { trace } from 'ts-potrace'

// Trace a bitmap file and get the SVG
trace('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output.svg', svg)
})
```

## Controlling the Tracing Process

You can control the tracing process by passing options to the `trace` function:

```ts
import { trace } from 'ts-potrace'

const options = {
  threshold: 128, // Threshold for black/white classification (0-255)
  turdSize: 2, // Suppress speckles of this size
  optCurve: true, // Optimize curves
  alphaMax: 1, // Corner threshold parameter
  optTolerance: 0.2, // Curve optimization tolerance
}

trace('input.png', options, (err, svg) => {
  if (err)
    throw err
  console.log(svg)
})
```

## Using the Potrace Class Directly

For more control, you can use the `Potrace` class directly:

```ts
import { Potrace } from 'ts-potrace'

// Create a new Potrace instance with custom options
const potrace = new Potrace({
  turdSize: 5,
  alphaMax: 0.7,
})

// Load an image
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG output
  const svg = potrace.getSVG()

  // Do something with the SVG...
})
```

## Supported Image Formats

ts-potrace supports any image format that can be loaded by Jimp, including:

- PNG
- JPEG
- BMP
- TIFF
- GIF (first frame only)

You can also provide a Buffer or a Jimp instance directly if you've already loaded the image through other means.
