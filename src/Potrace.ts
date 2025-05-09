'use strict'

import type { LoadImageCallback, PotraceOptions } from './types'
import Jimp from 'jimp'
import { Bitmap } from './types/Bitmap'
import { Curve } from './types/Curve'
import { Opti } from './types/Opti'
import { Path } from './types/Path'
import { Point } from './types/Point'
import { Quad } from './types/Quad'

import { Sum } from './types/Sum'
import * as utils from './utils'

/**
 * Potrace class
 *
 * @param {Potrace~Options} [options]
 * @constructor
 */
class Potrace {
  // Constants
  static COLOR_AUTO: 'auto' = 'auto'
  static COLOR_TRANSPARENT: 'transparent' = 'transparent'
  static THRESHOLD_AUTO: -1 = -1
  static TURNPOLICY_BLACK: 'black' = 'black'
  static TURNPOLICY_WHITE: 'white' = 'white'
  static TURNPOLICY_LEFT: 'left' = 'left'
  static TURNPOLICY_RIGHT: 'right' = 'right'
  static TURNPOLICY_MINORITY: 'minority' = 'minority'
  static TURNPOLICY_MAJORITY: 'majority' = 'majority'

  // Instance properties
  _luminanceData: Bitmap
  _pathlist: Path[]
  _imageLoadingIdentifier: string | null
  _imageLoaded: boolean
  _processed: boolean
  _params: PotraceOptions

  constructor(options?: PotraceOptions) {
    this._luminanceData = null!
    this._pathlist = []

    this._imageLoadingIdentifier = null
    this._imageLoaded = false
    this._processed = false

    this._params = {
      turnPolicy: Potrace.TURNPOLICY_MINORITY,
      turdSize: 2,
      alphaMax: 1,
      optCurve: true,
      optTolerance: 0.2,
      threshold: Potrace.THRESHOLD_AUTO,
      blackOnWhite: true,
      color: Potrace.COLOR_AUTO,
      background: Potrace.COLOR_TRANSPARENT,
      width: null,
      height: null,
    }

    if (options) {
      this.setParameters(options)
    }
  }

