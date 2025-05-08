import * as utils from '../utils'
import { Histogram } from './Histogram'
import { Point } from './Point'

/**
 * Represents a bitmap where each pixel can be a number in range of 0..255
 * Used internally to store luminance data.
 */
export class Bitmap {
  private _histogram: Histogram | null = null

  width: number
  height: number
  size: number
  arrayBuffer: ArrayBuffer
  data: Uint8Array

  /**
   * @param w - Width of the bitmap
   * @param h - Height of the bitmap
   */
  constructor(w: number, h: number) {
    this.width = w
    this.height = h
    this.size = w * h
    this.arrayBuffer = new ArrayBuffer(this.size)
    this.data = new Uint8Array(this.arrayBuffer)
  }

  /**
   * Returns pixel value
   *
   * @param x - index, point or x
   * @param y - optional y coordinate
   */
  getValueAt(x: number | Point, y?: number): number {
    const index = (typeof x === 'number' && typeof y !== 'number')
      ? x
      : this.pointToIndex(x, y)
    return this.data[index]
  }

  /**
   * Converts index to Point
   *
   * @param index - Index in the bitmap
   * @returns Point corresponding to the index
   */
  indexToPoint(index: number): Point {
    const point = new Point()

    if (utils.between(index, 0, this.size)) {
      point.y = Math.floor(index / this.width)
      point.x = index - point.y * this.width
    }
    else {
      point.x = -1
      point.y = -1
    }

    return point
  }

  /**
   * Calculates index for point or coordinate pair
   *
   * @param pointOrX - Point or x coordinate
   * @param y - Optional y coordinate (when pointOrX is x coordinate)
   * @returns Index in the bitmap
   */
  pointToIndex(pointOrX: number | Point, y?: number): number {
    let _x: number
    let _y: number

    if (pointOrX instanceof Point) {
      _x = pointOrX.x
      _y = pointOrX.y
    }
    else {
      _x = pointOrX
      _y = y as number
    }

    if (!utils.between(_x, 0, this.width) || !utils.between(_y, 0, this.height)) {
      return -1
    }

    return this.width * _y + _x
  }

  /**
   * Makes a copy of current bitmap
   *
   * @param iterator - Optional callback, used for processing pixel value
   * @returns New bitmap with processed values
   */
  copy(iterator?: (value: number, index: number) => number): Bitmap {
    const bm = new Bitmap(this.width, this.height)
    const iteratorPresent = typeof iterator === 'function'

    for (let i = 0; i < this.size; i++) {
      bm.data[i] = iteratorPresent ? iterator!(this.data[i], i) : this.data[i]
    }

    return bm
  }

  /**
   * Get histogram for this bitmap
   * @returns Histogram instance
   */
  histogram(): Histogram {
    if (this._histogram) {
      return this._histogram
    }

    this._histogram = new Histogram(this)
    return this._histogram
  }
}
