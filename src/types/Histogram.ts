// Histogram

import type { HistogramStats } from '../types'
import Jimp from 'jimp'
import * as utils from '../utils'
import { Bitmap } from './Bitmap'

const COLOR_DEPTH = 256
const COLOR_RANGE_END = COLOR_DEPTH - 1

/**
 * Calculates array index for pair of indexes.
 * We multiple column (x) by 256 and then add row to it,
 * this way `(index(i, j) + 1) === index(i, j + i)` thus we can reuse `index(i, j)` we once calculated
 *
 * Note: this is different from how indexes calculated in {@link Bitmap} class, keep it in mind.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Calculated index
 * @private
 */
function index(x: number, y: number): number {
  return COLOR_DEPTH * x + y
}

/**
 * Shared parameter normalization for methods 'multilevelThresholding', 'autoThreshold', 'getDominantColor' and 'getStats'
 *
 * @param levelMin - Minimum level
 * @param levelMax - Maximum level
 * @returns Normalized levels
 * @private
 */
function normalizeMinMax(levelMin?: number, levelMax?: number): [number, number] {
  const min = typeof levelMin === 'number' ? utils.clamp(Math.round(levelMin), 0, COLOR_RANGE_END) : 0
  const max = typeof levelMax === 'number' ? utils.clamp(Math.round(levelMax), 0, COLOR_RANGE_END) : COLOR_RANGE_END

  if (min > max) {
    throw new Error(`Invalid range "${min}...${max}"`)
  }

  return [min, max]
}

/**
 * 1D Histogram
 */
export class Histogram {
  static MODE_LUMINANCE = 'luminance' as const
  static MODE_SATURATION = 'saturation' as const
  static MODE_R = 'r' as const
  static MODE_G = 'g' as const
  static MODE_B = 'b' as const

  data: Uint8Array | Uint16Array | Uint32Array
  pixels: number
  private _sortedIndexes: number[] | null = null
  private _cachedStats: Record<string, HistogramStats> = {}
  private _lookupTableH: Float64Array | null = null

  /**
   * Creates a histogram from an image source
   * @param imageSource - Image to collect pixel data from, or integer to create empty histogram
   * @param mode - Used only for Jimp images
   */
  constructor(imageSource: number | Bitmap | any, mode?: 'luminance' | 'saturation' | 'r' | 'g' | 'b') {
    this.data = null!
    this.pixels = 0

    if (typeof imageSource === 'number') {
      this._createArray(imageSource)
    }
    else if (imageSource instanceof Bitmap) {
      this._collectValuesBitmap(imageSource)
    }
    else if (imageSource?.bitmap) {
      this._collectValuesJimp(imageSource, mode || Histogram.MODE_LUMINANCE)
    }
    else {
      throw new Error('Unsupported image source')
    }
  }

  /**
   * Initializes data array for an image of given pixel size
   * @param imageSize - Size of the image in pixels
   * @returns Created array
   * @private
   */
  private _createArray(imageSize: number): Uint8Array | Uint16Array | Uint32Array {
    const ArrayType = imageSize <= 2 ** 8
      ? Uint8Array
      : imageSize <= 2 ** 16 ? Uint16Array : Uint32Array

    this.pixels = imageSize

    return this.data = new ArrayType(COLOR_DEPTH)
  }

