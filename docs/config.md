# Configuration

ts-potrace provides extensive configuration options to customize the tracing process. This page documents all available options for both the `Potrace` and `Posterizer` classes.

## Potrace Options

The `Potrace` class and `trace` function accept the following configuration options:

```ts
interface PotraceOptions {
  turnPolicy?: TurnPolicy // How to resolve ambiguous paths
  turdSize?: number // Min area to include
  alphaMax?: number // Corner threshold
  optCurve?: boolean // Enable curve optimization
  optTolerance?: number // Curve optimization tolerance
  threshold?: number // Binarization threshold
  blackOnWhite?: boolean // Trace dark areas vs light areas
  color?: string // Fill color
  background?: string // Background color
  width?: number | null // Output width
  height?: number | null // Output height
}

type TurnPolicy = 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority'
```

### Option Details

#### turnPolicy

Controls how to resolve ambiguities during path decomposition:

- `'black'`: Darkest path at each ambiguous point
- `'white'`: Lightest path at each ambiguous point
- `'left'`: Always take a left turn
- `'right'`: Always take a right turn
- `'minority'`: Choose the color (black or white) that occurs least frequently
- `'majority'`: Choose the color (black or white) that occurs most frequently

Default: `'minority'`

#### turdSize

Specifies the minimum area (in pixels) of a path to be included in the output. Smaller areas will be filtered out. This is useful for removing specks and noise.

Default: `2`

#### alphaMax

Controls how aggressively corners are optimized. Lower values make more corners and sharper angles; higher values create smoother paths with fewer corners.

Default: `1`

#### optCurve

When enabled, potrace tries to optimize the Bezier curves that it generates.

Default: `true`

#### optTolerance

Controls the precision of curve optimization. Lower values create more accurate but potentially more complex paths; higher values create simpler paths that might deviate more from the original bitmap.

Default: `0.2`

#### threshold

The threshold for bitmap conversion:
- Values from 0-255 specify a fixed threshold
- Special value `-1` (or `Potrace.THRESHOLD_AUTO`) uses automatic thresholding based on image content

Default: `-1` (automatic)

#### blackOnWhite

Specifies which parts of the image to trace:
- `true`: Trace dark areas on a light background
- `false`: Trace light areas on a dark background

Default: `true`

#### color

The fill color for the traced paths:
- CSS color string (hex, rgb, named colors, etc.)
- Special value `'auto'` (or `Potrace.COLOR_AUTO`) tries to pick an appropriate color based on the image

Default: `'auto'`

#### background

The background color for the SVG:
- CSS color string (hex, rgb, named colors, etc.)
- Special value `'transparent'` (or `Potrace.COLOR_TRANSPARENT`) creates a transparent background

Default: `'transparent'`

#### width and height

Control the dimensions of the output SVG:
- Specific numbers set exact pixel dimensions
- `null` preserves the original size (for `width`) or maintains aspect ratio (for `height` when `width` is specified)

Default: `null` for both (preserves original dimensions)

## Posterizer Options

The `Posterizer` class and `posterize` function accept all the options from `PotraceOptions` plus these additional options:

```ts
interface PosterizerOptions extends PotraceOptions {
  steps?: number | number[] // Number of color levels or custom thresholds
  fillStrategy?: FillStrategy // How to choose colors for each level
  rangeDistribution?: RangeDistribution // How to distribute color ranges
}

type FillStrategy = 'spread' | 'dominant' | 'median' | 'mean'
type RangeDistribution = 'auto' | 'equal'
```

### Posterizer-Specific Options

#### steps

Controls the number of color levels in the output:
- Number between 2-255: Creates that many evenly distributed levels
- Array of numbers: Explicit thresholds to use for levels
- Special value `-1` (or `Posterizer.STEPS_AUTO`): Automatically determines optimal number of steps

Default: `-1` (automatic)

#### fillStrategy

Determines how colors are chosen for each level:
- `'spread'` (or `Posterizer.FILL_SPREAD`): Distributes colors evenly across the range
- `'dominant'` (or `Posterizer.FILL_DOMINANT`): Uses most frequent color in each range
- `'median'` (or `Posterizer.FILL_MEDIAN`): Uses median color in each range
- `'mean'` (or `Posterizer.FILL_MEAN`): Uses average color in each range

Default: `'dominant'`

#### rangeDistribution

Controls how color ranges are distributed:
- `'auto'` (or `Posterizer.RANGES_AUTO`): Analyzes image content to optimize ranges
- `'equal'` (or `Posterizer.RANGES_EQUAL`): Divides color space into equal sections

Default: `'auto'`

## Configuration Examples

### Basic Bitmap Tracing

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  turdSize: 5, // Remove small areas
  optCurve: true, // Optimize curves
  threshold: 128, // Fixed threshold (128 is middle gray)
  color: '#3498db', // Blue fill
  background: 'white', // White background
})
```

### High-Detail Tracing

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  turdSize: 1, // Keep small details
  alphaMax: 0.5, // More corners
  optTolerance: 0.1, // More precise curves
  threshold: -1, // Auto threshold
  blackOnWhite: true, // Trace dark areas
})
```

### Artistic Posterization

```ts
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  steps: 5, // 5 color levels
  fillStrategy: 'dominant', // Use dominant colors
  rangeDistribution: 'auto', // Analyze image for optimal ranges
  threshold: -1, // Auto threshold
  background: '#f8f9fa', // Light gray background
})
```

### Custom Color Levels

```ts
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  // Custom threshold levels
  steps: [50, 100, 150, 200],
  fillStrategy: 'mean',
  turdSize: 5,
})
```

## Updating Configuration

You can update the configuration of an existing instance using the `setParameters` method:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get SVG with default settings
  const defaultSvg = potrace.getSVG()

  // Update parameters and get new SVG without reloading the image
  potrace.setParameters({
    turdSize: 10,
    color: 'red',
  })

  // Get SVG with new settings
  const updatedSvg = potrace.getSVG()
})
```
