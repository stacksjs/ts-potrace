# Custom Parameters

ts-potrace offers a comprehensive set of parameters that allow fine-grained control over the tracing process. Understanding and tuning these parameters can help you achieve the exact results you need for your specific use cases.

## Potrace Parameters Reference

The `Potrace` class accepts the following parameters:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  // Core tracing parameters
  turnPolicy: 'minority', // 'black', 'white', 'left', 'right', 'minority', 'majority'
  turdSize: 2, // Suppress speckles of this size (default: 2)
  alphaMax: 1, // Corner threshold parameter (default: 1)
  optCurve: true, // Optimize curves (default: true)
  optTolerance: 0.2, // Curve optimization tolerance (default: 0.2)
  threshold: -1, // Threshold for black/white classification, -1 for auto (default: -1)
  blackOnWhite: true, // Default trace dark areas (default: true)

  // SVG output parameters
  color: 'auto', // Fill color (default: 'auto')
  background: 'transparent', // Background color (default: 'transparent')

  // Output size parameters
  width: null, // Output width (default: null = original size)
  height: null, // Output height (default: null = maintain aspect ratio)
})
```

## Parameter Deep Dive

### Turn Policy

The `turnPolicy` parameter determines how to resolve ambiguities in path decomposition:

- `'black'`: Prefers to connect black (filled) components
- `'white'`: Prefers to connect white (unfilled) components
- `'left'`: Always take a left turn
- `'right'`: Always take a right turn
- `'minority'`: Prefers to connect the color (black or white) that occurs least frequently (default)
- `'majority'`: Prefers to connect the color (black or white) that occurs most frequently

```ts
// Example: Optimizing for thin lines in a technical drawing
const technicalDrawing = new Potrace({
  turnPolicy: 'minority',
  turdSize: 1, // Keep even small details
})

// Example: Optimizing for solid shapes
const solidShapes = new Potrace({
  turnPolicy: 'majority',
  turdSize: 5, // Remove small noise
})
```

### Turd Size

The `turdSize` parameter (named after the original Potrace parameter) controls the minimum size of features to be included:

```ts
// Keep all details, including noise (may increase file size)
const detailedTrace = new Potrace({
  turdSize: 0,
})

// Remove small noise for cleaner output
const cleanTrace = new Potrace({
  turdSize: 5,
})
```

### Alpha Max

The `alphaMax` parameter controls how sharp corners are optimized:

```ts
// Preserve sharp corners
const sharp = new Potrace({
  alphaMax: 0.5,
})

// Allow more rounding of corners
const smooth = new Potrace({
  alphaMax: 2,
})
```

### Optimization Parameters

The `optCurve` and `optTolerance` parameters control curve optimization:

```ts
// Maximum fidelity to original bitmap (may increase file size)
const exactTrace = new Potrace({
  optCurve: false,
})

// Smooth, simplified curves
const smoothTrace = new Potrace({
  optCurve: true,
  optTolerance: 0.2, // Default
})

// Even smoother, more simplified curves
const verySmooth = new Potrace({
  optCurve: true,
  optTolerance: 0.8,
})
```

## Posterizer-Specific Parameters

The `Posterizer` class extends the Potrace parameters with additional options:

```ts
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  // All Potrace parameters plus:
  steps: 5, // Number of color levels (2-255)
  fillStrategy: 'dominant', // How colors are selected
  rangeDistribution: 'auto', // How ranges are distributed
})
```

## Dynamic Parameter Adjustment

You can update parameters on an existing instance:

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()

// Load an image
potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get initial SVG
  const initialSvg = potrace.getSVG()

  // Adjust parameters and get new SVG without reloading the image
  potrace.setParameters({
    turdSize: 5,
    optTolerance: 0.5,
    color: 'red',
  })

  // Get new SVG with updated parameters
  const updatedSvg = potrace.getSVG()
})
```

## Finding Optimal Parameters

Finding the right parameters often requires experimentation. Here's a systematic approach:

1. Start with default parameters and observe the results
2. Adjust the `threshold` if the initial black/white separation is incorrect
3. Increase `turdSize` to remove noise or small details
4. Adjust `alphaMax` to control corner sharpness
5. Fine-tune with `optTolerance` for path simplification

For posterization:
1. Start with 3-5 `steps` and observe color separation
2. Try different `fillStrategy` values to see which gives best results
3. Compare `auto` vs `equal` range distribution
