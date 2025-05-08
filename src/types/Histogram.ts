import type { Jimp } from 'jimp'
import * as utils from '../utils'
import { Bitmap } from './Bitmap'

export type HistogramMode = 'luminance' | 'r' | 'g' | 'b'

const COLOR_DEPTH = 256
const COLOR_RANGE_END = COLOR_DEPTH - 1

/**
 * Calculates array index for pair of indexes
 * We multiple column (x) by 256 and then add row to it,
 * this way `(index(i, j) + 1) === index(i, j + i)` so we can reuse calculated indexes
 *
 * Note: this is different from how indexes calculated in Bitmap class
 */
function index(x: number, y: number): number {
  return COLOR_DEPTH * x + y
}

/**
 * Shared parameter normalization for methods that use min/max levels
 */
function normalizeMinMax(levelMin?: number, levelMax?: number): [number, number] {
  const minLevel = typeof levelMin === 'number'
    ? utils.clamp(Math.round(levelMin), 0, COLOR_RANGE_END)
    : 0

  const maxLevel = typeof levelMax === 'number'
    ? utils.clamp(Math.round(levelMax), 0, COLOR_RANGE_END)
    : COLOR_RANGE_END

  if (minLevel > maxLevel) {
    throw new Error(`Invalid range "${minLevel}...${maxLevel}"`)
  }

  return [minLevel, maxLevel]
}

interface HistogramStats {
  pixels: number
  levels: {
    mean: number
    median: number
    stdDev: number
    unique: number
  }
  pixelsPerLevel: {
    mean: number
    median: number
    peak: number
  }
}

/**
 * 1D Histogram for image data analysis
 */
export class Histogram {
  static readonly MODE_LUMINANCE: HistogramMode = 'luminance'
  static readonly MODE_R: HistogramMode = 'r'
  static readonly MODE_G: HistogramMode = 'g'
  static readonly MODE_B: HistogramMode = 'b'

  data: Uint8Array | Uint16Array | Uint32Array | null = null
  pixels = 0
  private _sortedIndexes: number[] | null = null
  private _cachedStats: Record<string, HistogramStats> = {}
  private _lookupTableH: Float64Array | null = null

  /**
   * Create a histogram from an image source or create an empty one
   *
   * @param imageSource - Image to collect data from or size to create empty histogram
   * @param mode - Color channel mode (for Jimp instances)
   */
  constructor(imageSource: number | Bitmap | Jimp, mode?: HistogramMode) {
    if (typeof imageSource === 'number') {
      this._createArray(imageSource)
    }
    else if (imageSource instanceof Bitmap) {
      this._collectValuesBitmap(imageSource)
    }
    else if (typeof imageSource === 'object' && 'bitmap' in imageSource) {
      this._collectValuesJimp(imageSource, mode || Histogram.MODE_LUMINANCE)
    }
    else {
      throw new Error('Unsupported image source')
    }
  }

  /**
   * Initializes data array for an image of given pixel size
   */
  private _createArray(imageSize: number): Uint8Array | Uint16Array | Uint32Array {
    const ArrayType = imageSize <= 2 ** 8
      ? Uint8Array
      : imageSize <= 2 ** 16
        ? Uint16Array
        : Uint32Array

    this.pixels = imageSize
    this.data = new ArrayType(COLOR_DEPTH)
    return this.data
  }

  /**
   * Aggregates color data from Jimp instance
   */
  private _collectValuesJimp(source: Jimp, mode: HistogramMode): void {
    const pixelData = source.bitmap.data
    const data = this._createArray(source.bitmap.width * source.bitmap.height)

    // Jimp has a scan method to iterate over every pixel
    source.scan(0, 0, source.bitmap.width, source.bitmap.height, (x: number, y: number, idx: number) => {
      let val: number

      if (mode === Histogram.MODE_R) {
        val = pixelData[idx]
      }
      else if (mode === Histogram.MODE_G) {
        val = pixelData[idx + 1]
      }
      else if (mode === Histogram.MODE_B) {
        val = pixelData[idx + 2]
      }
      else {
        val = utils.luminance(
          pixelData[idx],
          pixelData[idx + 1],
          pixelData[idx + 2],
        )
      }

      data[val]++
    })
  }

  /**
   * Aggregates color data from Bitmap instance
   */
  private _collectValuesBitmap(source: Bitmap): void {
    const data = this._createArray(source.size)
    const len = source.data.length

    for (let i = 0; i < len; i++) {
      const color = source.data[i]
      data[color]++
    }
  }

