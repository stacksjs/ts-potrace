import type { Buffer } from 'node:buffer'
import { Jimp } from 'jimp'
import { Bitmap } from './types/Bitmap'
import { Curve } from './types/Curve'
import { Opti } from './types/Opti'
import { Path } from './types/Path'
import { Point } from './types/Point'
import { Sum } from './types/Sum'
import * as utils from './utils'

export interface PotraceOptions {
  turnPolicy?: TurnPolicy
  turdSize?: number
  alphaMax?: number
  optCurve?: boolean
  optTolerance?: number
  threshold?: number
  blackOnWhite?: boolean
  color?: string
  background?: string
  width?: number | null
  height?: number | null
}

export type TurnPolicy =
  | 'black'
  | 'white'
  | 'left'
  | 'right'
  | 'minority'
  | 'majority'

export class Potrace {
  // Static constants
  static readonly COLOR_AUTO = 'auto'
  static readonly COLOR_TRANSPARENT = 'transparent'
  static readonly THRESHOLD_AUTO = -1
  static readonly TURNPOLICY_BLACK = 'black'
  static readonly TURNPOLICY_WHITE = 'white'
  static readonly TURNPOLICY_LEFT = 'left'
  static readonly TURNPOLICY_RIGHT = 'right'
  static readonly TURNPOLICY_MINORITY = 'minority'
  static readonly TURNPOLICY_MAJORITY = 'majority'

  // Protected members
  protected _luminanceData: Bitmap | null = null
  protected _pathlist: Path[] = []
  protected _imageLoadingIdentifier: number | null = null
  protected _imageLoaded = false
  protected _processed = false
  protected _params: Required<PotraceOptions>

  // Supported turn policy values for validation
  private static readonly SUPPORTED_TURNPOLICY_VALUES: TurnPolicy[] = [
    Potrace.TURNPOLICY_BLACK,
    Potrace.TURNPOLICY_WHITE,
    Potrace.TURNPOLICY_LEFT,
    Potrace.TURNPOLICY_RIGHT,
    Potrace.TURNPOLICY_MINORITY,
    Potrace.TURNPOLICY_MAJORITY,
  ]

