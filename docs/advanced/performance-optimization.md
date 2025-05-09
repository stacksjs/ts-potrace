# Performance Optimization

ts-potrace is designed to be efficient, but tracing complex images can be resource-intensive. This guide provides strategies for optimizing performance when working with ts-potrace.

## Input Image Optimization

The size and complexity of the input image significantly affects processing time:

### Resize Before Tracing

For large images, consider resizing before tracing:

```ts
import Jimp from 'jimp'
import { Potrace } from 'ts-potrace'

// Load image with Jimp
Jimp.read('large-image.jpg')
  .then((image) => {
    // Resize to a more manageable size
    const resized = image.resize(800, Jimp.AUTO)

    // Create a new Potrace instance
    const potrace = new Potrace()

    // Load the resized image
    potrace.loadImage(resized, (err) => {
      if (err)
        throw err
      const svg = potrace.getSVG()
      console.log(svg)
    })
  })
  .catch((err) => {
    console.error(err)
  })
```

### Pre-process Images to Reduce Noise

Applying a blur or other filters before tracing can make processing faster and result in cleaner output:

```ts
import Jimp from 'jimp'
import { Potrace } from 'ts-potrace'

Jimp.read('noisy-image.jpg')
  .then((image) => {
    // Apply a slight blur to reduce noise
    const processed = image.blur(1)

    const potrace = new Potrace()
    potrace.loadImage(processed, (err) => {
      if (err)
        throw err
      const svg = potrace.getSVG()
      console.log(svg)
    })
  })
  .catch((err) => {
    console.error(err)
  })
```

## Parameter Tuning for Performance

Certain parameters significantly impact processing time:

### Increase turdSize

Increasing the `turdSize` parameter can drastically improve performance by eliminating small features that take time to process:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  turdSize: 10, // Eliminate small features (default: 2)
})
```

### Adjust Optimization Tolerance

For faster processing at the cost of some fidelity:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  optCurve: true,
  optTolerance: 0.5, // Higher tolerance = faster but less precise (default: 0.2)
})
```

## Batch Processing Strategies

When processing multiple images:

### Sequential Processing with Reused Instance

```ts
import fs from 'node:fs'
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()
const imageFiles = ['image1.png', 'image2.png', 'image3.png']
const results = []

function processNext(index) {
  if (index >= imageFiles.length) {
    console.log('All images processed')
    return
  }

  potrace.loadImage(imageFiles[index], (err) => {
    if (err) {
      console.error(`Error processing ${imageFiles[index]}:`, err)
    }
    else {
      const svg = potrace.getSVG()
      results.push(svg)
      fs.writeFileSync(`output${index}.svg`, svg)
    }

    // Process next image
    processNext(index + 1)
  })
}

// Start processing
processNext(0)
```

### Promise-based Parallel Processing

For Node.js environments with multiple cores, you might want to process images in parallel:

```ts
import fs from 'node:fs'
import { Potrace } from 'ts-potrace'

const imageFiles = ['image1.png', 'image2.png', 'image3.png']

// Function to process a single image
function processImage(file) {
  return new Promise((resolve, reject) => {
    const potrace = new Potrace()
    potrace.loadImage(file, (err) => {
      if (err)
        reject(err)
      else resolve(potrace.getSVG())
    })
  })
}

// Process all images in parallel
Promise.all(imageFiles.map(processImage))
  .then((results) => {
    results.forEach((svg, i) => {
      fs.writeFileSync(`output${i}.svg`, svg)
    })
    console.log('All images processed')
  })
  .catch((err) => {
    console.error('Error:', err)
  })
```

## Memory Management

For very large images or batch processing, memory management becomes important:

```ts
import fs from 'node:fs'
import { Potrace } from 'ts-potrace'

function processBatch(imageFiles, batchSize = 5) {
  let currentBatch = 0

  function processNextBatch() {
    const batch = imageFiles.slice(
      currentBatch * batchSize,
      (currentBatch + 1) * batchSize
    )

    if (batch.length === 0) {
      console.log('All batches processed')
      return
    }

    Promise.all(batch.map((file) => {
      return new Promise((resolve, reject) => {
        const potrace = new Potrace()
        potrace.loadImage(file, (err) => {
          if (err) {
            reject(err)
          }
          else {
            const svg = potrace.getSVG()
            fs.writeFileSync(`output_${file.replace(/\.[^/.]+$/, '')}.svg`, svg)
            resolve()
          }
        })
      })
    }))
      .then(() => {
        currentBatch++
        // Force garbage collection if available (Node.js with --expose-gc flag)
        if (global.gc)
          global.gc()
        processNextBatch()
      })
      .catch((err) => {
        console.error('Batch error:', err)
      })
  }

  processNextBatch()
}

// Usage
const allImages = fs.readdirSync('./images')
  .filter(file => /\.(png|jpg|gif)$/i.test(file))
  .map(file => `./images/${file}`)

processBatch(allImages, 10)
```

## SVG Output Size Optimization

Optimizing SVG output can dramatically reduce file sizes:

```ts
import { optimize } from 'svgo' // You'll need to install this package
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  optCurve: true,
  optTolerance: 0.3, // Balance between size and quality
})

potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG output
  const svg = potrace.getSVG()

  // Optimize the SVG (requires svgo package)
  const optimizedSvg = optimize(svg, {
    plugins: [
      'cleanupAttrs',
      'removeDoctype',
      'removeXMLProcInst',
      'removeComments',
      'removeMetadata',
      'removeEditorsNSData',
      'removeViewBox',
      'minifyStyles',
      'convertStyleToAttrs',
      'removeUselessDefs',
      'cleanupIDs',
      'convertPathData',
    ]
  }).data

  // The optimizedSvg will be significantly smaller
  console.log('Original size:', svg.length)
  console.log('Optimized size:', optimizedSvg.length)
})
```
