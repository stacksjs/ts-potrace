import type { posterizeCallback, traceCallback } from '../src'
import type Posterizer from '../src/Posterizer'
import type { Histogram } from '../src/types'

import { afterAll, beforeAll, describe, expect, it, spyOn, test } from 'bun:test'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// Import Jimp correctly
import { Jimp } from 'jimp'
// Import library modules
import * as lib from '../src'
import Potrace from '../src/Potrace'

// Define paths to test images - updated to use absolute paths
const PATH_TO_YAO = join(__dirname, 'sources/yao.jpg')
const PATH_TO_LENNA = join(__dirname, 'sources/Lenna.png')
const PATH_TO_BLACK_AND_WHITE_IMAGE = join(__dirname, 'sources/clouds.jpg')

// Define paths to reference SVG files
const REFS_PATH = join(__dirname, 'reference-copies')

// Create black and white test images
let blackImage: any
let whiteImage: any

// Helper function for assertions
function assert(condition: boolean, _message?: string): void {
  expect(condition).toBe(true)
}

// Custom before function for Bun test
function before(fn: () => Promise<void> | void): void {
  try {
    fn()
  }
  catch (e) {
    console.error('Error in before hook:', e)
  }
}

// Create test images with Jimp.read to avoid constructor issues
before(async () => {
  try {
    // Create blank images programmatically instead of using the constructor
    blackImage = await Jimp.read(PATH_TO_YAO) // Use an existing image
    blackImage.scan(0, 0, blackImage.bitmap.width, blackImage.bitmap.height, (x: number, y: number, idx: number) => {
      // Set all pixels to black
      blackImage.bitmap.data[idx] = 0
      blackImage.bitmap.data[idx + 1] = 0
      blackImage.bitmap.data[idx + 2] = 0
      blackImage.bitmap.data[idx + 3] = 255
    })

    whiteImage = await Jimp.read(PATH_TO_YAO) // Use an existing image
    whiteImage.scan(0, 0, whiteImage.bitmap.width, whiteImage.bitmap.height, (x: number, y: number, idx: number) => {
      // Set all pixels to white
      whiteImage.bitmap.data[idx] = 255
      whiteImage.bitmap.data[idx + 1] = 255
      whiteImage.bitmap.data[idx + 2] = 255
      whiteImage.bitmap.data[idx + 3] = 255
    })
  }
  catch (e) {
    console.error('Failed to create test images:', e)
  }
})

