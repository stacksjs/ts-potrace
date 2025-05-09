'use strict'

let _ = require('lodash')
let should = require('should')
let sinon = require('sinon')

require('should-sinon')

let fs = require('node:fs')
let Jimp = require('jimp')
let lib = require('../lib/index')
let Posterizer = require('../lib/Posterizer')
let Potrace = require('../lib/Potrace')
let Histogram = require('../lib/types/Histogram')

let PATH_TO_YAO = './sources/yao.jpg'
let PATH_TO_LENNA = './sources/Lenna.png'
let PATH_TO_BLACK_AND_WHITE_IMAGE = './sources/clouds.jpg'

let blackImage = new Jimp(100, 100, 0x000000FF)
let whiteImage = new Jimp(100, 100, 0xFFFFFFFF)

describe('Histogram class (private, responsible for auto thresholding)', () => {
  let histogram = null

  let blackHistogram = new Histogram(blackImage, Histogram.MODE_LUMINANCE)
  let whiteHistogram = new Histogram(whiteImage, Histogram.MODE_LUMINANCE)

  before(function (done) {
    this.timeout(10000)

    Jimp.read(PATH_TO_LENNA, (err, img) => {
      if (err)
        throw err
      histogram = new Histogram(img, Histogram.MODE_LUMINANCE)
      done()
    })
  })

  describe('#getDominantColor', () => {
    it('gives different results with different tolerance values', () => {
      assert.equal(histogram.getDominantColor(0, 255), 149)
      assert.equal(histogram.getDominantColor(0, 255, 10), 143)
    })

    it('has default argument values of 0, 255 and 1', () => {
      assert.equal(histogram.getDominantColor(), histogram.getDominantColor(0, 255, 1))
    })

    it('works for a segment of histogram', () => {
      assert.equal(41, histogram.getDominantColor(20, 80))
    })

    it('does not fail when min and max values are the same', () => {
      assert.equal(histogram.getDominantColor(42, 42), 42)
    })

    it('returns -1 if colors from the range are not present on image', () => {
      assert.equal(histogram.getDominantColor(0, 15), -1)
      assert.equal(histogram.getDominantColor(7, 7, 1), -1)
    })

    it('throws error if range start is larger than range end', () => {
      (function () {
        histogram.getDominantColor(80, 20)
      }).should.throw()
    })

    it('behaves predictably in edge cases', () => {
      blackHistogram.getDominantColor(0, 255).should.be.equal(0)
      whiteHistogram.getDominantColor(0, 255).should.be.equal(255)
      whiteHistogram.getDominantColor(25, 235).should.be.equal(-1)

      // Tolerance should not affect returned value

      blackHistogram.getDominantColor(0, 255, 15).should.be.equal(0)
      whiteHistogram.getDominantColor(0, 255, 15).should.be.equal(255)
    })
  })

  describe('#getStats', () => {
    function toFixedDeep(stats, fractionalDigits) {
      return _.cloneDeepWith(stats, (val) => {
        if (_.isNumber(val) && !_.isInteger(val)) {
          return Number.parseFloat(val.toFixed(fractionalDigits))
        }
      })
    }

    it('produces expected stats object for entire histogram', () => {
      let expectedValue = {
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

      assert.deepEqual(
        toFixedDeep(histogram.getStats(), 4),
        toFixedDeep(expectedValue, 4),
      )
    })

    it('produces expected stats object for histogram segment', () => {
      let expectedValue = {
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

      assert.deepEqual(
        toFixedDeep(histogram.getStats(60, 180), 4),
        toFixedDeep(expectedValue, 4),
      )
    })

    it('throws error if range start is larger than range end', () => {
      (function () {
        histogram.getStats(255, 123)
      }).should.throw()
    })

    it('behaves predictably in edge cases', () => {
      let blackImageStats = blackHistogram.getStats()
      let whiteImageStats = blackHistogram.getStats()

      blackImageStats.levels.mean.should.be.equal(blackImageStats.levels.median)
      whiteImageStats.levels.mean.should.be.equal(whiteImageStats.levels.median)

      blackHistogram.getStats(25, 235).should.be.deepEqual(whiteHistogram.getStats(25, 235))
    })
  })

  describe('#multilevelThresholding', () => {
    it('calculates correct thresholds', () => {
      assert.deepEqual(histogram.multilevelThresholding(1), [111])
      assert.deepEqual(histogram.multilevelThresholding(2), [92, 154])
      assert.deepEqual(histogram.multilevelThresholding(3), [73, 121, 168])
    })

    it('works for histogram segment', () => {
      assert.deepEqual(histogram.multilevelThresholding(2, 60, 180), [103, 138])
    })

    it('calculates as many thresholds as can be fit in given range', () => {
      assert.deepEqual(histogram.multilevelThresholding(2, 102, 106), [103, 104])
      assert.deepEqual(histogram.multilevelThresholding(2, 103, 106), [104])
    })

    it('returns empty array if no colors from histogram segment is present on the image', () => {
      assert.deepEqual(histogram.multilevelThresholding(3, 2, 14), [])
    })

    it('throws error if range start is larger than range end', () => {
      (function () {
        histogram.multilevelThresholding(2, 180, 60)
      }).should.throw()
    })
  })
})

describe('Potrace class', function () {
  let jimpInstance = null

  this.timeout(10000)

  before((done) => {
    Jimp.read(PATH_TO_YAO, (err, img) => {
      if (err) {
        return done(err)
      }

      jimpInstance = img
      done()
    })
  })

  describe('#loadImage', () => {
    it('instance is being passed to callback function as context', (done) => {
      let instance = new Potrace()

      instance.loadImage(PATH_TO_YAO, function (err) {
        this.should.be.an.instanceOf(Potrace).and.be.equal(instance)
        done(err)
      })
    })

    it('supports Jimp instances provided as source image', (done) => {
      let instance = new Potrace()

      instance.loadImage(jimpInstance, done)
    })

    it('should throw error if called before previous image was loaded', (done) => {
      function onImageLoad() {
        if (firstFinished && secondFinished) {
          done()
        }
      }

      let potraceInstance = new Potrace()
      var firstFinished = false
      var secondFinished = false

      potraceInstance.loadImage(PATH_TO_LENNA, (err) => {
        firstFinished = true
        should(() => { should.ifError(err) }).throw(/another.*instead/i)
        onImageLoad()
      })

      potraceInstance.loadImage(PATH_TO_YAO, (err) => {
        secondFinished = true
        should(() => { should.ifError(err) }).not.throw()
        onImageLoad()
      })
    })
  })

  describe('#_processPath', () => {
    let instance = new Potrace()
    let processingSpy = null

    before(() => {
      processingSpy = instance._processPath = sinon.spy(Potrace.prototype._processPath)
    })

    it('should not execute until path is requested for the first time', (done) => {
      instance.loadImage(jimpInstance, function () {
        processingSpy.should.have.callCount(0)
        this.getSVG()
        processingSpy.should.have.callCount(1)
        done()
      })
    })

    it('should not execute on repetitive SVG/Symbol export', () => {
      instance.loadImage(jimpInstance, function () {
        let initialCallCount = processingSpy.callCount

        this.getSVG()
        this.getSVG()
        this.getPathTag()
        this.getPathTag('red')
        this.getSymbol('symbol-id')
        processingSpy.should.have.callCount(initialCallCount)
      })
    })

    it('should not execute after change of foreground/background colors', () => {
      instance.loadImage(jimpInstance, function () {
        let initialCallCount = processingSpy.callCount

        this.setParameters({ color: 'red' })
        this.getSVG()

        this.setParameters({ background: 'crimson' })
        this.getSVG()

        processingSpy.should.have.callCount(initialCallCount)
      })
    })
  })

  describe('#getSVG', () => {
    let instanceYao = new Potrace()

    before((done) => {
      instanceYao.loadImage(jimpInstance, done)
    })

    it('produces expected results with different thresholds', () => {
      let expected

      expected = fs.readFileSync('./reference-copies/potrace-bw-threshold-128.svg', { encoding: 'utf8' })
      instanceYao.setParameters({ threshold: 128 })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 128 does not match with reference copy')

      expected = fs.readFileSync('./reference-copies/potrace-bw-threshold-65.svg', { encoding: 'utf8' })
      instanceYao.setParameters({ threshold: 65 })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 65 does not match with reference copy')

      expected = fs.readFileSync('./reference-copies/potrace-bw-threshold-170.svg', { encoding: 'utf8' })
      instanceYao.setParameters({ threshold: 170 })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 170 does not match with reference copy')
    })

    it('produces expected white on black image with threshold 170', (done) => {
      let instance = new Potrace({
        threshold: 128,
        blackOnWhite: false,
        color: 'cyan',
        background: 'darkred',
      })

      instance.loadImage(PATH_TO_BLACK_AND_WHITE_IMAGE, (err) => {
        if (err)
          return done(err)

        let expected = fs.readFileSync('./reference-copies/potrace-wb-threshold-128.svg', { encoding: 'utf8' })
        let actual = instance.getSVG()

        assert.equal(actual, expected)
        done()
      })
    })
  })

  describe('#getSymbol', () => {
    let instanceYao = new Potrace()

    before((done) => {
      instanceYao.loadImage(jimpInstance, done)
    })

    it('should not have fill color or background', () => {
      instanceYao.setParameters({
        color: 'red',
        background: 'cyan',
      })

      let symbol = instanceYao.getSymbol('whatever')

      symbol.should.not.match(/<rect/i)
      symbol.should.match(/<path[^>]+>/i)
    })
  })

  describe('behaves predictably in edge cases', () => {
    let instance = new Potrace()

    let bwBlackThreshold0
    let bwBlackThreshold255
    let bwWhiteThreshold0
    let bwWhiteThreshold255
    let wbWhiteThreshold0
    let wbWhiteThreshold255
    let wbBlackThreshold0
    let wbBlackThreshold255

    before(() => {
      bwBlackThreshold0 = fs.readFileSync('./reference-copies/potrace-bw-black-threshold-0.svg', { encoding: 'utf8' })
      bwBlackThreshold255 = fs.readFileSync('./reference-copies/potrace-bw-black-threshold-255.svg', { encoding: 'utf8' })
      bwWhiteThreshold0 = fs.readFileSync('./reference-copies/potrace-bw-white-threshold-0.svg', { encoding: 'utf8' })
      bwWhiteThreshold255 = fs.readFileSync('./reference-copies/potrace-bw-white-threshold-255.svg', { encoding: 'utf8' })

      wbWhiteThreshold0 = fs.readFileSync('./reference-copies/potrace-wb-white-threshold-0.svg', { encoding: 'utf8' })
      wbWhiteThreshold255 = fs.readFileSync('./reference-copies/potrace-wb-white-threshold-255.svg', { encoding: 'utf8' })
      wbBlackThreshold0 = fs.readFileSync('./reference-copies/potrace-wb-black-threshold-0.svg', { encoding: 'utf8' })
      wbBlackThreshold255 = fs.readFileSync('./reference-copies/potrace-wb-black-threshold-255.svg', { encoding: 'utf8' })
    })

    it('compares colors against threshold in the same way as original tool', (done) => {
      instance.loadImage(blackImage, (err) => {
        if (err) { return done(err) }

        instance.setParameters({ blackOnWhite: true, threshold: 0 })
        instance.getSVG().should.be.equal(bwBlackThreshold0)

        instance.setParameters({ blackOnWhite: true, threshold: 255 })
        instance.getSVG().should.be.equal(bwBlackThreshold255)

        instance.loadImage(whiteImage, () => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: true, threshold: 0 })
          instance.getSVG().should.be.equal(bwWhiteThreshold0)

          instance.setParameters({ blackOnWhite: true, threshold: 255 })
          instance.getSVG().should.be.equal(bwWhiteThreshold255)

          done()
        })
      })
    })

    it('acts in the same way when colors are inverted', (done) => {
      instance.loadImage(whiteImage, (err) => {
        if (err) { return done(err) }
        instance.setParameters({ blackOnWhite: false, threshold: 255 })
        instance.getSVG().should.be.equal(wbWhiteThreshold255)

        instance.setParameters({ blackOnWhite: false, threshold: 0 })
        instance.getSVG().should.be.equal(wbWhiteThreshold0)

        instance.loadImage(blackImage, () => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: false, threshold: 255 })
          instance.getSVG().should.be.equal(wbBlackThreshold255)

          instance.setParameters({ blackOnWhite: false, threshold: 0 })
          instance.getSVG().should.be.equal(wbBlackThreshold0)

          done()
        })
      })
    })
  })
})