  /**
   * Creates a new Potrace instance
   * @param options - Configuration options
   */
  constructor(options?: PotraceOptions) {
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
   * Set potrace parameters
   *
   * @param _params - Parameters to set
   * @returns this instance for chaining
   */
  setParameters(_params: PotraceOptions): Potrace {
    const params = _params || {}
    let needsReprocessing = false

    // Only apply known parameters
    if (typeof params.turnPolicy !== 'undefined') {
      if (Potrace.SUPPORTED_TURNPOLICY_VALUES.includes(params.turnPolicy)) {
        this._params.turnPolicy = params.turnPolicy
        needsReprocessing = true
      }
    }

    if (typeof params.turdSize !== 'undefined') {
      this._params.turdSize = params.turdSize
      needsReprocessing = true
    }

    if (typeof params.alphaMax !== 'undefined') {
      this._params.alphaMax = params.alphaMax
      needsReprocessing = true
    }

    if (typeof params.optCurve !== 'undefined') {
      this._params.optCurve = params.optCurve
      needsReprocessing = true
    }

    if (typeof params.optTolerance !== 'undefined') {
      this._params.optTolerance = params.optTolerance
      needsReprocessing = true
    }

    if (typeof params.threshold !== 'undefined') {
      this._params.threshold = params.threshold
      needsReprocessing = true
    }

    if (typeof params.blackOnWhite !== 'undefined') {
      this._params.blackOnWhite = params.blackOnWhite
      needsReprocessing = true
    }

    if (typeof params.color !== 'undefined') {
      this._params.color = params.color
    }

    if (typeof params.background !== 'undefined') {
      this._params.background = params.background
    }

    // Only width and height can be updated
    if (typeof params.width !== 'undefined') {
      this._params.width = params.width
    }

    if (typeof params.height !== 'undefined') {
      this._params.height = params.height
    }

    // Reset processed flag if any parameter was changed that affects the output
    if (needsReprocessing) {
      this._processed = false
    }

    // Validate some parameters
    this._validateParameters(this._params)

    return this
  }

  /**
   * Loads image from file, Buffer or Jimp instance
   *
   * @param source - Image source
   * @param callback - Completion callback
   */
  loadImage(source: string | Buffer | any, callback: (err?: Error) => void): void {
    // Reset state
    this._imageLoaded = false
    this._processed = false
    this._imageLoadingIdentifier = Date.now()

    // Source is already a Jimp instance
    if (source && typeof source === 'object' && 'bitmap' in source) {
      try {
        // Process the Jimp instance directly
        const image = source
        const w = image.bitmap.width
        const h = image.bitmap.height
        const bitmap = new Bitmap(w, h)

        // For each pixel, calculate luminance value
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            // Get rgba color from Jimp
            const idx = (y * w + x) << 2
            const r = image.bitmap.data[idx]
            const g = image.bitmap.data[idx + 1]
            const b = image.bitmap.data[idx + 2]

            // ITU-R BT.601 luma coefficients
            const luminance = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
            bitmap.data[y * w + x] = luminance
          }
        }

        // Store the bitmap and mark as loaded
        this._luminanceData = bitmap
        this._imageLoaded = true
        this._imageLoadingIdentifier = null

        // Call callback with this context
        callback.call(this)
      }
      catch (e: any) {
        this._imageLoadingIdentifier = null
        callback.call(this, e)
      }
    }
    else {
      // For file path or buffer, use Jimp.read
      try {
        // Use type assertion to avoid TS error with Jimp.read
        (Jimp.read as any)(source)
          .then((image: any) => {
            try {
              const w = image.bitmap.width
              const h = image.bitmap.height
              const bitmap = new Bitmap(w, h)

              // For each pixel, calculate luminance value
              for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                  // Get rgba color from Jimp
                  const idx = (y * w + x) << 2
                  const r = image.bitmap.data[idx]
                  const g = image.bitmap.data[idx + 1]
                  const b = image.bitmap.data[idx + 2]

                  // ITU-R BT.601 luma coefficients
                  const luminance = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
                  bitmap.data[y * w + x] = luminance
                }
              }

              // Store the bitmap and mark as loaded
              this._luminanceData = bitmap
              this._imageLoaded = true
              this._imageLoadingIdentifier = null

              // Call callback with this context
              callback.call(this)
            }
            catch (e: any) {
              this._imageLoadingIdentifier = null
              callback.call(this, e)
            }
          })
          .catch((err: Error) => {
            this._imageLoadingIdentifier = null
            callback.call(this, err)
          })
      }
      catch (e: any) {
        this._imageLoadingIdentifier = null
        callback.call(this, e)
      }
    }
  }

  /**
   * Returns path tag of SVG document
   */
  getPathTag(): string {
    if (!this._imageLoaded) {
      throw new Error('Image should be loaded first')
    }

    if (!this._processed) {
      this._process()
    }

    let pathData = ''

    // Create path data for each curve
    for (let i = 0; i < this._pathlist.length; i++) {
      const path = this._pathlist[i]
      if (!path.curve)
        continue

      let pathString = ''

      // First point
      const lastIndex = path.curve.n - 1
      pathString += `M ${path.curve.c[lastIndex * 3 + 2].x}, ${path.curve.c[lastIndex * 3 + 2].y} `

      // Draw bezier curves
      for (let j = 0; j < path.curve.n; j++) {
        pathString += `C ${path.curve.c[j * 3 + 0].x}, ${path.curve.c[j * 3 + 0].y}, ${path.curve.c[j * 3 + 1].x}, ${path.curve.c[j * 3 + 1].y}, ${path.curve.c[j * 3 + 2].x}, ${path.curve.c[j * 3 + 2].y} `
      }

      pathData += pathString
    }

    // Apply colors
    let color = this._params.color
    if (color === Potrace.COLOR_AUTO) {
      color = 'black'
    }

    // Create a path tag with fill-rule attribute
    return `<path d="${pathData}" stroke="none" fill="${color}" fill-rule="evenodd"/>`
  }

  /**
   * Returns SVG image
   */
  getSVG(): string {
    if (!this._imageLoaded) {
      throw new Error('Image should be loaded first')
    }

    if (!this._processed) {
      this._process()
    }

    // Get SVG dimensions
    const width = this._params.width || this._luminanceData?.width || 0
    const height = this._params.height || this._luminanceData?.height || 0

    // Apply colors
    let color = this._params.color
    if (color === Potrace.COLOR_AUTO) {
      color = 'black'
    }

    let background = this._params.background
    if (background === Potrace.COLOR_AUTO) {
      background = 'white'
    }

    // Create SVG header
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1">\n\t`

    // Add path data
    svg += this.getPathTag()
    svg += '\n</svg>'

    return svg
  }

  /**
   * Gets the <symbol> SVG element for this path data
   */
  getSymbol(_id: string): string {
    if (!this._imageLoaded) {
      throw new Error('Image should be loaded first')
    }

    if (!this._processed) {
      this._process()
    }

    const width = this._luminanceData?.width || 0
    const height = this._luminanceData?.height || 0

    return `<symbol id="${_id}" viewBox="0 0 ${width} ${height}">${this.getPathTag()}</symbol>`
  }

  /**
   * Process image data
   *
   * @private
   */
  private _process(): void {
    // Don't process more than once
    if (this._processed) {
      return
    }

    if (!this._imageLoaded) {
      throw new Error('Image should be loaded first')
    }

    // Clear previous paths
    this._pathlist = []

    // Get binarized bitmap
    this._bmToPathlist()

    // Process the paths
    this._processPath()

    this._processed = true
  }

  /**
   * Creating a new {@link Path} for every group of black pixels.
   * @private
   */
  private _bmToPathlist(): void {
    if (!this._luminanceData) {
      throw new Error('Luminance data not available')
    }

    const threshold = this._params.threshold
    const blackOnWhite = this._params.blackOnWhite
    let blackMap: Bitmap

    if (threshold === Potrace.THRESHOLD_AUTO) {
      const autoThreshold = this._luminanceData.histogram().autoThreshold()
      blackMap = this._luminanceData.copy((lum) => {
        const pastTheThreshold = blackOnWhite
          ? lum > (autoThreshold || 128)
          : lum < (autoThreshold || 128)

        return pastTheThreshold ? 0 : 1
      })
    }
    else {
      blackMap = this._luminanceData.copy((lum) => {
        const pastTheThreshold = blackOnWhite
          ? lum > threshold
          : lum < threshold

        return pastTheThreshold ? 0 : 1
      })
    }

    /**
     * finds next black pixel of the image
     */
    const findNext = (point: Point): Point | null => {
      let i = blackMap.pointToIndex(point)

      while (i < blackMap.size && blackMap.data[i] !== 1) {
        i++
      }

      return i < blackMap.size ? blackMap.indexToPoint(i) : null
    }

    /**
     * Compute the majority based on neighboring pixels
     */
    const majority = (x: number, y: number): number => {
      let i: number, a: number, ct: number

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

    /**
     * Find a path starting from the given point
     */
    const findPath = (point: Point): Path => {
      const path = new Path()
      let x = point.x
      let y = point.y
      let dirx = 0
      let diry = 1
      let tmp: number

      path.sign = blackMap.getValueAt(point.x, point.y) ? '+' : '-'

      // Loop until we return to start point
      while (true) {
        path.pt.push(new Point(x, y))
        if (x > path.maxX) {
          path.maxX = x
        }
        if (x < path.minX) {
          path.minX = x
        }
        if (y > path.maxY) {
          path.maxY = y
        }
        if (y < path.minY) {
          path.minY = y
        }
        path.len++

        x += dirx
        y += diry
        path.area -= x * diry

        if (x === point.x && y === point.y) {
          break
        }

        const l = blackMap.getValueAt(x + (dirx + diry - 1) / 2, y + (diry - dirx - 1) / 2)
        const r = blackMap.getValueAt(x + (dirx - diry - 1) / 2, y + (diry + dirx - 1) / 2)

        if (r && !l) {
          if (this._params.turnPolicy === 'right'
            || (this._params.turnPolicy === 'black' && path.sign === '+')
            || (this._params.turnPolicy === 'white' && path.sign === '-')
            || (this._params.turnPolicy === 'majority' && majority(x, y))
            || (this._params.turnPolicy === 'minority' && !majority(x, y))) {
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

    /**
     * XOR the path with the existing bitmap
     */
    const xorPath = (path: Path): void => {
      let y1 = path.pt[0].y
      const len = path.len
      let x: number, y: number, maxX: number, minY: number, i: number, j: number, indx: number

      for (i = 1; i < len; i++) {
        x = path.pt[i].x
        y = path.pt[i].y

        if (y !== y1) {
          minY = y1 < y ? y1 : y
          maxX = path.maxX
          for (j = x; j < maxX; j++) {
            indx = blackMap.pointToIndex(j, minY)
            blackMap.data[indx] = blackMap.data[indx] ? 0 : 1
          }
          y1 = y
        }
      }
    }

    // Find all paths
    let currentPoint = new Point(0, 0)
    let nextPoint: Point | null

    while (true) {
      nextPoint = findNext(currentPoint)
      if (nextPoint === null)
        break

      currentPoint = nextPoint
      const path = findPath(currentPoint)
      xorPath(path)

      if (path.area > this._params.turdSize) {
        this._pathlist.push(path)
      }
    }
  }

  /**
   * Calculate sums for path
   */
  private _calcSums(path: Path): void {
    // Set x0 and y0 if they don't exist
    path.x0 = path.pt[0].x
    path.y0 = path.pt[0].y

    // Initialize sums array
    path.sums = []
    const s = path.sums
    s.push(new Sum(0, 0, 0, 0, 0))

    for (let i = 0; i < path.len; i++) {
      const x = path.pt[i].x - path.x0
      const y = path.pt[i].y - path.y0
      s.push(new Sum(
        s[i].x + x,
        s[i].y + y,
        s[i].xy + x * y,
        s[i].x2 + x * x,
        s[i].y2 + y * y,
      ))
    }
  }

  /**
   * Calculate the optimal polygon for a path
   */
  private _bestPolygon(path: Path): void {
    const n = path.len
    const pen = Array.from({ length: n + 1 }).fill(0) as number[]
    const prev = Array.from({ length: n + 1 }).fill(0) as number[]
    const clip0 = Array.from({ length: n }).fill(0) as number[]
    const clip1 = Array.from({ length: n + 1 }).fill(0) as number[]
    const seg0 = Array.from({ length: n + 1 }).fill(0) as number[]
    const seg1 = Array.from({ length: n + 1 }).fill(0) as number[]

    // Make sure path.lon exists
    path.lon = path.lon || Array.from({ length: n }).fill(0) as number[]

    // Compute clipping points
    for (let i = 0; i < n; i++) {
      let c = utils.mod(path.lon[utils.mod(i - 1, n)] - 1, n)
      if (c === i) {
        c = utils.mod(i + 1, n)
      }
      if (c < i) {
        clip0[i] = n
      }
      else {
        clip0[i] = c
      }
    }

    // Initialize seg0, seg1
    let j = 1
    for (let i = 0; i < n; i++) {
      while (j <= clip0[i]) {
        clip1[j] = i
        j++
      }
    }

    let i = 0
    for (j = 0; i < n; j++) {
      seg0[j] = i
      i = clip0[i]
    }
    seg0[j] = n
    const m = j

    i = n
    for (j = m; j > 0; j--) {
      seg1[j] = i
      i = clip1[i]
    }
    seg1[0] = 0

    // Calculate penalty
    pen[0] = 0
    for (j = 1; j <= m; j++) {
      for (i = seg1[j]; i <= seg0[j]; i++) {
        let best = -1
        for (let k = seg0[j - 1]; k >= clip1[i]; k--) {
          const thispen = this._penalty3(path, k, i) + pen[k]
          if (best < 0 || thispen < best) {
            prev[i] = k
            best = thispen
          }
        }
        pen[i] = best
      }
    }

    // Create polygonal path
    path.m = m
    path.po = Array.from({ length: m }) as number[]

    for (i = n, j = m - 1; i > 0; j--) {
      i = prev[i]
      path.po[j] = i
    }
  }

  /**
   * Calculate the penalty for a given path
   */
  private _penalty3(path: Path, i: number, j: number): number {
    const n = path.len
    const pt = path.pt
    const sums = path.sums!
    let r = 0
    let x, y, xy, x2, y2, k: number

    if (j >= n) {
      j -= n
      r = 1
    }

    if (r === 0) {
      x = sums[j + 1].x - sums[i].x
      y = sums[j + 1].y - sums[i].y
      x2 = sums[j + 1].x2 - sums[i].x2
      xy = sums[j + 1].xy - sums[i].xy
      y2 = sums[j + 1].y2 - sums[i].y2
      k = j + 1 - i
    }
    else {
      x = sums[j + 1].x - sums[i].x + sums[n].x
      y = sums[j + 1].y - sums[i].y + sums[n].y
      x2 = sums[j + 1].x2 - sums[i].x2 + sums[n].x2
      xy = sums[j + 1].xy - sums[i].xy + sums[n].xy
      y2 = sums[j + 1].y2 - sums[i].y2 + sums[n].y2
      k = j + 1 - i + n
    }

    // Calculate error
    const px = (pt[i].x + pt[j].x) / 2.0 - pt[0].x
    const py = (pt[i].y + pt[j].y) / 2.0 - pt[0].y
    const ey = pt[j].x - pt[i].x
    const ex = -(pt[j].y - pt[i].y)

    const a = ((x2 - 2 * x * px) / k + px * px)
    const b = ((xy - x * py - y * px) / k + px * py)
    const c = ((y2 - 2 * y * py) / k + py * py)

    const s = ex * ex * a + 2 * ex * ey * b + ey * ey * c
    return Math.sqrt(s)
  }

  /**
   * Calculate the optimal curves for a path
   */
  private _adjustVertices(path: Path): void {
    const m = path.m!
    const po = path.po!
    const pt = path.pt

    path.curve = new Curve(m)
    const curve = path.curve

    for (let i = 0; i < m; i++) {
      const j = po[utils.mod(i + 1, m)]
      const k = po[utils.mod(i + 2, m)]

      const p0 = pt[po[i]]
      const p1 = pt[j]
      const p2 = pt[k]

      // Calculate tangent points
      const d1x = p1.x - p0.x
      const d1y = p1.y - p0.y
      const d2x = p2.x - p1.x
      const d2y = p2.y - p1.y

      const p0x = p0.x
      const p0y = p0.y
      const p1x = p1.x
      const p1y = p1.y

      // Calculate control points
      const alpha = this._params.alphaMax
      const cp1x = p0x + alpha * d1x
      const cp1y = p0y + alpha * d1y
      const cp2x = p1x - alpha * d2x
      const cp2y = p1y - alpha * d2y

      // Set curve data
      curve.vertex[i] = new Point(p1x, p1y)
      curve.alpha[i] = alpha
      curve.alpha0[i] = alpha
      curve.beta[i] = 0.5

      curve.c[i * 3 + 0] = new Point(cp1x, cp1y)
      curve.c[i * 3 + 1] = new Point(cp2x, cp2y)
      curve.c[i * 3 + 2] = new Point(p1x, p1y)
      curve.tag[i] = 'CURVE'
    }

    curve.alphaCurve = 1
  }

  /**
   * Processes path list created by _bmToPathlist method creating and optimizing {@link Curve}'s
   * @private
   */
  private _processPath(): void {
    for (let i = 0; i < this._pathlist.length; i++) {
      const path = this._pathlist[i]

      // Calculate path sums
      this._calcSums(path)

      // Calculate path longuest sides
      this._calcLon(path)

      // Find optimal polygon
      this._bestPolygon(path)

      // Adjust vertices to create curves
      this._adjustVertices(path)

      // Reverse path if necessary
      if (path.sign === '-') {
        this._reverse(path)
      }

      // Smooth the path
      this._smooth(path)

      // Optimize curves if enabled
      if (this._params.optCurve) {
        this._optiCurve(path)
      }
    }
  }

  /**
   * Calculate longuest sides
   */
  private _calcLon(path: Path): void {
    const n = path.len
    const pt = path.pt
    const pivk = Array.from({ length: n }).fill(0) as number[]
    const nc = Array.from({ length: n }).fill(0) as number[]
    const ct: number[] = [0, 0, 0, 0]

    // Initialize the lon array if it doesn't exist
    path.lon = path.lon || Array.from({ length: n }).fill(0) as number[]

    // Step 1: calculate longuest segments
    let k = 0
    for (let i = n - 1; i >= 0; i--) {
      if (pt[i].x !== pt[k].x && pt[i].y !== pt[k].y) {
        k = i + 1
      }
      nc[i] = k
    }

    // Step 2: calculate longuest path
    for (let i = n - 1; i >= 0; i--) {
      ct[0] = ct[1] = ct[2] = ct[3] = 0

      k = nc[i]
      let k1 = i
      let foundk = 0

      while (true) {
        const dir = (3 + 3 * utils.sign(pt[k].x - pt[k1].x) + utils.sign(pt[k].y - pt[k1].y)) / 2

        ct[dir]++

        if (ct[0] && ct[1] && ct[2] && ct[3]) {
          pivk[i] = k1
          foundk = 1
          break
        }

        k1 = k
        k = nc[k1]
        if (!utils.cyclic(k, i, k1)) {
          break
        }
      }

      if (!foundk) {
        pivk[i] = i
      }
    }

    // Step 3: path.lon
    let j = pivk[n - 1]
    path.lon[n - 1] = j

    for (let i = n - 2; i >= 0; i--) {
      if (utils.cyclic(i + 1, pivk[i], j)) {
        j = pivk[i]
      }
      path.lon[i] = j
    }

    for (let i = n - 1; utils.cyclic(utils.mod(i + 1, n), j, path.lon[i]); i--) {
      path.lon[i] = j
    }
  }

  /**
   * Reverse the path direction
   */
  private _reverse(path: Path): void {
    const curve = path.curve
    if (!curve)
      return

    const m = curve.n
    const v = curve.vertex

    for (let i = 0, j = m - 1; i < j; i++, j--) {
      const tmp = v[i]
      v[i] = v[j]
      v[j] = tmp
    }
  }

  /**
   * Smooth the path
   */
  private _smooth(path: Path): void {
    if (!path.curve)
      return

    const m = path.curve.n
    const curve = path.curve

    for (let i = 0; i < m; i++) {
      const j = utils.mod(i + 1, m)
      const k = utils.mod(i + 2, m)
      const p4 = utils.interval(1 / 2.0, curve.vertex[k], curve.vertex[j])

      const denom = utils.ddenom(curve.vertex[i], curve.vertex[k])
      let alpha: number

      if (denom !== 0.0) {
        let dd = utils.dpara(curve.vertex[i], curve.vertex[j], curve.vertex[k]) / denom
        dd = Math.abs(dd)
        alpha = dd > 1 ? (1 - 1.0 / dd) : 0
        alpha = alpha / 0.75
      }
      else {
        alpha = 4 / 3.0
      }

      curve.alpha0[j] = alpha

      if (alpha >= this._params.alphaMax) {
        curve.tag[j] = 'CORNER'
        curve.c[3 * j + 1] = curve.vertex[j]
        curve.c[3 * j + 2] = p4
      }
      else {
        if (alpha < 0.55) {
          alpha = 0.55
        }
        else if (alpha > 1) {
          alpha = 1
        }

        const p2 = utils.interval(0.5 + 0.5 * alpha, curve.vertex[i], curve.vertex[j])
        const p3 = utils.interval(0.5 + 0.5 * alpha, curve.vertex[k], curve.vertex[j])

        curve.tag[j] = 'CURVE'
        curve.c[3 * j + 0] = p2
        curve.c[3 * j + 1] = p3
        curve.c[3 * j + 2] = p4
      }

      curve.alpha[j] = alpha
      curve.beta[j] = 0.5
    }

    curve.alphaCurve = 1
  }

  /**
   * Optimize curves
   */
  private _optiCurve(path: Path): void {
    if (!path.curve)
      return

    const optiPenalty = (
      path: Path,
      i: number,
      j: number,
      res: Opti,
      opttolerance: number,
      convc: number[],
      areac: number[],
    ): number => {
      if (!path.curve)
        return 1

      const m = path.curve.n
      const curve = path.curve
      const vertex = curve.vertex
      let k: number, k1: number, k2: number
      const conv = convc[utils.mod(i + 1, m)]
      const i1 = utils.mod(i + 1, m)
      let d: number, d1: number, d2: number
      let pt: Point

      if (i === j) {
        return 1
      }

      if (conv === 0) {
        return 1
      }

      d = utils.ddist(vertex[i], vertex[i1])

      for (k = utils.mod(i + 1, m); k !== j; k = k1) {
        k1 = utils.mod(k + 1, m)
        k2 = utils.mod(k + 2, m)

        if (convc[k1] !== conv) {
          return 1
        }

        if (utils.sign(utils.cprod(vertex[i], vertex[i1], vertex[k1], vertex[k2])) !== conv) {
          return 1
        }

        if (utils.iprod1(vertex[i], vertex[i1], vertex[k1], vertex[k2]) < d * utils.ddist(vertex[k1], vertex[k2]) * -0.999847695156) {
          return 1
        }
      }

      // Bezier curve fitting
      const p0 = curve.c[utils.mod(i, m) * 3 + 2].copy()
      const p1 = vertex[utils.mod(i + 1, m)].copy()
      const p2 = vertex[utils.mod(j, m)].copy()
      const p3 = curve.c[utils.mod(j, m) * 3 + 2].copy()

      // Area calculation
      let area = areac[j] - areac[i]
      area -= utils.dpara(vertex[0], curve.c[i * 3 + 2], curve.c[j * 3 + 2]) / 2

      if (i >= j) {
        area += areac[m]
      }

      // Bezier area calculations
      const A1 = utils.dpara(p0, p1, p2)
      const A2 = utils.dpara(p0, p1, p3)
      const A3 = utils.dpara(p0, p2, p3)
      const A4 = A1 + A3 - A2

      if (A2 === A1) {
        return 1
      }

      let t = A3 / (A3 - A4)
      const s = A2 / (A2 - A1)
      const A = A2 * t / 2.0

      if (A === 0.0) {
        return 1
      }

      const R = area / A
      const alpha = 2 - Math.sqrt(4 - R / 0.3)

      res.c[0] = utils.interval(t * alpha, p0, p1)
      res.c[1] = utils.interval(s * alpha, p3, p2)
      res.alpha = alpha
      res.t = t
      res.s = s

      // Create new mutable variables for p1 and p2 instead of reassigning constants
      const newP1 = res.c[0].copy()
      const newP2 = res.c[1].copy()

      res.pen = 0

      // Penalize deviation from the original polyline
      for (k = utils.mod(i + 1, m); k !== j; k = k1) {
        k1 = utils.mod(k + 1, m)
        t = utils.tangent(p0, newP1, newP2, p3, vertex[k], vertex[k1])

        if (t < -0.5) {
          return 1
        }

        pt = utils.bezier(t, p0, newP1, newP2, p3)
        d = utils.ddist(vertex[k], vertex[k1])

        if (d === 0.0) {
          return 1
        }

        d1 = utils.dpara(vertex[k], vertex[k1], pt) / d

        if (Math.abs(d1) > opttolerance) {
          return 1
        }

        if (utils.iprod(vertex[k], vertex[k1], pt) < 0
          || utils.iprod(vertex[k1], vertex[k], pt) < 0) {
          return 1
        }

        res.pen += d1 * d1
      }

      // Penalize deviation from the original Bezier curve
      for (k = i; k !== j; k = k1) {
        k1 = utils.mod(k + 1, m)
        t = utils.tangent(p0, newP1, newP2, p3, curve.c[k * 3 + 2], curve.c[k1 * 3 + 2])

        if (t < -0.5) {
          return 1
        }

        pt = utils.bezier(t, p0, newP1, newP2, p3)
        d = utils.ddist(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2])

        if (d === 0.0) {
          return 1
        }

        d1 = utils.dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], pt) / d
        d2 = utils.dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], vertex[k1]) / d
        d2 *= 0.75 * curve.alpha[k1]

        if (d2 < 0) {
          d1 = -d1
          d2 = -d2
        }

        if (d1 < d2 - opttolerance) {
          return 1
        }

        if (d1 < d2) {
          res.pen += (d1 - d2) * (d1 - d2)
        }
      }

      return 0
    }

    const curve = path.curve
    if (!curve)
      return

    const m = curve.n
    const vert = curve.vertex
    const pt = Array.from({ length: m + 1 }) as (number | undefined)[]
    const pen = Array.from({ length: m + 1 }).fill(0) as number[]
    const len = Array.from({ length: m + 1 }).fill(0) as number[]
    const opt = Array.from({ length: m + 1 }) as (Opti | undefined)[]
    let i: number, j: number, r: number
    const o = new Opti()

    const convc = Array.from({ length: m }).fill(0) as number[]
    const areac = Array.from({ length: m + 1 }).fill(0) as number[]

    // Find straight segments
    for (i = 0; i < m; i++) {
      if (curve.tag[i] === 'CURVE') {
        convc[i] = utils.sign(
          utils.dpara(
            vert[utils.mod(i - 1, m)],
            vert[i],
            vert[utils.mod(i + 1, m)],
          ),
        )
      }
      else {
        convc[i] = 0
      }
    }

    // Calculate area
    let area = 0.0
    areac[0] = 0.0
    const p0 = curve.vertex[0]

    for (i = 0; i < m; i++) {
      const i1 = utils.mod(i + 1, m)

      if (curve.tag[i1] === 'CURVE') {
        const alpha = curve.alpha[i1]
        area += 0.3 * alpha * (4 - alpha)
          * utils.dpara(curve.c[i * 3 + 2], vert[i1], curve.c[i1 * 3 + 2]) / 2
        area += utils.dpara(p0, curve.c[i * 3 + 2], curve.c[i1 * 3 + 2]) / 2
      }

      areac[i + 1] = area
    }

    // Dynamic programming approach to find optimal path
    pt[0] = -1
    pen[0] = 0
    len[0] = 0

    for (j = 1; j <= m; j++) {
      pt[j] = j - 1
      pen[j] = pen[j - 1]
      len[j] = len[j - 1] + 1

      for (i = j - 2; i >= 0; i--) {
        r = optiPenalty(
          path,
          i,
          utils.mod(j, m),
          o,
          this._params.optTolerance,
          convc,
          areac,
        )

        if (r) {
          break
        }

        if (len[j] > (len[i] + 1) || (len[j] === len[i] + 1 && pen[j] > pen[i] + o.pen)) {
          pt[j] = i
          pen[j] = pen[i] + o.pen
          len[j] = len[i] + 1
          opt[j] = o.copy()
        }
      }
    }

    // Create optimized curve
    const om = len[m]
    const ocurve = new Curve(om)
    const s = Array.from({ length: om }).fill(0) as number[]
    const t = Array.from({ length: om }).fill(0) as number[]

    j = m
    for (i = om - 1; i >= 0; i--) {
      if (pt[j] === j - 1) {
        ocurve.tag[i] = curve.tag[utils.mod(j, m)]
        ocurve.c[i * 3 + 0] = curve.c[utils.mod(j, m) * 3 + 0]
        ocurve.c[i * 3 + 1] = curve.c[utils.mod(j, m) * 3 + 1]
        ocurve.c[i * 3 + 2] = curve.c[utils.mod(j, m) * 3 + 2]
        ocurve.vertex[i] = curve.vertex[utils.mod(j, m)]
        ocurve.alpha[i] = curve.alpha[utils.mod(j, m)]
        ocurve.alpha0[i] = curve.alpha0[utils.mod(j, m)]
        ocurve.beta[i] = curve.beta[utils.mod(j, m)]
        s[i] = t[i] = 1.0
      }
      else {
        ocurve.tag[i] = 'CURVE'
        ocurve.c[i * 3 + 0] = opt[j]!.c[0]
        ocurve.c[i * 3 + 1] = opt[j]!.c[1]
        ocurve.c[i * 3 + 2] = curve.c[utils.mod(j, m) * 3 + 2]
        ocurve.vertex[i] = utils.interval(
          opt[j]!.s,
          curve.c[utils.mod(j, m) * 3 + 2],
          vert[utils.mod(j, m)],
        )
        ocurve.alpha[i] = opt[j]!.alpha
        ocurve.alpha0[i] = opt[j]!.alpha
        s[i] = opt[j]!.s
        t[i] = opt[j]!.t
      }

      j = pt[j]!
    }

    // Calculate beta parameters
    for (i = 0; i < om; i++) {
      const i1 = utils.mod(i + 1, om)
      ocurve.beta[i] = s[i] / (s[i] + t[i1])
    }

    ocurve.alphaCurve = 1
    path.curve = ocurve
  }

  /**
   * Validates parameters
   * @param params - Parameters to validate
   */
  private _validateParameters(params: PotraceOptions): void {
    if (params && params.turnPolicy && !Potrace.SUPPORTED_TURNPOLICY_VALUES.includes(params.turnPolicy)) {
      const goodVals = `'${Potrace.SUPPORTED_TURNPOLICY_VALUES.join('\', \'')}'`
      throw new Error(`Bad turnPolicy value. Allowed values are: ${goodVals}`)
    }

    if (params && params.threshold != null && params.threshold !== Potrace.THRESHOLD_AUTO) {
      if (typeof params.threshold !== 'number' || !utils.between(params.threshold, 0, 255)) {
        throw new Error('Bad threshold value. Expected to be an integer in range 0..255')
      }
    }

    if (params && params.optCurve != null && typeof params.optCurve !== 'boolean') {
      throw new Error('\'optCurve\' must be Boolean')
    }
  }

  /**
   * Process a loaded image
   * @param image - Jimp image instance
   * @private
   */
  private _processLoadedImage(image: any): void {
    const bitmap = new Bitmap(image.bitmap.width, image.bitmap.height)
    const pixels = image.bitmap.data

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x: number, y: number, idx: number) => {
      // We want background underneath non-opaque regions to be white
      const opacity = pixels[idx + 3] / 255
      const r = 255 + (pixels[idx + 0] - 255) * opacity
      const g = 255 + (pixels[idx + 1] - 255) * opacity
      const b = 255 + (pixels[idx + 2] - 255) * opacity

      bitmap.data[idx / 4] = utils.luminance(r, g, b)
    })

    this._luminanceData = bitmap
    this._imageLoaded = true
  }
}