describe('Potrace', () => {
  const Potrace = lib.Potrace

  it('should export Potrace class in exports object', () => {
    assert(typeof lib.Potrace === 'function')
  })

  it('should export trace method', () => {
    assert(typeof lib.trace === 'function')
  })

  it('should export Posterizer', () => {
    assert(typeof lib.Posterizer === 'function')
  })

  it('should create an instance of Potrace', () => {
    const instance = new Potrace()
    assert(instance instanceof Potrace)
  })

  it('should create load an image', (done) => {
    const instance = new Potrace()
    instance.loadImage(PATH_TO_YAO, (err) => {
      assert(!err)
      done()
    })
  })

  it('should create throw an error if image is not found', (done) => {
    const instance = new Potrace()
    instance.loadImage('404.png', (err) => {
      assert(!!err)
      done()
    })
  })

  it('should generate SVG after tracing', (done) => {
    const instance = new Potrace()
    instance.loadImage(PATH_TO_YAO, () => {
      const svg = instance.getSVG()
      assert(svg.includes('<path'))
      done()
    })
  })

  it('should load image using trace function', (done) => {
    lib.trace(PATH_TO_LENNA, (err, svg, instance) => {
      assert(!err)
      assert(svg != null && svg.length > 0)
      assert(instance instanceof Potrace)
      done()
    })
  })

  it('should load image using posterize function', (done) => {
    lib.posterize(PATH_TO_BLACK_AND_WHITE_IMAGE, (err, svg, instance) => {
      assert(!err)
      assert(svg != null && svg.length > 0)
      assert(instance instanceof lib.Posterizer)
      done()
    })
  })

  it('should be able to load a Jimp image', (done) => {
    Jimp.read(PATH_TO_YAO)
      .then((image) => {
        const instance = new Potrace()
        instance.loadImage(image, (err) => {
          assert(!err)
          const svg = instance.getSVG()
          assert(svg.includes('<path'))
          done()
        })
      })
      .catch(err => done(err))
  })

  it('should be able to set parameters after initialization', () => {
    const instance = new Potrace({ background: '#CCC' })
    assert(instance.getSVG().includes('background="#CCC"'))

    instance.setParameters({ background: '#000' })
    assert(instance.getSVG().includes('background="#000"'))
  })

  it('should process black image', (done) => {
    const instance = new Potrace()
    instance.loadImage(blackImage, () => {
      // Black image should contain a totally white svg
      const svg = instance.getSVG()
      assert(!svg.includes('<path'))
      done()
    })
  })

  it('should process white image', (done) => {
    const instance = new Potrace({ blackOnWhite: false })
    instance.loadImage(whiteImage, () => {
      // Forcing white image to be treated as black on white should result in the same as above
      const svg = instance.getSVG()
      assert(!svg.includes('<path'))
      done()
    })
  })

  describe('#_processPath', () => {
    let instance: InstanceType<typeof Potrace>
    let processingSpy: any

    beforeAll(() => {
      instance = new Potrace()
      processingSpy = spyOn(Potrace.prototype, '_processPath')
    })

    it('should not execute until path is requested for the first time', (done) => {
      instance.loadImage(PATH_TO_YAO, function (this: InstanceType<typeof Potrace>) {
        expect(processingSpy).toHaveBeenCalledTimes(0)
        this.getSVG()
        expect(processingSpy).toHaveBeenCalledTimes(1)
        done()
      })
    })

    it('should not execute on repetitive SVG/Symbol export', (done) => {
      instance.loadImage(PATH_TO_YAO, function (this: InstanceType<typeof Potrace>) {
        const initialCallCount = processingSpy.mock.calls.length

        this.getSVG()
        this.getSVG()
        this.getPathTag()
        this.getPathTag('red')
        this.getSymbol('symbol-id')

        expect(processingSpy).toHaveBeenCalledTimes(initialCallCount)
        done()
      })
    })

    it('should not execute after change of foreground/background colors', (done) => {
      instance.loadImage(PATH_TO_YAO, function (this: InstanceType<typeof Potrace>) {
        const initialCallCount = processingSpy.mock.calls.length

        this.setParameters({ color: 'red' })
        this.getSVG()

        this.setParameters({ background: 'crimson' })
        this.getSVG()

        expect(processingSpy).toHaveBeenCalledTimes(initialCallCount)
        done()
      })
    })
  })

  describe('behaves predictably in edge cases', () => {
    let instance: InstanceType<typeof Potrace>

    let bwBlackThreshold0: string
    let bwBlackThreshold255: string
    let bwWhiteThreshold0: string
    let bwWhiteThreshold255: string
    let wbWhiteThreshold0: string
    let wbWhiteThreshold255: string
    let wbBlackThreshold0: string
    let wbBlackThreshold255: string

    beforeAll(() => {
      instance = new Potrace()

      bwBlackThreshold0 = readFileSync(join(REFS_PATH, 'potrace-bw-black-threshold-0.svg'), { encoding: 'utf8' })
      bwBlackThreshold255 = readFileSync(join(REFS_PATH, 'potrace-bw-black-threshold-255.svg'), { encoding: 'utf8' })
      bwWhiteThreshold0 = readFileSync(join(REFS_PATH, 'potrace-bw-white-threshold-0.svg'), { encoding: 'utf8' })
      bwWhiteThreshold255 = readFileSync(join(REFS_PATH, 'potrace-bw-white-threshold-255.svg'), { encoding: 'utf8' })

      wbWhiteThreshold0 = readFileSync(join(REFS_PATH, 'potrace-wb-white-threshold-0.svg'), { encoding: 'utf8' })
      wbWhiteThreshold255 = readFileSync(join(REFS_PATH, 'potrace-wb-white-threshold-255.svg'), { encoding: 'utf8' })
      wbBlackThreshold0 = readFileSync(join(REFS_PATH, 'potrace-wb-black-threshold-0.svg'), { encoding: 'utf8' })
      wbBlackThreshold255 = readFileSync(join(REFS_PATH, 'potrace-wb-black-threshold-255.svg'), { encoding: 'utf8' })
    })

    it('compares colors against threshold in the same way as original tool', (done) => {
      instance.loadImage(blackImage, (err: Error | null) => {
        if (err) { return done(err) }

        instance.setParameters({ blackOnWhite: true, threshold: 0 })
        expect(instance.getSVG()).toBe(bwBlackThreshold0)

        instance.setParameters({ blackOnWhite: true, threshold: 255 })
        expect(instance.getSVG()).toBe(bwBlackThreshold255)

        instance.loadImage(whiteImage, (innerErr: Error | null) => {
          if (innerErr) { return done(innerErr) }

          instance.setParameters({ blackOnWhite: true, threshold: 0 })
          expect(instance.getSVG()).toBe(bwWhiteThreshold0)

          instance.setParameters({ blackOnWhite: true, threshold: 255 })
          expect(instance.getSVG()).toBe(bwWhiteThreshold255)

          done()
        })
      })
    })

    it('acts in the same way when colors are inverted', (done) => {
      instance.loadImage(whiteImage, (err: Error | null) => {
        if (err) { return done(err) }

        instance.setParameters({ blackOnWhite: false, threshold: 255 })
        expect(instance.getSVG()).toBe(wbWhiteThreshold255)

        instance.setParameters({ blackOnWhite: false, threshold: 0 })
        expect(instance.getSVG()).toBe(wbWhiteThreshold0)

        instance.loadImage(blackImage, (innerErr: Error | null) => {
          if (innerErr) { return done(innerErr) }

          instance.setParameters({ blackOnWhite: false, threshold: 255 })
          expect(instance.getSVG()).toBe(wbBlackThreshold255)

          instance.setParameters({ blackOnWhite: false, threshold: 0 })
          expect(instance.getSVG()).toBe(wbBlackThreshold0)

          done()
        })
      })
    })
  })
})