describe('Posterizer class', function () {
  let jimpInstance = null
  let sharedPosterizerInstance = new Posterizer()

  this.timeout(10000)

  before((done) => {
    Jimp.read(PATH_TO_YAO, (err, img) => {
      if (err) {
        return done(err)
      }

      jimpInstance = img
      done()
    })
  })

  describe('#_getRanges', () => {
    let posterizer = new Posterizer()

    function getColorStops() {
      return posterizer._getRanges().map((item) => {
        return item.value
      })
    }

    before((done) => {
      posterizer.loadImage(PATH_TO_YAO, done)
    })

    it('returns correctly calculated color stops with "equally spread" distribution', () => {
      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_EQUAL,
        threshold: 200,
        steps: 4,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([200, 150, 100, 50])

      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_EQUAL,
        threshold: 155,
        steps: 4,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([155, 180, 205, 230])

      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_EQUAL,
        threshold: Potrace.THRESHOLD_AUTO,
        steps: 4,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([206, 154.5, 103, 51.5])
    })

    it('returns correctly calculated color stops with "auto" distribution', () => {
      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_AUTO,
        threshold: Potrace.THRESHOLD_AUTO,
        steps: 3,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([219, 156, 71])

      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_AUTO,
        threshold: Potrace.THRESHOLD_AUTO,
        steps: 3,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([71, 156, 219])

      // Now with predefined threshold

      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_AUTO,
        threshold: 128,
        steps: 4,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([128, 97, 62, 24])

      posterizer.setParameters({
        rangeDistribution: Posterizer.RANGES_AUTO,
        threshold: 128,
        steps: 4,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([128, 166, 203, 237])
    })

    it('correctly handles predefined array of color stops', () => {
      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 120,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([160, 80, 60, 20])

      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 180,
        blackOnWhite: true,
      })

      getColorStops().should.be.deepEqual([180, 160, 80, 60, 20])

      posterizer.setParameters({
        steps: [20, 60, 80, 160],
        threshold: 180,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([20, 60, 80, 160, 180])

      posterizer.setParameters({
        steps: [212, 16, 26, 50, 212, 128, 211],
        threshold: 180,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([16, 26, 50, 128, 211, 212], 'Duplicated items should be present only once')

      posterizer.setParameters({
        steps: [15, 42, 200, 460, 0, -10],
        threshold: 180,
        blackOnWhite: false,
      })

      getColorStops().should.be.deepEqual([0, 15, 42, 200], 'Values out of range should be ignored')
    })
  })

  describe('#loadImage', () => {
    it('instance is being passed to callback function as context', (done) => {
      sharedPosterizerInstance.loadImage(PATH_TO_YAO, function (err) {
        this.should.be.an.instanceOf(Posterizer).and.be.equal(sharedPosterizerInstance)
        done(err)
      })
    })
  })

  describe('#getSVG', () => {
    let instanceYao = sharedPosterizerInstance

    it('produces expected results with different thresholds', () => {
      let expected

      instanceYao.setParameters({ threshold: 128 })
      expected = fs.readFileSync('./reference-copies/posterized-yao-black-threshold-128.svg', { encoding: 'utf8' })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 128 does not match with reference copy')

      instanceYao.setParameters({ threshold: 65 })
      expected = fs.readFileSync('./reference-copies/posterized-yao-black-threshold-65.svg', { encoding: 'utf8' })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 65 does not match with reference copy')

      instanceYao.setParameters({ threshold: 170 })
      expected = fs.readFileSync('./reference-copies/posterized-yao-black-threshold-170.svg', { encoding: 'utf8' })
      assert.equal(instanceYao.getSVG(), expected, 'Image with threshold 170 does not match with reference copy')
    })

    it('produces expected white on black image with threshold 170', (done) => {
      let instance = new Posterizer({
        threshold: 40,
        blackOnWhite: false,
        steps: 3,
        color: 'beige',
        background: '#222',
      })

      instance.loadImage('sources/clouds.jpg', (err) => {
        if (err)
          return done(err)

        let expected = fs.readFileSync('./reference-copies/posterized-clouds-white-40.svg', { encoding: 'utf8' })
        let actual = instance.getSVG()

        assert.equal(actual, expected)
        done()
      })
    })
  })

  describe('#getSymbol', () => {
    let instanceYao = new Posterizer()

    before((done) => {
      instanceYao.loadImage(jimpInstance, done)
    })

    it('should not have fill color or background', () => {
      instanceYao.setParameters({
        color: 'red',
        background: 'cyan',
        steps: 3,
      })

      let symbol = instanceYao.getSymbol('whatever')

      symbol.should.not.match(/<rect/i)
      symbol.should.match(/<path[^>]+>/i)
    })
  })

  describe('edge cases', () => {
    let instance = new Posterizer()

    it('does not break on images filled with one color', (done) => {
      instance.loadImage(blackImage, (err) => {
        if (err) { return done(err) }

        // black image should give us one black layer...
        instance.setParameters({ blackOnWhite: true, threshold: 128 })
        instance.getSVG().should.match(/<path fill-opacity="1\.000"/)

        instance.setParameters({ blackOnWhite: false })
        instance.getSVG().should.not.match(/<path/)

        instance.loadImage(whiteImage, () => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: true })
          instance.getSVG().should.not.match(/<path/)

          // white image should give us one layer...
          instance.setParameters({ blackOnWhite: false })
          instance.getSVG().should.match(/<path fill-opacity="1\.000"/)

          done()
        })
      })
    })

    it('does not break when no thresholds can be found', (done) => {
      instance.loadImage(whiteImage, (err) => {
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

        svg1.should.be.equal(svg2).and.equal(svg3).and.equal(svg4).and.not.match(/<path/)

        instance.loadImage(blackImage, () => {
          if (err) { return done(err) }

          instance.setParameters({ blackOnWhite: false, threshold: 255 })
          svg1 = instance.getSVG()
          instance.setParameters({ blackOnWhite: false, threshold: 0 })
          svg2 = instance.getSVG()

          svg1.should.equal(svg2).and.not.match(/<path/)

          done()
        })
      })
    })
  })
})

describe('Shorthand methods', function () {
  let jimpInstance = null

  this.timeout(10000)

  before((done) => {
    Jimp.read(PATH_TO_YAO, (err, img) => {
      if (err) {
        return done(err)
      }

      jimpInstance = img
      done()
    })
  })

  describe('#trace', () => {
    let instance = null

    it('works with two arguments', (done) => {
      lib.trace(jimpInstance, (err, svgContents, inst) => {
        if (err) {
          throw err
        }

        let expected = fs.readFileSync('./reference-copies/output.svg', { encoding: 'utf8' })

        instance = inst
        assert.equal(svgContents, expected)
        done()
      })
    })

    it('works with three arguments', (done) => {
      lib.trace(jimpInstance, { threshold: 170 }, (err, svgContents) => {
        if (err) {
          throw err
        }

        let expected = fs.readFileSync('./reference-copies/potrace-bw-threshold-170.svg', { encoding: 'utf8' })

        assert.equal(svgContents, expected)
        done()
      })
    })

    it('returns Potrace instance as third argument', () => {
      instance.should.be.instanceOf(Potrace)
    })
  })

  describe('#posterize', () => {
    let instance = null

    it('works with two arguments', (done) => {
      lib.posterize(jimpInstance, (err, svgContents, inst) => {
        if (err) {
          throw err
        }

        let expected = fs.readFileSync('./reference-copies/output-posterized.svg', { encoding: 'utf8' })

        instance = inst
        assert.equal(svgContents, expected)
        done()
      })
    })

    it('works with three arguments', (done) => {
      lib.posterize(jimpInstance, { threshold: 170 }, (err, svgContents) => {
        if (err) {
          throw err
        }

        let expected = fs.readFileSync('./reference-copies/posterized-bw-threshold-170.svg', { encoding: 'utf8' })

        assert.equal(svgContents, expected)
        done()
      })
    })

    it('returns Posterizer instance as third argument', () => {
      instance.should.be.instanceOf(Posterizer)
    })
  })
})

// lib.trace('./yao.jpg', function(err, svg) {
//   if (err) { throw err; }
//   fs.writeFileSync('./output.svg', svg);
// });
//
// lib.posterize('./yao.jpg', function(err, svg) {
//   if (err) { throw err; }
//   fs.writeFileSync('./output-posterized.svg', svg);
// });
//
// // Generating example for readme with hand-picked thresholds
//
// lib.trace('./yao.jpg', { threshold: 128 }, function(err, svg) {
//   if (err) { throw err; }
//   fs.writeFileSync('./example-output.svg', svg);
// });
//
// lib.posterize('./yao.jpg', { steps: [50, 85, 120, 165, 220] }, function(err, svg) {
//   if (err) { throw err; }
//   fs.writeFileSync('./example-output-posterized.svg', svg);
// });