  /**
   * Creating a new {@link Path} for every group of black pixels.
   * @private
   */
  _bmToPathlist() {
    let self = this
    let threshold = this._params.threshold
    let blackOnWhite = this._params.blackOnWhite
    let blackMap
    let currentPoint = new Point(0, 0)
    let path

    if (threshold === Potrace.THRESHOLD_AUTO) {
      threshold = this._luminanceData.histogram().autoThreshold() || 128
    }

    blackMap = this._luminanceData.copy((lum) => {
      let pastTheThreshold = blackOnWhite
        ? lum > threshold
        : lum < threshold

      return pastTheThreshold ? 0 : 1
    })

    /**
     * finds next black pixel of the image
     *
     * @param {Point} point
     * @returns {boolean}
     * @private
     */
    function findNext(point: Point): Point | null {
      let i = blackMap.pointToIndex(point.x, point.y)

      while (i < blackMap.size && blackMap.data[i] !== 1) {
        i++
      }

      return i < blackMap.size ? blackMap.indexToPoint(i) : null
    }

    function majority(x: number, y: number): number {
      let i, a, ct

      for (i = 2; i < 5; i++) {
        ct = 0
        for (a = -i + 1; a <= i - 1; a++) {
          ct += blackMap.getValueAt(x + a, y + i - 1) ? 1 : -1
          ct += blackMap.getValueAt(x + i - 1, y + a - 1) ? 1 : -1
          ct += blackMap.getValueAt(x + a - 1, y - i) ? 1 : -1
          ct += blackMap.getValueAt(x - i, y + a) ? 1 : -1
        }

        if (ct > 0) {
          return 1
        }
        else if (ct < 0) {
          return 0
        }
      }
      return 0
    }

    function findPath(point: Point): Path {
      let path = new Path()
      let x = point.x
      let y = point.y
      let dirx = 0
      let diry = 1
      let tmp

      path.sign = blackMap.getValueAt(point.x, point.y) ? '+' : '-'

      while (1) {
        path.pt.push(new Point(x, y))
        if (x > path.maxX)
          path.maxX = x
        if (x < path.minX)
          path.minX = x
        if (y > path.maxY)
          path.maxY = y
        if (y < path.minY)
          path.minY = y
        path.len++

        x += dirx
        y += diry
        path.area -= x * diry

        if (x === point.x && y === point.y)
          break

        let l = blackMap.getValueAt(x + (dirx + diry - 1) / 2, y + (diry - dirx - 1) / 2)
        let r = blackMap.getValueAt(x + (dirx - diry - 1) / 2, y + (diry + dirx - 1) / 2)

        if (r && !l) {
          if (self._params.turnPolicy === 'right'
            || (self._params.turnPolicy === 'black' && path.sign === '+')
            || (self._params.turnPolicy === 'white' && path.sign === '-')
            || (self._params.turnPolicy === 'majority' && majority(x, y))
            || (self._params.turnPolicy === 'minority' && !majority(x, y))) {
            tmp = dirx
            dirx = -diry
            diry = tmp
          }
          else {
            tmp = dirx
            dirx = diry
            diry = -tmp
          }
        }
        else if (r) {
          tmp = dirx
          dirx = -diry
          diry = tmp
        }
        else if (!l) {
          tmp = dirx
          dirx = diry
          diry = -tmp
        }
      }
      return path
    }

    function xorPath(path: Path) {
      let y1 = path.pt[0].y
      let len = path.len
      let x, y, maxX, minY, i, j
      let idx

      for (i = 1; i < len; i++) {
        x = path.pt[i].x
        y = path.pt[i].y

        if (y !== y1) {
          minY = y1 < y ? y1 : y
          maxX = path.maxX

          for (j = x; j < maxX; j++) {
            idx = blackMap.pointToIndex(j, minY)
            blackMap.data[idx] = blackMap.data[idx] ? 0 : 1
          }
          y1 = y
        }
      }
    }

    // Clear path list
    this._pathlist = []

    // Find first black pixel
    currentPoint = findNext(currentPoint)

    while (currentPoint) {
      path = findPath(currentPoint)

      // Ignore degenerate paths
      if (path.area > this._params.turdSize) {
        this._pathlist.push(path)
        xorPath(path)
      }

      currentPoint = findNext(currentPoint)
    }
  }

  /**
   * Processes path list by finding optimal straight/curve lines
   * @private
   */
  _processPath() {
    // Chain together path segments that share the same sign and adjacent corners
    this._pathlist = this._connectPaths(this._pathlist)

    // Create curves
    this._pathlist.forEach((path) => {
      const curve = path.curve = new Curve(path.len)
      this._calcSums(path)
      this._calcLon(path)
      this._bestPolygon(path)
      this._adjustVertices(path)

      // Smooth the vertices
      for (let i = 0; i < curve.n; i++) {
        this._smooth(path, curve, i)
      }

      if (this._params.optCurve) {
        // Calculate best bezier curves
        this._optiCurve(path, curve)
      }
    })
  }

  /**
   * Calculates a path's sums that are used in later processing
   * @param path
   * @private
   */
  _calcSums(path: Path) {
    path.x0 = path.pt[0].x
    path.y0 = path.pt[0].y

    path.sums = []
    let s = path.sums
    s.push(new Sum(0, 0, 0, 0, 0))
    s.push(new Sum(0, 0, 0, 0, 0))
    s.push(new Sum(0, 0, 0, 0, 0))
    s.push(new Sum(0, 0, 0, 0, 0))

    for (let i = 0; i < path.len; i++) {
      let x = path.pt[i].x - path.x0
      let y = path.pt[i].y - path.y0
      s.push(new Sum(
        s[i + 3].x + x,
        s[i + 3].y + y,
        s[i + 3].xy + x * y,
        s[i + 3].x2 + x * x,
        s[i + 3].y2 + y * y,
      ))
    }
  }