describe('Histogram class (private, responsible for auto thresholding)', () => {
  let histogram: Histogram | null = null

  let blackHistogram: Histogram
  let whiteHistogram: Histogram

  beforeAll(async () => {
    try {
      // Create test images for histogram testing
      blackImage = await Jimp.read(PATH_TO_YAO) // Use an existing image
      blackImage.scan(0, 0, blackImage.bitmap.width, blackImage.bitmap.height, (x: number, y: number, idx: number) => {
        // Set all pixels to black
        blackImage.bitmap.data[idx] = 0
        blackImage.bitmap.data[idx + 1] = 0
        blackImage.bitmap.data[idx + 2] = 0
        blackImage.bitmap.data[idx + 3] = 255
      })

      whiteImage = await Jimp.read(PATH_TO_YAO) // Use an existing image
      whiteImage.scan(0, 0, whiteImage.bitmap.width, whiteImage.bitmap.height, (x: number, y: number, idx: number) => {
        // Set all pixels to white
        whiteImage.bitmap.data[idx] = 255
        whiteImage.bitmap.data[idx + 1] = 255
        whiteImage.bitmap.data[idx + 2] = 255
        whiteImage.bitmap.data[idx + 3] = 255
      })

      blackHistogram = new lib.types.Histogram(blackImage, lib.types.Histogram.MODE_LUMINANCE)
      whiteHistogram = new lib.types.Histogram(whiteImage, lib.types.Histogram.MODE_LUMINANCE)

      const img = await Jimp.read(PATH_TO_LENNA)
      histogram = new lib.types.Histogram(img, lib.types.Histogram.MODE_LUMINANCE)
    }
    catch (err) {
      console.error('Error in histogram test setup:', err)
      throw err
    }
  })

  describe('#getDominantColor', () => {
    it('gives different results with different tolerance values', () => {
      assert(histogram!.getDominantColor(0, 255) === 149)
      assert(histogram!.getDominantColor(0, 255, 10) === 143)
    })

    it('has default argument values of 0, 255 and 1', () => {
      assert(histogram!.getDominantColor() === histogram!.getDominantColor(0, 255, 1))
    })

    it('works for a segment of histogram', () => {
      assert(histogram!.getDominantColor(20, 80) === 41)
    })

    it('does not fail when min and max values are the same', () => {
      assert(histogram!.getDominantColor(42, 42) === 42)
    })

    it('returns -1 if colors from the range are not present on image', () => {
      assert(histogram!.getDominantColor(0, 15) === -1)
      assert(histogram!.getDominantColor(7, 7, 1) === -1)
    })

    it('throws error if range start is larger than range end', () => {
      expect(() => {
        histogram!.getDominantColor(80, 20)
      }).toThrow()
    })

    it('behaves predictably in edge cases', () => {
      expect(blackHistogram.getDominantColor(0, 255)).toBe(0)
      expect(whiteHistogram.getDominantColor(0, 255)).toBe(255)
      expect(whiteHistogram.getDominantColor(25, 235)).toBe(-1)

      // Tolerance should not affect returned value
      expect(blackHistogram.getDominantColor(0, 255, 15)).toBe(0)
      expect(whiteHistogram.getDominantColor(0, 255, 15)).toBe(255)
    })
  })

  describe('#getStats', () => {
    function toFixedDeep(stats: any, fractionalDigits: number) {
      const deepCopy = JSON.parse(JSON.stringify(stats))

      function processValues(obj: any) {
        if (!obj || typeof obj !== 'object')
          return obj

        for (const key in obj) {
          if (typeof obj[key] === 'number' && !Number.isInteger(obj[key])) {
            obj[key] = Number.parseFloat(obj[key].toFixed(fractionalDigits))
          }
          else if (typeof obj[key] === 'object') {
            processValues(obj[key])
          }
        }
        return obj
      }

      return processValues(deepCopy)
    }

    it('produces expected stats object for entire histogram', () => {
      const expectedValue = {
        levels: {
          mean: 116.7673568725586,
          median: 95,
          stdDev: 49.42205692905339,
          unique: 222,
        },
        pixelsPerLevel: {
          mean: 1028.0156862745098,
          median: 1180.8288288288288,
          peak: 2495,
        },
        pixels: 262144,
      }

      expect(
        toFixedDeep(histogram!.getStats(), 4),
      ).toEqual(
        toFixedDeep(expectedValue, 4),
      )
    })

    it('produces expected stats object for histogram segment', () => {
      const expectedValue = {
        levels: {
          mean: 121.89677761754915,
          median: 93,
          stdDev: 30.2466970087377,
          unique: 121,
        },
        pixelsPerLevel: {
          mean: 1554.4916666666666,
          median: 1541.6446280991736,
          peak: 2495,
        },
        pixels: 186539,
      }

      expect(
        toFixedDeep(histogram!.getStats(60, 180), 4),
      ).toEqual(
        toFixedDeep(expectedValue, 4),
      )
    })

    it('throws error if range start is larger than range end', () => {
      expect(() => {
        histogram!.getStats(255, 123)
      }).toThrow()
    })

    it('behaves predictably in edge cases', () => {
      const blackImageStats = blackHistogram.getStats()
      const whiteImageStats = blackHistogram.getStats()

      expect(blackImageStats.levels.mean).toBe(blackImageStats.levels.median)
      expect(whiteImageStats.levels.mean).toBe(whiteImageStats.levels.median)

      expect(blackHistogram.getStats(25, 235)).toEqual(whiteHistogram.getStats(25, 235))
    })
  })

  describe('#multilevelThresholding', () => {
    it('calculates correct thresholds', () => {
      expect(histogram!.multilevelThresholding(1)).toEqual([111])
      expect(histogram!.multilevelThresholding(2)).toEqual([92, 154])
      expect(histogram!.multilevelThresholding(3)).toEqual([73, 121, 168])
    })

    it('works for histogram segment', () => {
      expect(histogram!.multilevelThresholding(2, 60, 180)).toEqual([103, 138])
    })

    it('calculates as many thresholds as can be fit in given range', () => {
      expect(histogram!.multilevelThresholding(2, 102, 106)).toEqual([103, 104])
      expect(histogram!.multilevelThresholding(2, 103, 106)).toEqual([104])
    })

    it('returns empty array if no colors from histogram segment is present on the image', () => {
      expect(histogram!.multilevelThresholding(3, 2, 14)).toEqual([])
    })

    it('throws error if range start is larger than range end', () => {
      expect(() => {
        histogram!.multilevelThresholding(2, 180, 60)
      }).toThrow()
    })
  })
})

