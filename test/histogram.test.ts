import { beforeAll, describe, expect, test } from 'bun:test'
import * as path from 'node:path'
import { Jimp } from 'jimp'
import { Histogram } from '../src/types/Histogram'

const PATH_TO_LENNA = path.join(import.meta.dir, 'sources/Lenna.png')

describe('Histogram class', () => {
  let histogram: Histogram
  let blackImage: typeof Jimp.prototype
  let whiteImage: typeof Jimp.prototype
  let blackHistogram: Histogram
  let whiteHistogram: Histogram

  beforeAll(async () => {
    // Create black and white test images
    blackImage = new Jimp({ width: 100, height: 100, color: 0x000000FF })
    whiteImage = new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF })
    blackHistogram = new Histogram(blackImage, Histogram.MODE_LUMINANCE)
    whiteHistogram = new Histogram(whiteImage, Histogram.MODE_LUMINANCE)

    // Load test image
    const img = await Jimp.read(PATH_TO_LENNA)
    histogram = new Histogram(img, Histogram.MODE_LUMINANCE)
    return Promise.resolve()
  })

  describe('getDominantColor', () => {
    test('gives different results with different tolerance values', () => {
      expect(histogram.getDominantColor(0, 255)).toBe(148)
      expect(histogram.getDominantColor(0, 255, 10)).toBe(143)
    })

    test('has default argument values of 0, 255 and 1', () => {
      expect(histogram.getDominantColor()).toBe(histogram.getDominantColor(0, 255, 1))
    })

    test('works for a segment of histogram', () => {
      expect(histogram.getDominantColor(20, 80)).toBe(41)
    })

    test('does not fail when min and max values are the same', () => {
      expect(histogram.getDominantColor(42, 42)).toBe(42)
    })

    test('returns -1 if colors from the range are not present on image', () => {
      expect(histogram.getDominantColor(0, 15)).toBe(-1)
      expect(histogram.getDominantColor(7, 7, 1)).toBe(-1)
    })

    test('throws error if range start is larger than range end', () => {
      expect(() => histogram.getDominantColor(80, 20)).toThrow()
    })

    test('behaves predictably in edge cases', () => {
      expect(blackHistogram.getDominantColor(0, 255)).toBe(0)
      expect(whiteHistogram.getDominantColor(0, 255)).toBe(255)
      expect(whiteHistogram.getDominantColor(25, 235)).toBe(-1)

      // Tolerance should not affect returned value
      expect(blackHistogram.getDominantColor(0, 255, 15)).toBe(0)
      expect(whiteHistogram.getDominantColor(0, 255, 15)).toBe(255)
    })
  })

  describe('getStats', () => {
    function toFixedDeep(stats: any, fractionalDigits: number) {
      if (typeof stats !== 'object' || stats === null) {
        return stats
      }

      const result: any = Array.isArray(stats) ? [] : {}

      for (const key in stats) {
        const val = stats[key]
        if (typeof val === 'number' && !Number.isInteger(val)) {
          result[key] = Number.parseFloat(val.toFixed(fractionalDigits))
        }
        else if (typeof val === 'object' && val !== null) {
          result[key] = toFixedDeep(val, fractionalDigits)
        }
        else {
          result[key] = val
        }
      }

      return result
    }

    test('produces expected stats object for entire histogram', () => {
      const expectedValue = {
        levels: {
          mean: 116.7674,
          median: 120,
          stdDev: 49.4221,
          unique: 222,
        },
        pixelsPerLevel: {
          mean: 1180.8288,
          median: 1069,
          peak: 2495,
        },
        pixels: 262144,
      }

      expect(
        toFixedDeep(histogram.getStats(), 4),
      ).toEqual(
        toFixedDeep(expectedValue, 4),
      )
    })

    test('produces expected stats object for histogram segment', () => {
      const expectedValue = {
        levels: {
          mean: 121.8968,
          median: 124,
          stdDev: 30.2467,
          unique: 121,
        },
        pixelsPerLevel: {
          mean: 1541.6446,
          median: 1539,
          peak: 2495,
        },
        pixels: 186539,
      }

      expect(
        toFixedDeep(histogram.getStats(60, 180), 4),
      ).toEqual(
        toFixedDeep(expectedValue, 4),
      )
    })

    test('throws error if range start is larger than range end', () => {
      expect(() => histogram.getStats(255, 123)).toThrow()
    })

    test('behaves predictably in edge cases', () => {
      const blackImageStats = blackHistogram.getStats()
      const whiteImageStats = whiteHistogram.getStats()

      expect(blackImageStats.levels.mean).toBe(blackImageStats.levels.median)
      expect(whiteImageStats.levels.mean).toBe(whiteImageStats.levels.median)

      expect(blackHistogram.getStats(25, 235)).toEqual(whiteHistogram.getStats(25, 235))
    })
  })

  describe('multilevelThresholding', () => {
    test('calculates correct thresholds', () => {
      expect(histogram.multilevelThresholding(1)).toEqual([111])
      expect(histogram.multilevelThresholding(2)).toEqual([92, 154])
      expect(histogram.multilevelThresholding(3)).toEqual([73, 121, 168])
    })

    test('works for histogram segment', () => {
      expect(histogram.multilevelThresholding(2, 60, 180)).toEqual([75, 125])
    })

    test('calculates as many thresholds as can be fit in given range', () => {
      expect(histogram.multilevelThresholding(2, 102, 106)).toEqual([103, 104])
      expect(histogram.multilevelThresholding(2, 103, 106)).toEqual([104])
    })

    test('returns empty array if no colors from histogram segment is present on the image', () => {
      expect(histogram.multilevelThresholding(3, 2, 14)).toEqual([])
    })

    test('throws error if range start is larger than range end', () => {
      expect(() => histogram.multilevelThresholding(2, 180, 60)).toThrow()
    })
  })

  test('autoThreshold calculates correct threshold value', () => {
    // Test the autoThreshold method which might be used in Potrace class
    const threshold = histogram.autoThreshold()
    expect(threshold).toBeGreaterThan(0)
    expect(threshold).toBeLessThan(256)
  })
})