  /**
   * Loads an image for tracing. Can be anything that Jimp can read, such as
   * a file path, buffer, URL, etc.
   *
   * @param source - Image source
   * @param callback - Function to call when image is loaded
   */
  loadImage(source: string | Buffer | any, callback: LoadImageCallback): void {
    const self = this
    const customId = Date.now().toString() + Math.random().toString(36).substring(2)

    this._imageLoadingIdentifier = customId
    this._imageLoaded = false
    this._processed = false

    const processImage = function (err: Error | null, image: any) {
      // If another image was requested in the meantime or there was an error, abort
      if (self._imageLoadingIdentifier !== customId || err) {
        return callback && callback.call(self, err || new Error('Another image is loading'))
      }

      try {
        // Normalize the image size if needed
        if (self._params.width && self._params.height) {
          image.resize(self._params.width, self._params.height)
        }
        else if (self._params.width) {
          image.resize(self._params.width, Jimp.AUTO)
        }
        else if (self._params.height) {
          image.resize(Jimp.AUTO, self._params.height)
        }

        // Create bitmap
        const bitmap = new Bitmap(image.bitmap.width, image.bitmap.height)

        // Collect luminance data from the image
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x: number, y: number, idx: number) => {
          const red = image.bitmap.data[idx]
          const green = image.bitmap.data[idx + 1]
          const blue = image.bitmap.data[idx + 2]

          bitmap.setValueAt(x, y, utils.luminance(red, green, blue))
        })

        self._luminanceData = bitmap
        self._imageLoaded = true
        self._imageLoadingIdentifier = null

        callback && callback.call(self, null)
      }
      catch (processErr) {
        callback && callback.call(self, processErr)
      }
    }

    if (source instanceof Bitmap) {
      this._luminanceData = source
      this._imageLoaded = true
      this._imageLoadingIdentifier = null

      callback && callback.call(this, null)
      return
    }

    if (source && typeof source === 'object' && source.bitmap) {
      processImage(null, source)
      return
    }

    Jimp.read(source, processImage)
  }

  /**
   * Sets algorithm parameters
   *
   * @param params - Parameters object
   */
  setParameters(params: PotraceOptions): void {
    const newParams = { ...this._params, ...params }

    // Validate turnPolicy
    if (newParams.turnPolicy
      && !SUPPORTED_TURNPOLICY_VALUES.includes(newParams.turnPolicy)) {
      throw new Error(`Invalid turnPolicy: ${newParams.turnPolicy}`)
    }

    // Validate turdSize
    if (typeof newParams.turdSize === 'number'
      && newParams.turdSize < 0) {
      throw new Error(`Invalid turdSize: ${newParams.turdSize}`)
    }

    // Validate alphaMax
    if (typeof newParams.alphaMax === 'number'
      && (newParams.alphaMax < 0 || newParams.alphaMax > 1.3334)) {
      throw new Error(`Invalid alphaMax: ${newParams.alphaMax}`)
    }

    // Validate threshold
    if (newParams.threshold !== Potrace.THRESHOLD_AUTO
      && typeof newParams.threshold === 'number'
      && (newParams.threshold < 0 || newParams.threshold > 255)) {
      throw new Error(`Invalid threshold: ${newParams.threshold}`)
    }

    // If threshold was changed, reset processed flag
    if (newParams.threshold !== this._params.threshold
      || newParams.blackOnWhite !== this._params.blackOnWhite) {
      this._processed = false
    }

    this._params = newParams
  }

  /**
   * Generates and returns an SVG string from the traced image
   *
   * @returns SVG string
   */
  getSVG(): string {
    if (!this._imageLoaded) {
      throw new Error('Image not loaded')
    }

    if (!this._processed) {
      this._bmToPathlist()
      this._processPath()
      this._processed = true
    }

    const width = this._luminanceData.width
    const height = this._luminanceData.height
    const scale = { x: 1, y: 1 }
    let fillColor = this._params.color

    // Set default color if needed
    if (fillColor === Potrace.COLOR_AUTO) {
      fillColor = this._params.blackOnWhite ? 'black' : 'white'
    }

    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1">\n`

    // Add background if not transparent
    if (this._params.background !== Potrace.COLOR_TRANSPARENT) {
      svg += `\t<rect x="0" y="0" width="100%" height="100%" fill="${this._params.background}" />\n`
    }

    // Add paths
    if (this._pathlist.length) {
      svg += `\t${this.getPathTag(fillColor)}\n`
    }

    svg += '</svg>'
    return svg
  }

  /**
   * Returns a path tag for use in SVG output
   *
   * @param fillColor - Color to use for fill (default: auto-detect)
   * @returns SVG path tag
   */
  getPathTag(fillColor?: string): string {
    if (!this._imageLoaded) {
      throw new Error('Image not loaded')
    }

    if (!this._processed) {
      this._bmToPathlist()
      this._processPath()
      this._processed = true
    }

    if (!this._pathlist.length) {
      return ''
    }

    if (fillColor === undefined) {
      fillColor = this._params.color === Potrace.COLOR_AUTO
        ? (this._params.blackOnWhite ? 'black' : 'white')
        : this._params.color
    }

    const tag = `<path d="${this._pathlistToSVG()}" fill="${fillColor}" stroke="none" />`
    return tag
  }

  /**
   * Returns a symbol tag with a specified ID
   *
   * @param id - Symbol ID to use
   * @returns SVG symbol tag
   */
  getSymbol(id: string): string {
    if (!this._imageLoaded) {
      throw new Error('Image not loaded')
    }

    if (!this._processed) {
      this._bmToPathlist()
      this._processPath()
      this._processed = true
    }

    const width = this._luminanceData.width
    const height = this._luminanceData.height

    if (!this._pathlist.length) {
      return `<symbol id="${id}" viewBox="0 0 ${width} ${height}"></symbol>`
    }

    return `<symbol id="${id}" viewBox="0 0 ${width} ${height}"><path d="${this._pathlistToSVG()}" /></symbol>`
  }

  /**
   * Converts the internal path list to SVG path data
   *
   * @private
   * @returns SVG path data
   */
  _pathlistToSVG(): string {
    const scale = { x: 1, y: 1 }
    const parts = []

    for (const path of this._pathlist) {
      if (path.curve) {
        parts.push(utils.renderCurve(path.curve, scale))
      }
    }

    return parts.join(' ')
  }
}

