import type { Buffer } from 'node:buffer'
import type { PotraceOptions } from './Potrace'
import { Potrace } from './Potrace'
import * as utils from './utils'

/**
 * Supported fill strategies
 */
export type FillStrategy = 'spread' | 'dominant' | 'median' | 'mean'

/**
 * Supported range distribution types
 */
export type RangeDistribution = 'auto' | 'equal'

/**
 * Color range data
 */
interface ColorStop {
  value: number
  colorIntensity: number
}

export interface PosterizerOptions extends PotraceOptions {
  /** Number of quantization steps or specific array of thresholds (2-255) */
  steps?: number | number[]
  /** Fill strategy for color ranges */
  fillStrategy?: FillStrategy
  /** Range distribution 'auto' or 'equal' */
  rangeDistribution?: RangeDistribution
}

/**
 * Takes multiple samples using {@link Potrace} with different threshold
 * settings and combines output into a single file.
 */
export class Posterizer {
  // Static constants
  static readonly STEPS_AUTO = -1
  static readonly FILL_SPREAD: FillStrategy = 'spread'
  static readonly FILL_DOMINANT: FillStrategy = 'dominant'
  static readonly FILL_MEDIAN: FillStrategy = 'median'
  static readonly FILL_MEAN: FillStrategy = 'mean'
  static readonly RANGES_AUTO: RangeDistribution = 'auto'
  static readonly RANGES_EQUAL: RangeDistribution = 'equal'

  // Protected members
  protected _potrace: Potrace
  protected _calculatedThreshold: number | null = null
  protected _params: PosterizerOptions = {
    threshold: Potrace.THRESHOLD_AUTO,
    blackOnWhite: true,
    steps: Posterizer.STEPS_AUTO,
    background: Potrace.COLOR_TRANSPARENT,
    fillStrategy: Posterizer.FILL_DOMINANT,
    rangeDistribution: Posterizer.RANGES_AUTO,
  }

  /**
   * Creates a new Posterizer instance
   * @param options - Configuration options
   */
  constructor(options?: PosterizerOptions) {
    this._potrace = new Potrace(options)

    if (options) {
      this.setParameters(options)
    }
  }

  /**
   * Fine tuning to color ranges.
   *
   * If last range (featuring most saturated color) is larger than 10% of color space (25 units)
   * then we want to add another color stop, that hopefully will include darkest pixels, improving presence of
   * shadows and line art
   *
   * @param ranges - Color ranges
   * @returns Modified color ranges
   */
  private _addExtraColorStop(ranges: ColorStop[]): ColorStop[] {
    const blackOnWhite = this._params.blackOnWhite
    const lastColorStop = ranges[ranges.length - 1]
    const lastRangeFrom = blackOnWhite ? 0 : lastColorStop.value
    const lastRangeTo = blackOnWhite ? lastColorStop.value : 255

    if (lastRangeTo - lastRangeFrom > 25 && lastColorStop.colorIntensity !== 1) {
      const histogram = this._getImageHistogram()
      const levels = histogram.getStats(lastRangeFrom, lastRangeTo).levels

      const newColorStop = levels.mean + levels.stdDev <= 25
        ? levels.mean + levels.stdDev
        : levels.mean - levels.stdDev <= 25
          ? levels.mean - levels.stdDev
          : 25

      const newStats = (blackOnWhite
        ? histogram.getStats(0, newColorStop)
        : histogram.getStats(newColorStop, 255))

      const color = newStats.levels.mean

      ranges.push({
        value: Math.abs((blackOnWhite ? 0 : 255) - newColorStop),
        colorIntensity: Number.isNaN(color) ? 0 : ((blackOnWhite ? 255 - color : color) / 255),
      })
    }

    return ranges
  }

