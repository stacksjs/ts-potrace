<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-potrace

A TypeScript port of [Potrace][potrace] — a tool for tracing bitmaps.

| **Original image**        | **Potrace output**           | **Posterized output**                   |
|---------------------------|------------------------------|-----------------------------------------|
| ![](test/sources/yao.jpg) | ![](test/example-output.svg) | ![](test/example-output-posterized.svg) |

_(Example image inherited from [online demo of the browser version][potrace-js-demo])_

## Usage

Install

```sh
npm install ts-potrace
bun install ts-potrace
```

Basic usage

```ts
import { Potrace } from 'ts-potrace'

const potrace = new Potrace()

potrace.trace('./path/to/image.png', (err, svg) => {
  if (err)
    throw err
  fs.writeFileSync('./output.svg', svg)
})
```

You can also provide a configuration object as a second argument.

```ts
const params = {
  background: '#49ffd2',
  color: 'blue',
  threshold: 120
}

potrace.trace('./path/to/image.png', params, (err, svg) => {
  /* ... */
})
```

If you want to run Potrace algorithm multiple times on the same image with different threshold setting and merge results together in a single file - `posterize` method does exactly that.

```js
potrace.posterize('./path/to/image.png', { threshold: 180, steps: 4 }, (err, svg) => {
  /* ... */
})

// or if you know exactly where you want to break it on different levels

potrace.posterize('./path/to/image.png', { steps: [40, 85, 135, 180] }, (err, svg) => {
  /* ... */
})
```

### Advanced usage and configuration

Both `trace` and `posterize` methods return instances of `Potrace` and `Posterizer` classes respectively to a callback function as third argument.

You can also instantiate these classes directly:

```ts
import { Posterize, Potrace } from 'ts-potrace'

// Tracing

const potrace = new Potrace()

// You can also pass configuration object to the constructor
trace.setParameters({
  threshold: 128,
  color: '#880000'
})

trace.loadImage('path/to/image.png', (err) => {
  if (err)
    throw err

  trace.getSVG() // returns SVG document contents
  trace.getPathTag() // will return just <path> tag
  trace.getSymbol('traced-image') // will return <symbol> tag with given ID
})

// Posterization

const posterizer = new Posterize()

posterizer.loadImage('path/to/image.png', (err) => {
  if (err)
    throw err

  posterizer.setParameter({
    color: '#ccc',
    background: '#222',
    steps: 3,
    threshold: 200,
    fillStrategy: Posterize.FILL_MEAN
  })

  posterizer.getSVG()
  // or
  posterizer.getSymbol('posterized-image')
})
```

Callback function provided to `loadImage` methods will be executed in context of the `Potrace`/`Posterizer` instance, so if it doesn't go against your code style - you can just do

```js
new potrace.Potrace()
  .loadImage('path/to/image.bmp', function () {
    if (err)
      throw err
    this.getSymbol('foo')
  })
```

[Jimp module][jimp] is used on the back end, so first argument accepted by `loadImage` method could be anything Jimp can read: a `Buffer`, local path or a url string. Supported formats are: PNG, JPEG or BMP. It also could be a Jimp instance (provided bitmap is not modified)

### Parameters

`Potrace` class expects following parameters:

- **turnPolicy** - how to resolve ambiguities in path decomposition. Possible values are exported as constants: `TURNPOLICY_BLACK`, `TURNPOLICY_WHITE`, `TURNPOLICY_LEFT`, `TURNPOLICY_RIGHT`, `TURNPOLICY_MINORITY`, `TURNPOLICY_MAJORITY`. Refer to [this document][potrace-algorithm] for more information (page 4)
  (default: `TURNPOLICY_MINORITY`)
- **turdSize** - suppress speckles of up to this size
  (default: 2)
- **alphaMax** - corner threshold parameter
  (default: 1)
- **optCurve** - curve optimization
  (default: true)
- **optTolerance** - curve optimization tolerance
  (default: 0.2)
- **threshold** - threshold below which color is considered black.
  Should be a number in range 0..255 or `THRESHOLD_AUTO` in which case threshold will be selected automatically using [Algorithm For Multilevel Thresholding][multilevel-thresholding]
  (default: `THRESHOLD_AUTO`)
- **blackOnWhite** - specifies colors by which side from threshold should be turned into vector shape
  (default: `true`)
- **color** - Fill color. Will be ignored when exporting as \<symbol\>. (default: `COLOR_AUTO`, which means black or white, depending on `blackOnWhite` property)
- **background** - Background color. Will be ignored when exporting as \<symbol\>. By default is not present (`COLOR_TRANSPARENT`)

---------------

`Posterizer` class has same methods as `Potrace`, in exception of `.getPathTag()`.
Configuration object is extended with following properties:

- **fillStrategy** - determines how fill color for each layer should be selected. Possible values are exported as constants:
    - `FILL_DOMINANT` - most frequent color in range (used by default),
    - `FILL_MEAN` - arithmetic mean (average),
    - `FILL_MEDIAN` - median color,
    - `FILL_SPREAD` - ignores color information of the image and just spreads colors equally in range 0..\<threshold\> (or \<threshold\>..255 if `blackOnWhite` is set to `false`),
- **rangeDistribution** - how color stops for each layer should be selected. Ignored if `steps` is an array. Possible values are:
    - `RANGES_AUTO` - Performs automatic thresholding (using [Algorithm For Multilevel Thresholding][multilevel-thresholding]). Preferable method for already posterized sources, but takes long time to calculate 5 or more thresholds (exponential time complexity)
      *(used by default)*
    - `RANGES_EQUAL` - Ignores color information of the image and breaks available color space into equal chunks
- **steps** - Specifies desired number of layers in resulting image. If a number provided - thresholds for each layer will be automatically calculated according to `rangeDistribution` parameter. If an array provided it expected to be an array with precomputed thresholds for each layer (in range 0..255)
  (default: `STEPS_AUTO` which will result in `3` or `4`, depending on `threshold` value)
- **threshold** - Breaks image into foreground and background (and only foreground being broken into desired number of layers). Basically when provided it becomes a threshold for last (least opaque) layer and then `steps - 1` intermediate thresholds calculated. If **steps** is an array of thresholds and every value from the array is lower (or larger if **blackOnWhite** parameter set to `false`) than threshold - threshold will be added to the array, otherwise just ignored.
  (default: `Potrace.THRESHOLD_AUTO`)
- *all other parameters that Potrace class accepts*

**Notes:**

- When number of `steps` is greater than 10 - an extra layer could be added to ensure presence of darkest/brightest colors if needed to ensure presence of probably-important-at-this-point details like shadows or line art.
- With big number of layers produced image will be looking brighter overall than original due to math error at the rendering phase because of how layers are composited.
- With default configuration `steps`, `threshold` and `rangeDistribution` settings all set to auto, resulting in a 4 thresholds/color stops being calculated with Multilevel Thresholding algorithm mentioned above. Calculation of 4 thresholds takes 3-5 seconds on average laptop. You may want to explicitly limit number of `steps` to 3 to moderately improve processing speed.

## Credits

- `node-potrace` - for the inspiration of this project
- Peter Selinger - for the [original Potrace tool and algorithm][potrace]
- @kilobtye - for the [javascript port][potrace-by-kilobtye]

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/ts-potrace/releases) page for more information on what has changed recently.

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
