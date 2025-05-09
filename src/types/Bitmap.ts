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
   * @param w - Width of bitmap
   * @param h - Height of bitmap
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
   * @param y - y coordinate if first param is x
   * @returns Pixel value (0-255)
   */
  getValueAt(x: number | Point, y?: number): number {
    if (x instanceof Point) {
      y = x.y
      x = x.x
    }

    if (y !== undefined) {
      x = this.pointToIndex(x as number, y)
    }

    return this.data[x as number]
  }

  /**
   * Sets pixel value
   *
   * @param x - index, point or x
   * @param y - y coordinate if first param is x or value if first param is index
   * @param value - value
   * @returns this
   */
  setValueAt(x: number | Point, y: number, value?: number): this {
    if (x instanceof Point) {
      value = y
      y = x.y
      x = x.x
    }

    if (value === undefined) {
      value = y
      this.data[x as number] = utils.clamp(value, 0, 255)
    }
    else {
      this.data[this.pointToIndex(x as number, y)] = utils.clamp(value, 0, 255)
    }

    // Reset histogram on data change
    this._histogram = null
    return this
  }

  /**
   * Calculates histogram
   *
   * @returns Histogram instance
   */
  histogram(): Histogram {
    if (!this._histogram) {
      this._histogram = new Histogram(this)
    }

    return this._histogram
  }

  /**
   * Translates x and y to index in data array
   *
   * @param x - x coordinate
   * @param y - y coordinate
   * @returns index in data array
   */
  pointToIndex(x: number, y: number): number {
    return (y * this.width) + x
  }

  /**
   * Converts index to Point
   *
   * @param index - Pixel index
   * @returns Point object
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
   * Makes a copy of current bitmap
   *
   * @param iterator - optional callback, used for processing pixel value
   * @returns New bitmap instance
   */
  copy(iterator?: (value: number, index: number) => number): Bitmap {
    const bm = new Bitmap(this.width, this.height)
    const iteratorPresent = typeof iterator === 'function'

    for (let i = 0; i < this.size; i++) {
      bm.data[i] = iteratorPresent ? iterator(this.data[i], i) : this.data[i]
    }

    return bm
  }
}

export default Bitmap
