'use strict'

let Potrace = require('./Potrace')
let utils = require('./utils')

/**
 * Takes multiple samples using {@link Potrace} with different threshold
 * settings and combines output into a single file.
 *
 * @param {Posterizer~Options} [options]
 * @constructor
 */
function Posterizer(options) {
  this._potrace = new Potrace()

  this._calculatedThreshold = null

  this._params = {
    threshold: Potrace.THRESHOLD_AUTO,
    blackOnWhite: true,
    steps: Posterizer.STEPS_AUTO,
    background: Potrace.COLOR_TRANSPARENT,
    fillStrategy: Posterizer.FILL_DOMINANT,
    rangeDistribution: Posterizer.RANGES_AUTO,
  }

  if (options) {
    this.setParameters(options)
  }
}

// Inherit constants from Potrace class
for (let key in Potrace) {
  if (Object.prototype.hasOwnProperty.call(Potrace, key) && key === key.toUpperCase()) {
    Posterizer[key] = Potrace[key]
  }
}

Posterizer.STEPS_AUTO = -1
Posterizer.FILL_SPREAD = 'spread'
Posterizer.FILL_DOMINANT = 'dominant'
Posterizer.FILL_MEDIAN = 'median'
Posterizer.FILL_MEAN = 'mean'

Posterizer.RANGES_AUTO = 'auto'
Posterizer.RANGES_EQUAL = 'equal'