  /**
   * Returns array of color indexes in ascending order
   */
  private _getSortedIndexes(refresh?: boolean): number[] {
    if (!refresh && this._sortedIndexes) {
      return this._sortedIndexes
    }

    const data = this.data!
    const indexes = Array.from({ length: COLOR_DEPTH }, (_, i) => i)

    indexes.sort((a, b) => {
      return data[a] > data[b] ? 1 : data[a] < data[b] ? -1 : 0
    })

    this._sortedIndexes = indexes
    return indexes
  }

  /**
   * Builds lookup table H from lookup tables P and S.
   * Used for multilevel thresholding
   */
  private _thresholdingBuildLookupTable(): Float64Array {
    const P = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const S = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const H = new Float64Array(COLOR_DEPTH * COLOR_DEPTH)
    const pixelsTotal = this.pixels

    // diagonal
    for (let i = 1; i < COLOR_DEPTH; ++i) {
      const idx = index(i, i)
      const tmp = this.data![i] / pixelsTotal

      P[idx] = tmp
      S[idx] = i * tmp
    }

    // calculate first row (row 0 is all zero)
    for (let i = 1; i < COLOR_DEPTH - 1; ++i) {
      const tmp = this.data![i + 1] / pixelsTotal
      const idx = index(1, i)

      P[idx + 1] = P[idx] + tmp
      S[idx + 1] = S[idx] + (i + 1) * tmp
    }

    // using row 1 to calculate others
    for (let i = 2; i < COLOR_DEPTH; i++) {
      for (let j = i + 1; j < COLOR_DEPTH; j++) {
        P[index(i, j)] = P[index(1, j)] - P[index(1, i - 1)]
        S[index(i, j)] = S[index(1, j)] - S[index(1, i - 1)]
      }
    }

    // now calculate H[i][j]
    for (let i = 1; i < COLOR_DEPTH; ++i) {
      for (let j = i + 1; j < COLOR_DEPTH; j++) {
        const idx = index(i, j)
        H[idx] = P[idx] !== 0 ? S[idx] * S[idx] / P[idx] : 0
      }
    }

    return this._lookupTableH = H
  }

  /**
   * Implements Algorithm For Multilevel Thresholding
   * Receives desired number of color stops, returns array of said size.
   * Can be limited to a range levelMin..levelMax
   *
   * @param amount - How many thresholds should be calculated
   * @param levelMin - Histogram segment start
   * @param levelMax - Histogram segment end
   * @returns Array of threshold values
   */
  multilevelThresholding(amount: number, levelMin?: number, levelMax?: number): number[] {
    [levelMin, levelMax] = normalizeMinMax(levelMin, levelMax)
    amount = Math.min(levelMax - levelMin - 2, Math.floor(amount))

    if (amount < 1) {
      return []
    }

    if (!this._lookupTableH) {
      this._thresholdingBuildLookupTable()
    }

    const H = this._lookupTableH!
    let colorStops: number[] | null = null
    let maxSig = 0

    if (amount > 4) {
      console.warn('Threshold computation for more than 5 levels may take a long time')
    }

    /**
     * Recursive function to find optimal thresholds
     */
    const iterateRecursive = (
      startingPoint: number,
      prevVariance: number,
      indexes: number[],
      previousDepth: number,
    ): void => {
      if (previousDepth === amount) {
        // If variance is better than what we've seen before, use these values
        if (prevVariance > maxSig) {
          maxSig = prevVariance
          colorStops = indexes.slice()
        }
        return
      }

      // Start from the next threshold
      for (let i = startingPoint + 1; i < levelMax; i++) {
        // Create a new array with the current index added
        const newIndexes = indexes.slice()
        newIndexes.push(i)

        // Calculate the variance for this set of thresholds
        let variance = 0
        let s = 0
        let e = newIndexes[0]

        // Add variance for the first segment
        variance += H[index(s + 1, e)]

        // Add variance for middle segments
        for (let j = 0; j < newIndexes.length - 1; j++) {
          s = newIndexes[j]
          e = newIndexes[j + 1]
          variance += H[index(s + 1, e)]
        }

        // Add variance for the last segment
        s = newIndexes[newIndexes.length - 1]
        e = levelMax
        variance += H[index(s + 1, e)]

        // Continue recursion
        iterateRecursive(i, variance, newIndexes, previousDepth + 1)
      }
    }

    // Start recursive search for optimal thresholds
    iterateRecursive(levelMin, 0, [], 0)

    return colorStops || []
  }

