# Posterization

Posterization is an advanced feature in ts-potrace that allows you to create vector graphics with multiple color levels, giving a more detailed representation of the original image compared to simple black and white tracing.

## What is Posterization?

Posterization is a technique that:

1. Divides the image into multiple color ranges or "steps"
2. Traces each range separately with different threshold values
3. Combines the traced paths into a layered SVG where each layer represents a different color intensity
4. Results in a vector image that retains some of the tonal range of the original

## Basic Usage

You can use the `posterize` function to create a posterized vector image:

```ts
import fs from 'node:fs'
import { posterize } from 'ts-potrace'

posterize('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output.svg', svg)
})
```

## Customizing Posterization

The `Posterizer` class provides many options to customize the output:

```ts
import fs from 'node:fs'
import { Posterizer } from 'ts-potrace'

// Create a new Posterizer instance with custom options
const posterizer = new Posterizer({
  // Number of color steps (2-255)
  steps: 5,

  // Fill strategy for color ranges
  fillStrategy: 'dominant', // 'spread', 'dominant', 'median', or 'mean'

  // Range distribution strategy
  rangeDistribution: 'auto', // 'auto' or 'equal'

  // Regular Potrace options also apply
  turdSize: 3,
  alphaMax: 1,
  optCurve: true,
})

// Load an image
posterizer.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG output
  const svg = posterizer.getSVG()
  fs.writeFileSync('output.svg', svg)
})
```

## Fill Strategies

ts-potrace offers several fill strategies for controlling how colors are chosen for each level:

- **Spread**: Distributes colors evenly across the range
- **Dominant**: Uses the most frequently occurring color in each range
- **Median**: Uses the median color value in each range
- **Mean**: Uses the average color value in each range

## Range Distribution

Two distribution modes are available:

- **Auto**: Analyzes the image histogram and creates ranges that capture the image's distinct tonal areas
- **Equal**: Distributes the ranges equally across the color spectrum

## Example: Creating a Stylized Portrait

Posterization is particularly effective for creating stylized portraits or illustrations:

```ts
import fs from 'node:fs'
import { posterize } from 'ts-potrace'

const options = {
  steps: 7,
  fillStrategy: 'dominant',
  rangeDistribution: 'auto',
  blackOnWhite: true,
  background: '#f0f0f0',
}

posterize('portrait.jpg', options, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('stylized-portrait.svg', svg)
})
```

The resulting SVG will contain multiple layers, each with a different fill color, creating a stylized vector version of the original photograph.