describe('Posterizer class', () => {
  let jimpInstance: any = null
  const sharedPosterizerInstance = new lib.Posterizer()

  beforeAll(async () => {
    try {
      jimpInstance = await Jimp.read(PATH_TO_YAO)
    }
    catch (err) {
      throw err
    }
  })

  describe('#_getRanges', () => {
    const posterizer = new lib.Posterizer()

    function getColorStops() {
      return posterizer._getRanges().map((item: any) => {
        return item.value
      })
    }

    beforeAll((done) => {
      posterizer.loadImage(PATH_TO_YAO, done)
    })

    it('returns correctly calculated color stops with "equally spread" distribution', () => {
      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_EQUAL,
        threshold: 200,
        steps: 4,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([200, 150, 100, 50])

      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_EQUAL,
        threshold: 155,
        steps: 4,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([155, 180, 205, 230])

      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_EQUAL,
        threshold: lib.Potrace.THRESHOLD_AUTO,
        steps: 4,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([206, 154.5, 103, 51.5])
    })

    it('returns correctly calculated color stops with "auto" distribution', () => {
      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_AUTO,
        threshold: lib.Potrace.THRESHOLD_AUTO,
        steps: 3,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([219, 156, 71])

      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_AUTO,
        threshold: lib.Potrace.THRESHOLD_AUTO,
        steps: 3,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([71, 156, 219])

      // Now with predefined threshold

      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_AUTO,
        threshold: 128,
        steps: 4,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([128, 97, 62, 24])

      posterizer.setParameters({
        rangeDistribution: lib.Posterizer.RANGES_AUTO,
        threshold: 128,
        steps: 4,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([128, 166, 203, 237])
    })

    it('correctly handles predefined array of color stops', () => {
      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 120,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([160, 80, 60, 20])

      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 180,
        blackOnWhite: true,
      })

      expect(getColorStops()).toEqual([180, 160, 80, 60, 20])

      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 180,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([20, 60, 80, 160, 180])

      posterizer.setParameters({
        steps: [212, 16, 26, 50, 212, 128, 211],
        threshold: 180,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([16, 26, 50, 128, 211, 212])

      posterizer.setParameters({
        steps: [15, 42, 200, 460, 0, -10],
        threshold: 180,
        blackOnWhite: false,
      })

      expect(getColorStops()).toEqual([0, 15, 42, 200])
    })
  })

  describe('#loadImage', () => {
    it('instance is being passed to callback function as context', (done) => {
      sharedPosterizerInstance.loadImage(PATH_TO_YAO, function (this: Posterizer, err: Error | null) {
        expect(this).toBeInstanceOf(lib.Posterizer)
        expect(this).toBe(sharedPosterizerInstance)
        done(err)
      })
    })
  })

  describe('#getSVG', () => {
    const instanceYao = sharedPosterizerInstance

    it('produces expected results with different thresholds', () => {
      let expected: string

      instanceYao.setParameters({ threshold: 128 })
      expected = readFileSync(join(REFS_PATH, 'posterized-yao-black-threshold-128.svg'), { encoding: 'utf8' })
      expect(instanceYao.getSVG()).toBe(expected)

      instanceYao.setParameters({ threshold: 65 })
      expected = readFileSync(join(REFS_PATH, 'posterized-yao-black-threshold-65.svg'), { encoding: 'utf8' })
      expect(instanceYao.getSVG()).toBe(expected)

      instanceYao.setParameters({ threshold: 170 })
      expected = readFileSync(join(REFS_PATH, 'posterized-yao-black-threshold-170.svg'), { encoding: 'utf8' })
      expect(instanceYao.getSVG()).toBe(expected)
    })

    it('produces expected white on black image with threshold 170', (done) => {
      const instance = new lib.Posterizer({
        threshold: 40,
        blackOnWhite: false,
        steps: 3,
        color: 'beige',
        background: '#222',
      })

      instance.loadImage('test/sources/clouds.jpg', (err: Error | null) => {
        if (err)
          return done(err)

        const expected = readFileSync(join(REFS_PATH, 'posterized-clouds-white-40.svg'), { encoding: 'utf8' })
        const actual = instance.getSVG()

        expect(actual).toBe(expected)
        done()
      })
    })
  })

  describe('#getSymbol', () => {
    const instanceYao = new lib.Posterizer()

    beforeAll((done) => {
      instanceYao.loadImage(jimpInstance!, done)
    })

    it('should not have fill color or background', () => {
      instanceYao.setParameters({
        color: 'red',
        background: 'cyan',
        steps: 3,
      })

      const symbol = instanceYao.getSymbol('whatever')

      expect(symbol).not.toMatch(/<rect/i)
      expect(symbol).toMatch(/<path[^>]+>/i)
    })
  })

  describe('edge cases', () => {
    const instance = new lib.Posterizer()

    it('does not break on images filled with one color', (done) => {
      instance.loadImage(blackImage, (err: Error | null) => {
        if (err) { return done(err) }

        // black image should give us one black layer...
        instance.setParameters({ blackOnWhite: true, threshold: 128 })
        expect(instance.getSVG()).toMatch(/<path fill-opacity="1\.000"/)

        instance.setParameters({ blackOnWhite: false })
        expect(instance.getSVG()).not.toMatch(/<path/)

        instance.loadImage(whiteImage, (err?: Error | null) => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: true })
          expect(instance.getSVG()).not.toMatch(/<path/)

          // white image should give us one layer...
          instance.setParameters({ blackOnWhite: false })
          expect(instance.getSVG()).toMatch(/<path fill-opacity="1\.000"/)

          done()
        })
      })
    })

    it('does not break when no thresholds can be found', (done) => {
      instance.loadImage(whiteImage, (err: Error | null) => {
        if (err) { return done(err) }

        let svg1, svg2, svg3, svg4

        instance.setParameters({ blackOnWhite: true })
        svg1 = instance.getSVG()
        instance.setParameters({ blackOnWhite: true, steps: 3, threshold: 128 })
        svg2 = instance.getSVG()
        instance.setParameters({ blackOnWhite: true, steps: [], threshold: 128 })
        svg3 = instance.getSVG()
        instance.setParameters({ blackOnWhite: true, steps: [0, 55, 128, 169, 210], threshold: 250 })
        svg4 = instance.getSVG()

        expect(svg1).toBe(svg2)
        expect(svg1).toBe(svg3)
        expect(svg1).toBe(svg4)
        expect(svg1).not.toMatch(/<path/)

        instance.loadImage(blackImage, (err?: Error | null) => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: false, threshold: 255 })
          svg1 = instance.getSVG()
          instance.setParameters({ blackOnWhite: false, threshold: 0 })
          svg2 = instance.getSVG()

          expect(svg1).toBe(svg2)
          expect(svg1).not.toMatch(/<path/)

          done()
        })
      })
    })
  })
})

