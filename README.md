<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-potrace

A TypeScript implementation of [Potrace][potrace] — a tool for transforming bitmap images into scalable vector graphics.

## Features

- **Bitmap Tracing**: Convert raster images to clean SVG vector paths
- **Posterization**: Create multi-level color traces for more detailed output
- **High-Quality Output**: Generate smooth, optimized vector graphics
- **Extensive Customization**: Fine-tune the tracing process with many options
- **TypeScript Support**: Fully typed API for better development experience
- **Platform Independent**: Works in Bun & Node.js environments

## Examples

| **Original image**        | **Potrace output**           | **Posterized output**                   |
|---------------------------|------------------------------|-----------------------------------------|
| ![](test/sources/yao.jpg) | ![](test/example-output.svg) | ![](test/example-output-posterized.svg) |

_(Example image inherited from [online demo of the browser version][potrace-js-demo])_

## Installation

```sh
# Using npm
npm install ts-potrace

# Using Bun
bun install ts-potrace

# Using pnpm
pnpm add ts-potrace

# Using Yarn
yarn add ts-potrace
```

## Quick Start

### Basic Tracing

```ts
import fs from 'node:fs'
import { trace } from 'ts-potrace'

// Simple tracing with default options
trace('input.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output.svg', svg)
})

// With custom options
trace('input.png', {
  background: '#f8f9fa',
  color: 'blue',
  threshold: 120
}, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('output-custom.svg', svg)
})
```

### Posterization

```ts
import fs from 'node:fs'
import { posterize } from 'ts-potrace'

// Create multi-level color trace
posterize('input.png', {
  steps: 5,
  fillStrategy: 'dominant'
}, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('posterized.svg', svg)
})

// With custom threshold levels
posterize('input.png', {
  steps: [40, 85, 135, 180]
}, (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('custom-levels.svg', svg)
})
```

## Advanced Usage

### Using the Potrace Class Directly

```ts
import fs from 'node:fs'
import { Potrace } from 'ts-potrace'

const potrace = new Potrace({
  turdSize: 5,
  alphaMax: 1,
  optCurve: true,
  optTolerance: 0.2
})

potrace.loadImage('input.png', (err) => {
  if (err)
    throw err

  // Get full SVG document
  const svg = potrace.getSVG()
  fs.writeFileSync('output.svg', svg)

  // Get just the path element
  const path = potrace.getPathTag()
  console.log(path)

  // Get as SVG symbol with ID
  const symbol = potrace.getSymbol('traced-image')
  console.log(symbol)
})
```

### Using the Posterizer Class

```ts
import fs from 'node:fs'
import { Posterizer } from 'ts-potrace'

const posterizer = new Posterizer({
  steps: 4,
  fillStrategy: 'dominant',
  rangeDistribution: 'auto',
  background: '#ffffff'
})

posterizer.loadImage('input.png', (err) => {
  if (err)
    throw err

  posterizer.setParameters({
    color: '#333',
    background: '#f0f0f0',
  })

  // Get the SVG with multiple color levels
  const svg = posterizer.getSVG()
  fs.writeFileSync('posterized.svg', svg)

  // Get as SVG symbol with ID
  const symbol = posterizer.getSymbol('posterized-image')
  console.log(symbol)
})
```

## Configuration Parameters

### Potrace Parameters

- **turnPolicy** - How to resolve ambiguities in path decomposition
  - Options: `'black'`, `'white'`, `'left'`, `'right'`, `'minority'`, `'majority'`
  - Default: `'minority'`
- **turdSize** - Suppress speckles up to this size
  - Default: `2`
- **alphaMax** - Corner threshold parameter
  - Default: `1`
- **optCurve** - Enable curve optimization
  - Default: `true`
- **optTolerance** - Curve optimization tolerance
  - Default: `0.2`
- **threshold** - Threshold for black/white classification
  - Range: `0-255` or `Potrace.THRESHOLD_AUTO` for automatic threshold detection
  - Default: `Potrace.THRESHOLD_AUTO`
- **blackOnWhite** - Trace dark areas on light background or vice versa
  - Default: `true`
- **color** - Fill color for the traced paths
  - Default: `'auto'`
- **background** - Background color
  - Default: `'transparent'`
- **width** / **height** - Output dimensions
  - Default: Original dimensions

### Posterizer Parameters

Includes all Potrace parameters plus:

- **steps** - Number of color levels or specific thresholds
  - Can be a number (2-255) or an array of threshold values
  - Default: Automatic (3 or 4 levels)
- **fillStrategy** - How colors are selected for each level
  - Options: `'dominant'`, `'mean'`, `'median'`, `'spread'`
  - Default: `'dominant'`
- **rangeDistribution** - How color ranges are distributed
  - Options: `'auto'`, `'equal'`
  - Default: `'auto'`

## Performance Notes

- With default configuration, posterization with 4+ thresholds can take 3-5 seconds on an average laptop due to the automatic thresholding algorithm.
- For better performance, consider:
  - Explicitly limiting `steps` to 3
  - Pre-resizing large images
  - Increasing `turdSize` to remove small details
  - Using `threshold` with a fixed value instead of automatic detection

## Credits

- `node-potrace` - for the inspiration of this project
- Peter Selinger - for the [original Potrace tool and algorithm][potrace]
- @kilobtye - for the [javascript port][potrace-by-kilobtye]

## Testing

```bash
bun test
```

## Documentation

For more detailed documentation, examples, and API references, check out our [documentation website](https://stacksjs.github.io/ts-potrace/).

## Changelog

Please see our [releases](https://github.com/stacksjs/ts-potrace/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-potrace/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-potrace?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-potrace
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-potrace/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-potrace/actions?query=workflow%3Aci
[potrace-algorithm]: http://potrace.sourceforge.net/potrace.pdf
[multilevel-thresholding]: http://www.iis.sinica.edu.tw/page/jise/2001/200109_01.pdf
[potrace-by-kilobtye]: https://github.com/kilobtye/potrace
[potrace-js-demo]: http://kilobtye.github.io/potrace/
[potrace]: http://potrace.sourceforge.net/
[jimp]: https://github.com/oliver-moran/jimp

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-potrace/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-p -->
