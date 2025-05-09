# Color Handling

ts-potrace provides flexible color handling capabilities that allow you to customize the appearance of your vector output. This includes foreground and background color control, color inversion, and multi-color support through posterization.

## Basic Color Options

Both `Potrace` and `Posterizer` classes accept color-related parameters:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  // Path fill color (CSS color string or 'auto')
  color: '#3498db',

  // Background color (CSS color string or 'transparent')
  background: '#f0f0f0',

  // Whether to trace dark areas (true) or light areas (false)
  blackOnWhite: true,
})
```

## Color Format Support

ts-potrace supports various CSS color formats:

- Hex codes: `#3498db`, `#f00`
- RGB/RGBA: `rgb(52, 152, 219)`, `rgba(52, 152, 219, 0.5)`
- HSL/HSLA: `hsl(204, 70%, 53%)`, `hsla(204, 70%, 53%, 0.5)`
- Named colors: `steelblue`, `tomato`, etc.
- Special values: `auto`, `transparent`

## Color Mode: Black on White vs White on Black

The `blackOnWhite` parameter controls which parts of the image are traced:

```ts
import { Potrace } from 'ts-potrace'

// Trace dark areas (default)
const normalTrace = new Potrace({
  blackOnWhite: true, // Default - traces dark areas of the image
})

// Trace light areas (inverted)
const invertedTrace = new Potrace({
  blackOnWhite: false, // Traces light areas of the image
})
```

## Auto Color Detection

When the `color` parameter is set to `'auto'`, ts-potrace will attempt to choose an appropriate color based on the image content:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  color: 'auto', // Will be determined from the image
})
```

## Transparent Backgrounds

You can create SVGs with transparent backgrounds:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  background: 'transparent', // Default value
})
```

## Advanced Color Handling with Posterization

For more sophisticated color handling, the `Posterizer` class offers advanced options:

```ts
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  // Create 5 color levels
  steps: 5,

  // Choose color fill strategy
  fillStrategy: 'dominant', // 'spread', 'dominant', 'median', 'mean'

  // Base foreground/background settings
  color: 'auto',
  background: 'white',
})
```

## Customizing Color Intensity in Posterization

The color intensity in posterized output is determined by several factors:

1. The number of steps
2. The fill strategy
3. The image's luminance distribution

You can control how aggressively colors are differentiated:

```ts
import { Posterizer } from 'ts-potrace'

// For subtle color variations
const subtlePosterizer = new Posterizer({
  steps: 3,
  fillStrategy: 'mean',
})

// For more pronounced color separation
const boldPosterizer = new Posterizer({
  steps: 8,
  fillStrategy: 'dominant',
})
```

## Working with Color-Critical Images

For applications where color accuracy is important:

```ts
import fs from 'node:fs'
import { Posterizer } from 'ts-potrace'

// Settings for better color reproduction
const posterizer = new Posterizer({
  steps: 10, // More steps for better color gradation
  fillStrategy: 'dominant', // Use most frequent colors
  rangeDistribution: 'auto', // Optimize ranges based on image content
})

posterizer.loadImage('color-critical.jpg', (err) => {
  if (err)
    throw err
  const svg = posterizer.getSVG()
  fs.writeFileSync('color-accurate.svg', svg)
})
```