  /**
   * Calculates color intensity for each element of numeric array
   *
   * @param colorStops - Array of color thresholds
   * @returns Array of color stops with calculated intensities
   */
  private _calcColorIntensity(colorStops: number[]): ColorStop[] {
    const blackOnWhite = this._params.blackOnWhite
    const colorSelectionStrat = this._params.fillStrategy
    const histogram = colorSelectionStrat !== Posterizer.FILL_SPREAD ? this._getImageHistogram() : null
    const fullRange = Math.abs(this._paramThreshold() - (blackOnWhite ? 0 : 255))

    return colorStops.map((threshold, index) => {
      const nextValue = index + 1 === colorStops.length ? (blackOnWhite ? -1 : 256) : colorStops[index + 1]
      const rangeStart = Math.round(blackOnWhite ? nextValue + 1 : threshold)
      const rangeEnd = Math.round(blackOnWhite ? threshold : nextValue - 1)
      const factor = index / (colorStops.length - 1)
      const intervalSize = rangeEnd - rangeStart

      // Default color to -1, will be calculated based on strategy
      let color = -1

      // No pixels in this range
      if (histogram && histogram.getStats(rangeStart, rangeEnd).pixels === 0) {
        return {
          value: threshold,
          colorIntensity: 0,
        }
      }

      // Calculate color based on selected strategy
      if (colorSelectionStrat === Posterizer.FILL_SPREAD) {
        // We want it to be 0 (255 when white on black) at the most saturated end
        color = (blackOnWhite ? rangeStart : rangeEnd)
          + (blackOnWhite ? 1 : -1) * intervalSize
          * Math.max(0.5, fullRange / 255) * factor
      }
      else if (histogram) {
        if (colorSelectionStrat === Posterizer.FILL_DOMINANT) {
          color = histogram.getDominantColor(
            rangeStart,
            rangeEnd,
            utils.clamp(intervalSize, 1, 5),
          )
        }
        else if (colorSelectionStrat === Posterizer.FILL_MEAN) {
          color = histogram.getStats(rangeStart, rangeEnd).levels.mean
        }
        else if (colorSelectionStrat === Posterizer.FILL_MEDIAN) {
          color = histogram.getStats(rangeStart, rangeEnd).levels.median
        }
      }

      // We don't want colors to be too close to each other, so we introduce some spacing in between
      if (histogram && index !== 0) {
        color = blackOnWhite
          ? utils.clamp(color, rangeStart, rangeEnd - Math.round(intervalSize * 0.1))
          : utils.clamp(color, rangeStart + Math.round(intervalSize * 0.1), rangeEnd)
      }

      return {
        value: threshold,
        colorIntensity: color === -1 ? 0 : ((blackOnWhite ? 255 - color : color) / 255),
      }
    })
  }

  /**
   * Get image histogram
   * @returns Histogram instance
   */
  private _getImageHistogram(): any {
    // Using type assertion to bypass protected property access
    const potrace = this._potrace as any
    if (!potrace._luminanceData) {
      throw new Error('Image data not available')
    }
    return potrace._luminanceData.histogram()
  }

  /**
   * Processes threshold, steps and rangeDistribution parameters and returns normalized array of color stops
   * @returns Array of color stops
   */
  private _getRanges(): ColorStop[] {
    const steps = this._paramSteps()

    if (!Array.isArray(steps)) {
      return this._params.rangeDistribution === Posterizer.RANGES_AUTO
        ? this._getRangesAuto()
        : this._getRangesEquallyDistributed()
    }

    // Steps is array of thresholds and we want to preprocess it
    const colorStops: number[] = []
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

    colorStops.sort((a, b) => {
      return (a < b) === lookingForDarkPixels ? 1 : -1
    })

    if (lookingForDarkPixels && colorStops[0] < threshold) {
      colorStops.unshift(threshold)
    }
    else if (!lookingForDarkPixels && colorStops[colorStops.length - 1] < threshold) {
      colorStops.push(threshold)
    }

    return this._calcColorIntensity(colorStops)
  }