  /**
   * Aggregates color data from Jimp instance
   * @param source - Jimp image
   * @param mode - Color mode
   * @private
   */
  private _collectValuesJimp(source: any, mode: 'luminance' | 'saturation' | 'r' | 'g' | 'b'): void {
    const pixelData = source.bitmap.data
    const data = this._createArray(source.bitmap.width * source.bitmap.height)

    source.scan(0, 0, source.bitmap.width, source.bitmap.height, (x: number, y: number, idx: number) => {
      const val = mode === Histogram.MODE_R
        ? pixelData[idx]
        : mode === Histogram.MODE_G
          ? pixelData[idx + 1]
          : mode === Histogram.MODE_B
            ? pixelData[idx + 2]
            : utils.luminance(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2])

      data[val]++
    })
  }

  /**
   * Aggregates color data from Bitmap instance
   * @param source - Bitmap image
   * @private
   */
  private _collectValuesBitmap(source: Bitmap): void {
    const data = this._createArray(source.size)
    const len = source.data.length
    let color: number

    for (let i = 0; i < len; i++) {
      color = source.data[i]
      data[color]++
    }
  }

  /**
   * Returns array of color indexes in ascending order
   * @param refresh - Whether to recalculate indexes
   * @returns Sorted indexes
   * @private
   */
  private _getSortedIndexes(refresh?: boolean): number[] {
    if (!refresh && this._sortedIndexes) {
      return this._sortedIndexes
    }

    const data = this.data
    const indexes: number[] = Array.from({ length: COLOR_DEPTH }).map((_, i) => i)

    indexes.sort((a, b) => {
      return data[a] > data[b] ? 1 : data[a] < data[b] ? -1 : 0
    })

    this._sortedIndexes = indexes
    return indexes
  }

  /**
   * Builds lookup table H from lookup tables P and S.
   * See http://www.iis.sinica.edu.tw/page/jise/2001/200109_01.pdf for more details
   *
   * @returns Lookup table as Float64Array
   * @private
   */
  private _thresholdingBuildLookupTable(): Float64Array {
    const P = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const S = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const H = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const pixelsTotal = this.pixels
    let i, j, idx, tmp

    // diagonal
    for (i = 1; i < COLOR_DEPTH; ++i) {
      idx = index(i, i)
      tmp = this.data[i] / pixelsTotal

      P[idx] = tmp
      S[idx] = i * tmp
    }

    // calculate first row (row 0 is all zero)
    for (i = 1; i < COLOR_DEPTH - 1; ++i) {
      tmp = this.data[i + 1] / pixelsTotal
      idx = index(1, i)

      P[idx + 1] = P[idx] + tmp
      S[idx + 1] = S[idx] + (i + 1) * tmp
    }

    // using row 1 to calculate others
    for (i = 2; i < COLOR_DEPTH; i++) {
      for (j = i + 1; j < COLOR_DEPTH; j++) {
        P[index(i, j)] = P[index(1, j)] - P[index(1, i - 1)]
        S[index(i, j)] = S[index(1, j)] - S[index(1, i - 1)]
      }
    }

    // now calculate H[i][j]
    for (i = 1; i < COLOR_DEPTH; ++i) {
      for (j = i + 1; j < COLOR_DEPTH; j++) {
        idx = index(i, j)
        H[idx] = P[idx] !== 0 ? S[idx] * S[idx] / P[idx] : 0
      }
    }

    return this._lookupTableH = H
  }

  /**
   * Implements Algorithm For Multilevel Thresholding
   * Receives desired number of color stops, returns array of said size.
   * Could be limited to a range levelMin..levelMax
   *
   * Regardless of levelMin and levelMax values it still relies on between class variances for the entire histogram
   *
   * @param amount - How many thresholds should be calculated
   * @param levelMin - Histogram segment start (default: 0)
   * @param levelMax - Histogram segment end (default: 255)
   * @returns Array of thresholds
   */
  multilevelThresholding(amount: number, levelMin?: number, levelMax?: number): number[] {
    const [min, max] = normalizeMinMax(levelMin, levelMax)
    const validAmount = Math.min(max - min - 2, ~~amount)

    if (validAmount < 1) {
      return []
    }

    if (!this._lookupTableH) {
      this._thresholdingBuildLookupTable()
    }

    const H = this._lookupTableH!
    let colorStops: number[] | null = null
    let maxSig = 0

    if (validAmount > 4) {
      console.warn('[Warning]: Threshold computation for more than 5 levels may take a long time')
    }

    function iterateRecursive(startingPoint: number = 0, prevVariance: number = 0, indexes: number[] = Array.from({ length: validAmount }), previousDepth: number = 0) {
      startingPoint = (startingPoint || 0) + 1
      const depth = previousDepth + 1 // t
      let variance: number

      for (let i = startingPoint; i < max - validAmount + previousDepth; i++) {
        variance = prevVariance + H[index(startingPoint, i)]
        indexes[depth - 1] = i

        if (depth + 1 < validAmount + 1) {
          // we need to go deeper
          iterateRecursive(i, variance, indexes, depth)
        }
        else {
          // enough, we can compare values now
          variance += H[index(i + 1, max)]

          if (maxSig < variance) {
            maxSig = variance
            colorStops = indexes.slice()
          }
        }
      }
    }

    iterateRecursive(min || 0)

    return colorStops || []
  }

  /**
   * Automatically finds threshold value using Algorithm For Multilevel Thresholding
   *
   * @param levelMin - Range minimum
   * @param levelMax - Range maximum
   * @returns Threshold value or null if none found
   */
  autoThreshold(levelMin?: number, levelMax?: number): number | null {
    const value = this.multilevelThresholding(1, levelMin, levelMax)
    return value.length ? value[0] : null
  }

  /**
   * Returns dominant color in given range.
   * Returns -1 if not a single color from the range present on the image
   *
   * @param levelMin - Range minimum (default: 0)
   * @param levelMax - Range maximum (default: 255)
   * @param tolerance - How many adjacent intensity values to check (default: 1)
   * @returns Dominant color or -1 if none found
   */
  getDominantColor(levelMin?: number, levelMax?: number, tolerance: number = 1): number {
    const [min, max] = normalizeMinMax(levelMin, levelMax)
    const colors = this.data
    let dominantIndex = -1
    let dominantValue = -1
    let tmp: number

    if (min === max) {
      return colors[min] ? min : -1
    }

    for (let i = min; i <= max; i++) {
      tmp = 0

      for (let j = ~~(tolerance / -2); j < tolerance; j++) {
        tmp += utils.between(i + j, 0, COLOR_RANGE_END) ? colors[i + j] : 0
      }

      const summIsBigger = tmp > dominantValue
      const summEqualButMainColorIsBigger = dominantValue === tmp && (dominantIndex < 0 || colors[i] > colors[dominantIndex])

      if (summIsBigger || summEqualButMainColorIsBigger) {
        dominantIndex = i
        dominantValue = tmp
      }
    }

    return dominantValue <= 0 ? -1 : dominantIndex
  }

  /**
   * Returns stats for histogram or its segment.
   *
   * Returned object contains median, mean and standard deviation for pixel values;
   * peak, mean and median number of pixels per level and few other values
   *
   * If no pixels colors from specified range present on the image - most values will be NaN
   *
   * @param levelMin - Histogram segment start (default: 0)
   * @param levelMax - Histogram segment end (default: 255)
   * @param refresh - If cached result can be returned
   * @returns Stats object
   */
  getStats(levelMin?: number, levelMax?: number, refresh?: boolean): HistogramStats {
    const [min, max] = normalizeMinMax(levelMin, levelMax)

    if (!refresh && this._cachedStats[`${min}-${max}`]) {
      return this._cachedStats[`${min}-${max}`]
    }

    const data = this.data
    const sortedIndexes = this._getSortedIndexes()

    let pixelsTotal = 0
    let medianValue: number | null = null
    let tmpSumOfDeviations = 0
    let tmpPixelsIterated = 0
    let allPixelValuesCombined = 0
    let tmpPixels: number, tmpPixelValue: number

    let uniqueValues = 0 // counter for levels that's represented by at least one pixel
    let mostPixelsPerLevel = 0

    // Finding number of pixels and mean
    for (let i = min; i <= max; i++) {
      pixelsTotal += data[i]
      allPixelValuesCombined += data[i] * i

      uniqueValues += data[i] === 0 ? 0 : 1

      if (mostPixelsPerLevel < data[i]) {
        mostPixelsPerLevel = data[i]
      }
    }

    const meanValue = allPixelValuesCombined / pixelsTotal
    const pixelsPerLevelMean = pixelsTotal / (max - min)
    const pixelsPerLevelMedian = pixelsTotal / uniqueValues
    const medianPixelIndex = Math.floor(pixelsTotal / 2)

    // Finding median and standard deviation
    for (let i = 0; i < COLOR_DEPTH; i++) {
      tmpPixelValue = sortedIndexes[i]
      tmpPixels = data[tmpPixelValue]

      if (tmpPixelValue < min || tmpPixelValue > max) {
        continue
      }

      tmpPixelsIterated += tmpPixels
      tmpSumOfDeviations += (tmpPixelValue - meanValue) ** 2 * tmpPixels

      if (medianValue === null && tmpPixelsIterated >= medianPixelIndex) {
        medianValue = tmpPixelValue
      }
    }

    // Use 0 for median if none found
    const safeMedian = medianValue !== null ? medianValue : 0

    return this._cachedStats[`${min}-${max}`] = {
      // various pixel counts for levels (0..255)
      levels: {
        mean: meanValue,
        median: safeMedian,
        stdDev: Math.sqrt(tmpSumOfDeviations / pixelsTotal),
        unique: uniqueValues,
      },

      // what's visually represented as bars
      pixelsPerLevel: {
        mean: pixelsPerLevelMean,
        median: pixelsPerLevelMedian,
        peak: mostPixelsPerLevel,
      },

      pixels: pixelsTotal,
    }
  }
}

export default Histogram