describe('Shorthand methods', () => {
  let jimpInstance: any = null

  beforeAll(async () => {
    try {
      jimpInstance = await Jimp.read(PATH_TO_YAO)
    }
    catch (err) {
      throw err
    }
  })

  describe('#trace', () => {
    let instance: any = null

    it('works with two arguments', (done) => {
      lib.trace(jimpInstance!, (err, svg, inst) => {
        if (err) {
          throw err
        }

        const expected = readFileSync(join(REFS_PATH, 'output.svg'), { encoding: 'utf8' })

        instance = inst
        expect(svg).toBe(expected)
        done()
      })
    })

    it('works with three arguments', (done) => {
      lib.trace(jimpInstance!, { threshold: 170 }, (err, svg) => {
        if (err) {
          throw err
        }

        const expected = readFileSync(join(REFS_PATH, 'potrace-bw-threshold-170.svg'), { encoding: 'utf8' })

        expect(svg).toBe(expected)
        done()
      })
    })

    it('returns Potrace instance as third argument', () => {
      expect(instance).toBeInstanceOf(lib.Potrace)
    })
  })

  describe('#posterize', () => {
    let instance: any = null

    it('works with two arguments', (done) => {
      lib.posterize(jimpInstance!, (err, svg, inst) => {
        if (err) {
          throw err
        }

        const expected = readFileSync(join(REFS_PATH, 'output-posterized.svg'), { encoding: 'utf8' })

        instance = inst
        expect(svg).toBe(expected)
        done()
      })
    })

    it('works with three arguments', (done) => {
      lib.posterize(jimpInstance!, { threshold: 170 }, (err, svg) => {
        if (err) {
          throw err
        }

        const expected = readFileSync(join(REFS_PATH, 'posterized-bw-threshold-170.svg'), { encoding: 'utf8' })

        expect(svg).toBe(expected)
        done()
      })
    })

    it('returns Posterizer instance as third argument', () => {
      expect(instance).toBeInstanceOf(lib.Posterizer)
    })
  })
})