  /**
   * Automatic threshold detection using between-class variance method
   *
   * @param levelMin - Histogram segment start
   * @param levelMax - Histogram segment end
   * @returns Calculated threshold value or -1 if none found
   */
  autoThreshold(levelMin?: number, levelMax?: number): number {
    const thresholds = this.multilevelThresholding(1, levelMin, levelMax)
    return thresholds.length ? thresholds[0] : -1
  }

  /**
   * Returns the color value that appears most often in the image
   *
   * @param levelMin - Histogram segment start
   * @param levelMax - Histogram segment end
   * @param tolerance - Higher values allow finding peaks that are separated by noise
   * @returns The most dominant color value in the range or -1 if none found
   */
  getDominantColor(levelMin?: number, levelMax?: number, tolerance = 1): number {
    [levelMin, levelMax] = normalizeMinMax(levelMin, levelMax)
    const data = this.data!

    let bestVal = -1
    let bestFreq = 0

    // Search for the most frequent color value within the range
    for (let i = levelMin; i <= levelMax; i++) {
      // Skip colors not present in the image
      if (data[i] === 0)
        continue

      let freq = data[i]
      let count = 1

      // If tolerance > 0, include neighboring colors' frequencies too
      for (let j = 1; j <= tolerance; j++) {
        if (i - j >= levelMin) {
          freq += data[i - j]
          count++
        }
        if (i + j <= levelMax) {
          freq += data[i + j]
          count++
        }
      }

      // Average the frequency over the considered color values
      freq /= count

      // Update best value if this one is more frequent
      if (freq > bestFreq) {
        bestFreq = freq
        bestVal = i
      }
    }

    return bestVal
  }

  /**
   * Calculate statistics for the histogram or a segment of it
   *
   * @param levelMin - Histogram segment start
   * @param levelMax - Histogram segment end
   * @param refresh - Whether to recalculate stats instead of using cached values
   * @returns Statistics for the histogram segment
   */
  getStats(levelMin?: number, levelMax?: number, refresh?: boolean): HistogramStats {
    [levelMin, levelMax] = normalizeMinMax(levelMin, levelMax)

    // Create cache key
    const cacheKey = `${levelMin}-${levelMax}`

    // Return cached results if available and not forced to recalculate
    if (!refresh && this._cachedStats[cacheKey]) {
      return this._cachedStats[cacheKey]
    }

    const data = this.data!
    let pixelsInRange = 0
    let levelsInRange = 0
    let sum = 0
    let peak = 0
    const pixelsPerLevel: number[] = []

    // First pass - collect basic info
    for (let i = levelMin; i <= levelMax; i++) {
      const pixelCount = data[i]

      if (pixelCount > 0) {
        pixelsInRange += pixelCount
        levelsInRange++
        sum += i * pixelCount
        peak = Math.max(peak, pixelCount)
        pixelsPerLevel.push(pixelCount)
      }
    }

    // Calculate mean level (weighted average)
    const meanValue = pixelsInRange > 0 ? sum / pixelsInRange : 0

    // Calculate standard deviation
    let variance = 0
    for (let i = levelMin; i <= levelMax; i++) {
      if (data[i] > 0) {
        variance += (i - meanValue) ** 2 * data[i]
      }
    }
    const stdDev = pixelsInRange > 0 ? Math.sqrt(variance / pixelsInRange) : 0

    // Calculate median level
    const medianPixelIndex = Math.floor(pixelsInRange / 2)
    let medianLevel = 0
    let counted = 0

    for (let i = levelMin; i <= levelMax; i++) {
      counted += data[i]
      if (counted >= medianPixelIndex) {
        medianLevel = i
        break
      }
    }

    // Calculate mean and median pixels per level
    const pixelsPerLevelMean = pixelsInRange / (levelsInRange || 1)
    pixelsPerLevel.sort((a, b) => a - b)
    const pixelsPerLevelMedian = pixelsPerLevel.length > 0
      ? pixelsPerLevel[Math.floor(pixelsPerLevel.length / 2)]
      : 0

    // Create the stats object
    const stats: HistogramStats = {
      pixels: pixelsInRange,
      levels: {
        mean: meanValue,
        median: medianLevel,
        stdDev,
        unique: levelsInRange,
      },
      pixelsPerLevel: {
        mean: pixelsPerLevelMean,
        median: pixelsPerLevelMedian,
        peak,
      },
    }

    // Cache the results
    this._cachedStats[cacheKey] = stats
    return stats
  }
}