// Support constants
const SUPPORTED_TURNPOLICY_VALUES = [
  Potrace.TURNPOLICY_BLACK,
  Potrace.TURNPOLICY_WHITE,
  Potrace.TURNPOLICY_LEFT,
  Potrace.TURNPOLICY_RIGHT,
  Potrace.TURNPOLICY_MINORITY,
  Potrace.TURNPOLICY_MAJORITY,
]

export default Potrace

/**
 * Potrace Options
 *
 * @typedef {object} Potrace~Options
 * @property {string} [turnPolicy=TURNPOLICY_MINORITY] - determines how to resolve ambiguities in path decomposition.
 * @property {number} [turdSize=2] - suppress speckles of up to this size (default 2)
 * @property {number} [alphaMax=1] - corner threshold parameter (default 1)
 * @property {boolean} [optCurve=true] - curve optimization (default true)
 * @property {number} [optTolerance=0.2] - curve optimization tolerance (default 0.2)
 * @property {number} [threshold=THRESHOLD_AUTO] - threshold below which colors are converted to black (default THRESHOLD_AUTO)
 * @property {boolean} [blackOnWhite=true] - specifies colors by which side the background is (default true)
 * @property {string} [color=COLOR_AUTO] - foreground color (default COLOR_AUTO - meaning pick black or white, depending on blackOnWhite)
 * @property {string} [background=COLOR_TRANSPARENT] - background color (default COLOR_TRANSPARENT)
 * @property {?number} [width=null] - desired width of SVG image, pixels (default null, meaning same format as the original image)
 * @property {?number} [height=null] - desired height of SVG image, pixels (default null, meaning same format as the original image)
 */

/**
 * Jimp module
 * @external Jimp
 * @see https://www.npmjs.com/package/jimp
 */
