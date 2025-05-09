# API Reference

This page provides detailed documentation for the ts-potrace API.

## Main API Functions

### `trace()`

Simplified API for tracing an image.

```ts
function trace(
  file: string | Buffer | any, // Jimp instance
  options?: PotraceOptions | TraceCallback,
  cb?: TraceCallback
): void
```

**Parameters:**
- `file`: The image to trace. Can be a file path, Buffer, or Jimp instance.
- `options`: (Optional) Either tracing options or a callback function.
- `cb`: Callback function receiving `(err, svg, instance)`.

**Example:**
```ts
import { trace } from 'ts-potrace'

trace('input.png', (err, svg) => {
  if (err)
    throw err
  console.log(svg) // SVG output
})

// With options
trace('input.png', { turdSize: 5, optCurve: true }, (err, svg) => {
  if (err)
    throw err
  console.log(svg)
})
```

### `posterize()`

Simplified API for posterizing an image (multi-level tracing).

```ts
function posterize(
  file: string | Buffer | any, // Jimp instance
  options?: PosterizerOptions | PosterizeCallback,
  cb?: PosterizeCallback
): void
```

**Parameters:**
- `file`: The image to posterize. Can be a file path, Buffer, or Jimp instance.
- `options`: (Optional) Either posterizing options or a callback function.
- `cb`: Callback function receiving `(err, svg, instance)`.

**Example:**
```ts
import { posterize } from 'ts-potrace'

posterize('input.png', (err, svg) => {
  if (err)
    throw err
  console.log(svg) // SVG output with multiple color levels
})

// With options
posterize('input.png', { steps: 5, fillStrategy: 'dominant' }, (err, svg) => {
  if (err)
    throw err
  console.log(svg)
})
```

## Classes

### Potrace

The main class for bitmap tracing.

```ts
class Potrace {
  constructor(options?: PotraceOptions)

  // Methods
  setParameters(params: PotraceOptions): Potrace
  loadImage(source: string | Buffer | any, callback: (err?: Error) => void): void
  getSVG(): string
  getPathTag(): string
  getSymbol(id: string): string
}
```

**Constructor options:**
```ts
interface PotraceOptions {
  turnPolicy?: 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority'
  turdSize?: number
  alphaMax?: number
  optCurve?: boolean
  optTolerance?: number
  threshold?: number
  blackOnWhite?: boolean
  color?: string
  background?: string
  width?: number | null
  height?: number | null
}
```

**Methods:**
- `setParameters(params)`: Updates the Potrace parameters.
- `loadImage(source, callback)`: Loads an image for processing.
- `getSVG()`: Gets the complete SVG output.
- `getPathTag()`: Gets just the path element (without the SVG wrapper).
- `getSymbol(id)`: Gets the path as an SVG symbol with the given ID.

**Example:**
```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  turdSize: 5,
  alphaMax: 1,
  optCurve: true,
})

potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG
  const svg = potrace.getSVG()
  console.log(svg)

  // Or just the path
  const path = potrace.getPathTag()
  console.log(path)
})
```

### Posterizer

Class for multi-level bitmap tracing (posterization).

```ts
class Posterizer {
  constructor(options?: PosterizerOptions)

  // Methods
  setParameters(params: PosterizerOptions): Posterizer
  loadImage(source: string | Buffer | any, callback: (err?: Error) => void): void
  getSVG(): string
  getSymbol(id: string): string
}
```

**Constructor options:**
```ts
interface PosterizerOptions extends PotraceOptions {
  steps?: number | number[]
  fillStrategy?: 'spread' | 'dominant' | 'median' | 'mean'
  rangeDistribution?: 'auto' | 'equal'
}
```

**Methods:**
- `setParameters(params)`: Updates the Posterizer parameters.
- `loadImage(source, callback)`: Loads an image for processing.
- `getSVG()`: Gets the complete SVG output with multiple layers.
- `getSymbol(id)`: Gets the paths as an SVG symbol with the given ID.

**Example:**
```ts
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  steps: 5,
  fillStrategy: 'dominant',
  rangeDistribution: 'auto',
  background: '#ffffff',
})

posterizer.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get the SVG with multiple color levels
  const svg = posterizer.getSVG()
  console.log(svg)
})
```

## Constants

### Potrace Constants

```ts
// Turn policies
Potrace.TURNPOLICY_BLACK = 'black'
Potrace.TURNPOLICY_WHITE = 'white'
Potrace.TURNPOLICY_LEFT = 'left'
Potrace.TURNPOLICY_RIGHT = 'right'
Potrace.TURNPOLICY_MINORITY = 'minority'
Potrace.TURNPOLICY_MAJORITY = 'majority'

// Special color values
Potrace.COLOR_AUTO = 'auto'
Potrace.COLOR_TRANSPARENT = 'transparent'

// Auto threshold
Potrace.THRESHOLD_AUTO = -1
```

### Posterizer Constants

```ts
// Fill strategies
Posterizer.FILL_SPREAD = 'spread'
Posterizer.FILL_DOMINANT = 'dominant'
Posterizer.FILL_MEDIAN = 'median'
Posterizer.FILL_MEAN = 'mean'

// Range distribution
Posterizer.RANGES_AUTO = 'auto'
Posterizer.RANGES_EQUAL = 'equal'

// Auto steps
Posterizer.STEPS_AUTO = -1
```

## Types

### TraceCallback

```ts
type TraceCallback = (
  err: Error | null,
  svg?: string,
  instance?: Potrace
) => void
```

### PosterizeCallback

```ts
type PosterizeCallback = (
  err: Error | null,
  svg?: string,
  instance?: Posterizer
) => void
```

### TurnPolicy

```ts
type TurnPolicy =
  | 'black'
  | 'white'
  | 'left'
  | 'right'
  | 'minority'
  | 'majority'
```

### FillStrategy

```ts
type FillStrategy = 'spread' | 'dominant' | 'median' | 'mean'
```

### RangeDistribution

```ts
type RangeDistribution = 'auto' | 'equal'
```

## Default Parameters

### Potrace Default Parameters

```ts
{
  turnPolicy: 'minority',
  turdSize: 2,
  alphaMax: 1,
  optCurve: true,
  optTolerance: 0.2,
  threshold: -1, // Auto
  blackOnWhite: true,
  color: 'auto',
  background: 'transparent',
  width: null,
  height: null,
}
```

### Posterizer Default Parameters

```ts
{
  // All Potrace defaults, plus:
  steps: -1, // Auto
  fillStrategy: 'dominant',
  rangeDistribution: 'auto',
}
```

## Error Handling

All functions that accept callbacks follow the Node.js error-first callback pattern:

```ts
import { trace } from 'ts-potrace'

trace('input.png', (err, svg) => {
  if (err) {
    console.error('An error occurred:', err.message)
    return
  }

  console.log('SVG generated successfully')
})
```

Common errors include:
- File not found
- Unsupported file format
- Memory limitations for large images
- Invalid parameters