Posterizer.prototype = {
  /**
   * Fine tuning to color ranges.
   *
   * If last range (featuring most saturated color) is larger than 10% of color space (25 units)
   * then we want to add another color stop, that hopefully will include darkest pixels, improving presence of
   * shadows and line art
   *
   * @param ranges
   * @private
   */
  _addExtraColorStop(ranges) {
    let blackOnWhite = this._params.blackOnWhite
    let lastColorStop = ranges[ranges.length - 1]
    let lastRangeFrom = blackOnWhite ? 0 : lastColorStop.value
    let lastRangeTo = blackOnWhite ? lastColorStop.value : 255

    if (lastRangeTo - lastRangeFrom > 25 && lastColorStop.colorIntensity !== 1) {
      let histogram = this._getImageHistogram()
      let levels = histogram.getStats(lastRangeFrom, lastRangeTo).levels

      let newColorStop = levels.mean + levels.stdDev <= 25
        ? levels.mean + levels.stdDev
        : levels.mean - levels.stdDev <= 25
          ? levels.mean - levels.stdDev
          : 25

      let newStats = (blackOnWhite ? histogram.getStats(0, newColorStop) : histogram.getStats(newColorStop, 255))
      let color = newStats.levels.mean

      ranges.push({
        value: Math.abs((blackOnWhite ? 0 : 255) - newColorStop),
        colorIntensity: isNaN(color) ? 0 : ((blackOnWhite ? 255 - color : color) / 255),
      })
    }

    return ranges
  },

  /**
   * Calculates color intensity for each element of numeric array
   *
   * @param {number[]} colorStops
   * @returns {{ levels: number, colorIntensity: number }[]}
   * @private
   */
  _calcColorIntensity(colorStops) {
    let blackOnWhite = this._params.blackOnWhite
    let colorSelectionStrat = this._params.fillStrategy
    let histogram = colorSelectionStrat !== Posterizer.FILL_SPREAD ? this._getImageHistogram() : null
    let fullRange = Math.abs(this._paramThreshold() - (blackOnWhite ? 0 : 255))

    return colorStops.map((threshold, index) => {
      let nextValue = index + 1 === colorStops.length ? (blackOnWhite ? -1 : 256) : colorStops[index + 1]
      let rangeStart = Math.round(blackOnWhite ? nextValue + 1 : threshold)
      let rangeEnd = Math.round(blackOnWhite ? threshold : nextValue - 1)
      let factor = index / (colorStops.length - 1)
      let intervalSize = rangeEnd - rangeStart
      let stats = histogram.getStats(rangeStart, rangeEnd)
      let color = -1

      if (stats.pixels === 0) {
        return {
          value: threshold,
          colorIntensity: 0,
        }
      }

      switch (colorSelectionStrat) {
        case Posterizer.FILL_SPREAD:
          // We want it to be 0 (255 when white on black) at the most saturated end, so...
          color = (blackOnWhite ? rangeStart : rangeEnd)
            + (blackOnWhite ? 1 : -1) * intervalSize * Math.max(0.5, fullRange / 255) * factor
          break
        case Posterizer.FILL_DOMINANT:
          color = histogram.getDominantColor(rangeStart, rangeEnd, utils.clamp(intervalSize, 1, 5))
          break
        case Posterizer.FILL_MEAN:
          color = stats.levels.mean
          break
        case Posterizer.FILL_MEDIAN:
          color = stats.levels.median
          break
      }

      // We don't want colors to be too close to each other, so we introduce some spacing in between
      if (index !== 0) {
        color = blackOnWhite
          ? utils.clamp(color, rangeStart, rangeEnd - Math.round(intervalSize * 0.1))
          : utils.clamp(color, rangeStart + Math.round(intervalSize * 0.1), rangeEnd)
      }

      return {
        value: threshold,
        colorIntensity: color === -1 ? 0 : ((blackOnWhite ? 255 - color : color) / 255),
      }
    })
  },

  /**
   * @returns {Histogram}
   * @private
   */
  _getImageHistogram() {
    return this._potrace._luminanceData.histogram()
  },

  /**
   * Processes threshold, steps and rangeDistribution parameters and returns normalized array of color stops
   * @returns {*}
   * @private
   */
  _getRanges() {
    let steps = this._paramSteps()

    if (!Array.isArray(steps)) {
      return this._params.rangeDistribution === Posterizer.RANGES_AUTO
        ? this._getRangesAuto()
        : this._getRangesEquallyDistributed()
    }

    // Steps is array of thresholds and we want to preprocess it

    let colorStops = []
    const threshold = this._paramThreshold()
    const lookingForDarkPixels = this._params.blackOnWhite

    steps.forEach((item) => {
      if (!colorStops.includes(item) && utils.between(item, 0, 255)) {
        colorStops.push(item)
      }
    })

    if (!colorStops.length) {
      colorStops.push(threshold)
    }

    colorStops = colorStops.sort((a, b) => {
      return a < b === lookingForDarkPixels ? 1 : -1
    })

    if (lookingForDarkPixels && colorStops[0] < threshold) {
      colorStops.unshift(threshold)
    }
    else if (!lookingForDarkPixels && colorStops[colorStops.length - 1] < threshold) {
      colorStops.push(threshold)
    }

    return this._calcColorIntensity(colorStops)
  },

  /**
   * Calculates given (or lower) number of thresholds using automatic thresholding algorithm
   * @returns {*}
   * @private
   */
  _getRangesAuto() {
    const histogram = this._getImageHistogram()
    const steps = this._paramSteps(true)
    let colorStops

    if (this._params.threshold === Potrace.THRESHOLD_AUTO) {
      colorStops = histogram.multilevelThresholding(steps)
    }
    else {
      const threshold = this._paramThreshold()

      colorStops = this._params.blackOnWhite
        ? histogram.multilevelThresholding(steps - 1, 0, threshold)
        : histogram.multilevelThresholding(steps - 1, threshold, 255)

      if (this._params.blackOnWhite) {
        colorStops.push(threshold)
      }
      else {
        colorStops.unshift(threshold)
      }
    }

    if (this._params.blackOnWhite) {
      colorStops = colorStops.reverse()
    }

    return this._calcColorIntensity(colorStops)
  },

  /**
   * Calculates color stops and color representing each segment, returning them
   * from least to most intense color (black or white, depending on blackOnWhite parameter)
   *
   * @private
   */
  _getRangesEquallyDistributed() {
    const blackOnWhite = this._params.blackOnWhite
    const colorsToThreshold = blackOnWhite ? this._paramThreshold() : 255 - this._paramThreshold()
    const steps = this._paramSteps()

    const stepSize = colorsToThreshold / steps
    const colorStops = []
    let i = steps - 1
    let factor
    let threshold

    while (i >= 0) {
      factor = i / (steps - 1)
      threshold = Math.min(colorsToThreshold, (i + 1) * stepSize)
      threshold = blackOnWhite ? threshold : 255 - threshold
      i--

      colorStops.push(threshold)
    }

    return this._calcColorIntensity(colorStops)
  },

  /**
   * Returns valid steps value
   * @param {boolean} [count]
   * @returns {number|number[]}
   * @private
   */
  _paramSteps(count) {
    let steps = this._params.steps

    if (Array.isArray(steps)) {
      return count ? steps.length : steps
    }

    if (steps === Posterizer.STEPS_AUTO && this._params.threshold === Potrace.THRESHOLD_AUTO) {
      return 4
    }

    const blackOnWhite = this._params.blackOnWhite
    const colorsCount = blackOnWhite ? this._paramThreshold() : 255 - this._paramThreshold()

    return steps === Posterizer.STEPS_AUTO
      ? (colorsCount > 200 ? 4 : 3)
      : Math.min(colorsCount, Math.max(2, steps))
  },

  /**
   * Returns valid threshold value
   * @returns {number}
   * @private
   */
  _paramThreshold() {
    if (this._calculatedThreshold !== null) {
      return this._calculatedThreshold
    }

    if (this._params.threshold !== Potrace.THRESHOLD_AUTO) {
      this._calculatedThreshold = this._params.threshold
      return this._calculatedThreshold
    }

    const twoThresholds = this._getImageHistogram().multilevelThresholding(2)
    this._calculatedThreshold = this._params.blackOnWhite ? twoThresholds[1] : twoThresholds[0]
    this._calculatedThreshold = this._calculatedThreshold || 128

    return this._calculatedThreshold
  },

  /**
   * Running potrace on the image multiple times with different thresholds and returns an array
   * of path tags
   *
   * @param {boolean} [noFillColor]
   * @returns {string[]}
   * @private
   */
  _pathTags(noFillColor) {
    let ranges = this._getRanges()
    const potrace = this._potrace
    const blackOnWhite = this._params.blackOnWhite

    if (ranges.length >= 10) {
      ranges = this._addExtraColorStop(ranges)
    }

    potrace.setParameters({ blackOnWhite })

    let actualPrevLayersOpacity = 0

    return ranges.map((colorStop) => {
      let thisLayerOpacity = colorStop.colorIntensity

      if (thisLayerOpacity === 0) {
        return ''
      }

      // NOTE: With big number of layers (something like 70) there will be noticeable math error on rendering side.
      // In Chromium at least image will end up looking brighter overall compared to the same layers painted in solid colors.
      // However it works fine with sane number of layers, and it's not like we can do much about it.

      let calculatedOpacity = (!actualPrevLayersOpacity || thisLayerOpacity === 1)
        ? thisLayerOpacity
        : ((actualPrevLayersOpacity - thisLayerOpacity) / (actualPrevLayersOpacity - 1))

      calculatedOpacity = utils.clamp(Number.parseFloat(calculatedOpacity.toFixed(3)), 0, 1)
      actualPrevLayersOpacity = actualPrevLayersOpacity + (1 - actualPrevLayersOpacity) * calculatedOpacity

      potrace.setParameters({ threshold: colorStop.value })

      let element = noFillColor ? potrace.getPathTag('') : potrace.getPathTag()
      element = utils.setHtmlAttr(element, 'fill-opacity', calculatedOpacity.toFixed(3))

      let canBeIgnored = calculatedOpacity === 0 || element.includes(' d=""')

      // var c = Math.round(Math.abs((blackOnWhite ? 255 : 0) - 255 * thisLayerOpacity));
      // element = utils.setHtmlAttr(element, 'fill', 'rgb('+c+', '+c+', '+c+')');
      // element = utils.setHtmlAttr(element, 'fill-opacity', '');

      return canBeIgnored ? '' : element
    })
  },

  /**
   * Loads image.
   *
   * @param {string|Buffer|Jimp} target Image source. Could be anything that {@link Jimp} can read (buffer, local path or url). Supported formats are: PNG, JPEG or BMP
   * @param {Function} callback
   */
  loadImage(target, callback) {
    let self = this

    this._potrace.loadImage(target, (err) => {
      self._calculatedThreshold = null
      callback.call(self, err)
    })
  },

  /**
   * Sets parameters. Accepts same object as {Potrace}
   *
   * @param {Posterizer~Options} params
   */
  setParameters(params) {
    if (!params) {
      return
    }

    this._potrace.setParameters(params)

    if (params.steps && !Array.isArray(params.steps) && (!utils.isNumber(params.steps) || !utils.between(params.steps, 1, 255))) {
      throw new Error('Bad \'steps\' value')
    }

    for (let key in this._params) {
      if (this._params.hasOwnProperty(key) && params.hasOwnProperty(key)) {
        this._params[key] = params[key]
      }
    }

    this._calculatedThreshold = null
  },

  /**
   * Returns image as <symbol> tag. Always has viewBox specified
   *
   * @param {string} id
   */
  getSymbol(id) {
    const width = this._potrace._luminanceData.width
    const height = this._potrace._luminanceData.height
    const paths = this._pathTags(true)

    return `<symbol viewBox="0 0 ${width} ${height}" id="${id}">${
      paths.join('')
    }</symbol>`
  },

  /**
   * Generates SVG image
   * @returns {string}
   */
  getSVG() {
    const width = this._potrace._luminanceData.width
    const height = this._potrace._luminanceData.height

    const tags = this._pathTags(false)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" `
      + `width="${width}" `
      + `height="${height}" `
      + `viewBox="0 0 ${width} ${height}" `
      + `version="1.1">\n\t${
        this._params.background !== Potrace.COLOR_TRANSPARENT
          ? `<rect x="0" y="0" width="100%" height="100%" fill="${this._params.background}" />\n\t`
          : ''
      }${tags.join('\n\t')
      }\n</svg>`

    return svg.replace(/\n(?:\t*\n)+(\t*)/g, '\n$1')
  },
}

module.exports = Posterizer

/**
 * Posterizer options
 *
 * @typedef {Potrace~Options} Posterizer~Options
 * @property {number} [steps]   - Number of samples that needs to be taken (and number of layers in SVG). (default: Posterizer.STEPS_AUTO, which most likely will result in 3, sometimes 4)
 * @property {*} [fillStrategy] - How to select fill color for color ranges - equally spread or dominant. (default: Posterizer.FILL_DOMINANT)
 * @property {*} [rangeDistribution] - How to choose thresholds in-between - after equal intervals or automatically balanced. (default: Posterizer.RANGES_AUTO)
 */