  /**
   * Calculates given (or lower) number of thresholds using automatic thresholding algorithm
   * @returns Array of calculated color stops
   */
  private _getRangesAuto(): ColorStop[] {
    const histogram = this._getImageHistogram()
    let colorStops: number[]

    // Get steps and ensure we have a number
    let numLevels = 4 // Default value
    const stepsParam = this._paramSteps(true)

    if (typeof stepsParam === 'number') {
      numLevels = stepsParam
    }
    else if (Array.isArray(stepsParam)) {
      numLevels = stepsParam.length
    }

    if (this._params.threshold === Potrace.THRESHOLD_AUTO) {
      colorStops = histogram.multilevelThresholding(numLevels)
    }
    else {
      const threshold = this._paramThreshold()
      // One less level since we'll add the threshold itself
      const numLevelsForThresholding = Math.max(1, numLevels - 1)

      colorStops = this._params.blackOnWhite
        ? histogram.multilevelThresholding(numLevelsForThresholding, 0, threshold)
        : histogram.multilevelThresholding(numLevelsForThresholding, threshold, 255)

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
  }

  /**
   * Calculates color stops and color representing each segment, returning them
   * from least to most intense color (black or white, depending on blackOnWhite parameter)
   *
   * @returns Array of calculated color stops
   */
  private _getRangesEquallyDistributed(): ColorStop[] {
    const blackOnWhite = this._params.blackOnWhite
    const colorsToThreshold = blackOnWhite ? this._paramThreshold() : 255 - this._paramThreshold()

    // Ensure steps is a number
    let numSteps = 4 // Default value
    const stepsParam = this._paramSteps()

    if (typeof stepsParam === 'number') {
      numSteps = stepsParam
    }
    else if (Array.isArray(stepsParam)) {
      numSteps = stepsParam.length
    }

    const stepSize = colorsToThreshold / numSteps
    const colorStops: number[] = []

    for (let i = numSteps - 1; i >= 0; i--) {
      const threshold = Math.min(colorsToThreshold, (i + 1) * stepSize)
      colorStops.push(blackOnWhite ? threshold : 255 - threshold)
    }

    return this._calcColorIntensity(colorStops)
  }

  /**
   * Returns valid steps value
   * @param count - Whether to return count of steps or steps array
   * @returns Number of steps or array of steps
   */
  private _paramSteps(count?: boolean): number | number[] {
    const steps = this._params.steps

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
      : Math.min(colorsCount, Math.max(2, steps || 3))
  }

  /**
   * Returns valid threshold value
   * @returns Threshold value
   */
  private _paramThreshold(): number {
    if (this._calculatedThreshold !== null) {
      return this._calculatedThreshold
    }

    if (this._params.threshold !== Potrace.THRESHOLD_AUTO) {
      this._calculatedThreshold = this._params.threshold || 128
      return this._calculatedThreshold
    }

    const histogram = this._getImageHistogram()
    const twoThresholds = histogram.multilevelThresholding(2)
    this._calculatedThreshold = this._params.blackOnWhite
      ? twoThresholds[1]
      : twoThresholds[0]

    this._calculatedThreshold = this._calculatedThreshold || 128
    return this._calculatedThreshold
  }

  /**
   * Running potrace on the image multiple times with different thresholds and returns an array
   * of path tags
   *
   * @param noFillColor - Whether to include fill color
   * @returns Array of SVG path tags
   */
  private _pathTags(noFillColor?: boolean): string[] {
    let ranges = this._getRanges()
    const potrace = this._potrace
    const blackOnWhite = this._params.blackOnWhite
    const color = this._params.color

    if (ranges.length >= 10) {
      ranges = this._addExtraColorStop(ranges)
    }

    potrace.setParameters({ blackOnWhite })

    let actualPrevLayersOpacity = 0

    return ranges.map((colorStop) => {
      const thisLayerOpacity = colorStop.colorIntensity

      if (thisLayerOpacity === 0) {
        return ''
      }

      // Calculate the proper opacity for this layer
      let calculatedOpacity = (!actualPrevLayersOpacity || thisLayerOpacity === 1)
        ? thisLayerOpacity
        : ((actualPrevLayersOpacity - thisLayerOpacity) / (actualPrevLayersOpacity - 1))

      calculatedOpacity = utils.clamp(Number.parseFloat(calculatedOpacity.toFixed(3)), 0, 1)
      actualPrevLayersOpacity = actualPrevLayersOpacity + (1 - actualPrevLayersOpacity) * calculatedOpacity

      potrace.setParameters({
        threshold: colorStop.value,
        color: noFillColor ? '' : color,
      })

      let element = potrace.getPathTag()
      element = utils.setHtmlAttr(element, 'fill-opacity', calculatedOpacity.toFixed(3))

      if (noFillColor) {
        element = utils.setHtmlAttr(element, 'fill', '')
      }

      const canBeIgnored = calculatedOpacity === 0 || element.includes(' d=""')

      return canBeIgnored ? '' : element
    })
  }

  /**
   * Loads image from file, Buffer or Jimp instance
   *
   * @param source - Image source
   * @param callback - Completion callback
   */
  loadImage(source: string | Buffer | any, callback: (err?: Error) => void): void {
    this._potrace.loadImage(source, (err?: Error) => {
      if (err) {
        callback.call(this, err)
        return
      }

      this._calculatedThreshold = null
      callback.call(this)
    })
  }

  /**
   * Set posterizer parameters
   *
   * @param params - Parameters to set
   * @returns this instance for chaining
   */
  setParameters(params: PosterizerOptions): Posterizer {
    if (!params) {
      return this
    }

    // Apply parameters to underlying Potrace instance
    this._potrace.setParameters(params)

    // Validate steps parameter
    if (params.steps && !Array.isArray(params.steps)
      && (!utils.isNumber(params.steps) || !utils.between(params.steps, 1, 255))) {
      throw new Error('Bad \'steps\' value')
    }

    // Apply Posterizer-specific parameters
    for (const key in this._params) {
      if (Object.prototype.hasOwnProperty.call(this._params, key)
        && Object.prototype.hasOwnProperty.call(params, key)) {
        // We know these properties exist and are the same type
        (this._params as any)[key] = (params as any)[key]
      }
    }

    this._calculatedThreshold = null
    return this
  }

  /**
   * Returns image as <symbol> tag. Always has viewBox specified
   *
   * @param id - Symbol ID
   * @returns SVG symbol element
   */
  getSymbol(id: string): string {
    // Using type assertion to bypass protected property access
    const potrace = this._potrace as any
    if (!potrace._luminanceData) {
      throw new Error('Image data not available')
    }

    const width = potrace._luminanceData.width
    const height = potrace._luminanceData.height
    const paths = this._pathTags(true)

    return `<symbol viewBox="0 0 ${width} ${height}" id="${id}">${
      paths.join('')
    }</symbol>`
  }

  /**
   * Generates SVG image
   * @returns SVG image content
   */
  getSVG(): string {
    // Using type assertion to bypass protected property access
    const potrace = this._potrace as any
    if (!potrace._luminanceData) {
      throw new Error('Image data not available')
    }

    const width = potrace._luminanceData.width
    const height = potrace._luminanceData.height
    const tags = this._pathTags(false)

    let svg = '<svg xmlns="http://www.w3.org/2000/svg" '
      + `width="${width}" `
      + `height="${height}" `
      + `viewBox="0 0 ${width} ${height}" `
      + 'version="1.1">\n\t'

    if (this._params.background !== Potrace.COLOR_TRANSPARENT) {
      svg += `<rect x="0" y="0" width="100%" height="100%" fill="${this._params.background}" />\n\t`
    }

    svg += `${tags.join('\n\t')}\n</svg>`

    // Clean up empty newlines but preserve indentation
    return svg.replace(/\n(?:\t*\n)+(\t*)/g, '\n$1')
  }
}

/**
 * Callback for posterize method
 */
export type PosterizeCallback = (
  err: Error | null,
  svg?: string,
  instance?: Posterizer
) => void

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param file - Source image, file path or Jimp instance
 * @param options - Optional Posterizer options
 * @param cb - Callback function
 */
export function posterize(
  file: string | Buffer | any, // Using 'any' for Jimp to avoid type reference issues
  options: PosterizerOptions | PosterizeCallback,
  cb?: PosterizeCallback,
): void {
  if (arguments.length === 2) {
    cb = options as PosterizeCallback
    options = {}
  }

  const posterizer = new Posterizer(options as PosterizerOptions)

  posterizer.loadImage(file, (err) => {
    if (err) {
      return (cb as PosterizeCallback).call(posterizer, err)
    }

    (cb as PosterizeCallback).call(posterizer, null, posterizer.getSVG(), posterizer)
  })
}
