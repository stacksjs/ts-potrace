# SVG Generation

ts-potrace excels at generating clean, optimized SVG (Scalable Vector Graphics) output from bitmap images, making it perfect for creating resolution-independent graphics for web and print applications.

## SVG Output Features

The SVG output from ts-potrace has several key characteristics:

- **Optimized Paths**: Smooth, simplified paths that accurately represent the original image
- **Scalability**: Can be rendered at any size without loss of quality
- **Small File Size**: Efficiently encoded paths reduce file size
- **Styling Options**: Various options for colors and background
- **Standards Compliant**: Valid SVG output compatible with all modern browsers and vector editing software

## Basic SVG Output

To get SVG output from a traced image:

```ts
import { trace } from 'ts-potrace'

trace('input.png', (err, svg) => {
  if (err)
    throw err

  // 'svg' contains the full SVG document as a string
  console.log(svg)
})
```

## Customizing SVG Output

You can customize the SVG output by setting various parameters:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  // SVG-specific options
  color: '#3498db', // Fill color for the traced paths
  background: '#f1f1f1', // Background color

  // Size options
  width: 800, // Width of the output SVG
  height: null, // Height (null maintains aspect ratio)
})

potrace.loadImage('input.png', (err) => {
  if (err)
    throw err
  const svg = potrace.getSVG()
  console.log(svg)
})
```

## SVG Output Methods

The `Potrace` and `Posterizer` classes provide several methods for getting SVG content:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the full SVG document
  const fullSvg = potrace.getSVG()

  // Get just the path tag (useful for embedding in existing SVGs)
  const pathTag = potrace.getPathTag()

  // Get a symbol element with a specific ID
  const symbol = potrace.getSymbol('my-icon')
})
```

## Combining with Other SVG Tools

The output from ts-potrace can be easily integrated with other SVG processing tools:

```ts
import fs from 'node:fs'
import { optimize } from 'svgo' // Example of another SVG tool
import { trace } from 'ts-potrace'

trace('input.png', (err, svg) => {
  if (err)
    throw err

  // Further optimize the SVG (example)
  const optimizedSvg = optimize(svg).data

  // Save the optimized SVG
  fs.writeFileSync('output.svg', optimizedSvg)
})
```

## Using in Web Applications

The SVG output can be used directly in web applications:

```typescript
// In a web application
import { trace } from 'ts-potrace'

// Example: Convert an uploaded image to SVG
function convertToSVG(imageFile) {
  return new Promise((resolve, reject) => {
    trace(imageFile, (err, svg) => {
      if (err)
        reject(err)
      else resolve(svg)
    })
  })
}

// Then use the SVG in your HTML
async function displaySVG(imageFile) {
  try {
    const svg = await convertToSVG(imageFile)
    document.getElementById('svg-container').innerHTML = svg
  }
  catch (err) {
    console.error('Error converting to SVG:', err)
  }
}
```

## SVG Accessibility

When using the SVG output in web projects, consider adding accessibility attributes:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  let svg = potrace.getSVG()

  // Add accessibility attributes (manually or with a parsing library)
  svg = svg.replace('<svg ', '<svg aria-label="Description of the image" role="img" ')
})
```
