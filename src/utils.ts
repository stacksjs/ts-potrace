import type { Curve } from './types/Curve'
import type { Quad } from './types/Quad'
import { Point } from './types/Point'

const attrRegexps: Record<string, RegExp> = {}

/**
 * Get RegExp for an attribute name
 * @param attrName - Attribute name
 * @returns RegExp for the attribute
 */
function getAttrRegexp(attrName: string): RegExp {
  if (attrRegexps[attrName]) {
    return attrRegexps[attrName]
  }

  attrRegexps[attrName] = new RegExp(` ${attrName}="((?:\\\\(?=")"|[^"])+)"`, 'i')
  return attrRegexps[attrName]
}

/**
 * Sets an HTML attribute in an HTML tag string
 * @param html - HTML tag string
 * @param attrName - Attribute name
 * @param value - Attribute value
 * @returns Updated HTML tag string
 */
export function setHtmlAttr(html: string, attrName: string, value: string): string {
  const attr = ` ${attrName}="${value}"`

  if (!html.includes(` ${attrName}="`)) {
    html = html.replace(/<[a-z]+/i, (beginning) => {
      return beginning + attr
    })
  }
  else {
    html = html.replace(getAttrRegexp(attrName), attr)
  }

  return html
}

/**
 * Format number to fixed-point notation
 * @param number - Number to format
 * @returns Formatted number string
 */
function fixed(number: number): string {
  return number.toFixed(3).replace('.000', '')
}

/**
 * Returns value modulo n
 * @param a - Dividend
 * @param n - Divisor
 * @returns Modulo result
 */
export function mod(a: number, n: number): number {
  return a >= n ? a % n : a >= 0 ? a : n - 1 - (-1 - a) % n
}

/**
 * Calculate cross product of two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Cross product result
 */
export function xprod(p1: Point, p2: Point): number {
  return p1.x * p2.y - p1.y * p2.x
}

/**
 * Check if a number is between others in cyclic order
 * @param a - First number
 * @param b - Second number
 * @param c - Third number
 * @returns True if b is between a and c
 */
export function cyclic(a: number, b: number, c: number): boolean {
  if (a <= c) {
    return (a <= b && b < c)
  }

  return (a <= b || b < c)
}

/**
 * Get the sign of a number
 * @param i - Number to check
 * @returns 1 for positive, -1 for negative, 0 for zero
 */
export function sign(i: number): number {
  return i > 0 ? 1 : i < 0 ? -1 : 0
}

/**
 * Calculate quadratic form
 * @param Q - Matrix
 * @param w - Point
 * @returns Result of quadratic form
 */
export function quadform(Q: Quad, w: Point): number {
  const v = [w.x, w.y, 1]
  let sum = 0.0

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += v[i] * Q.at(i, j) * v[j]
    }
  }
  return sum
}

/**
 * Linear interpolation between two points
 * @param lambda - Interpolation parameter (0..1)
 * @param a - First point
 * @param b - Second point
 * @returns Interpolated point
 */
export function interval(lambda: number, a: Point, b: Point): Point {
  const res = new Point()

  res.x = a.x + lambda * (b.x - a.x)
  res.y = a.y + lambda * (b.y - a.y)
  return res
}

/**
 * Calculates orthogonal direction vector at infinity
 * @param p0 - Start point
 * @param p2 - End point
 * @returns Direction vector
 */
export function dorth_infty(p0: Point, p2: Point): Point {
  const r = new Point()

  r.y = sign(p2.x - p0.x)
  r.x = -sign(p2.y - p0.y)

  return r
}

/**
 * Calculates denominator for ddist
 * @param p0 - First point
 * @param p2 - Second point
 * @returns Denominator value
 */
export function ddenom(p0: Point, p2: Point): number {
  const r = dorth_infty(p0, p2)

  return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y)
}

/**
 * Calculate the determinant of the 3 points (the area of the parallelogram)
 * @param p0 - First point
 * @param p1 - Second point
 * @param p2 - Third point
 * @returns Determinant/area
 */
export function dpara(p0: Point, p1: Point, p2: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * y2 - x2 * y1
}

/**
 * Calculate cross product of two line segments
 * @param p0 - First point of first segment
 * @param p1 - Second point of first segment
 * @param p2 - First point of second segment
 * @param p3 - Second point of second segment
 * @returns Cross product
 */
export function cprod(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * y2 - x2 * y1
}

/**
 * Calculate inner product of two vectors
 * @param p0 - Origin point
 * @param p1 - First vector end point
 * @param p2 - Second vector end point
 * @returns Dot product
 */
export function iprod(p0: Point, p1: Point, p2: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * x2 + y1 * y2
}

/**
 * Calculate inner product of two line segments
 * @param p0 - First point of first segment
 * @param p1 - Second point of first segment
 * @param p2 - First point of second segment
 * @param p3 - Second point of second segment
 * @returns Dot product
 */
export function iprod1(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * x2 + y1 * y2
}

/**
 * Calculate Euclidean distance between two points
 * @param p - First point
 * @param q - Second point
 * @returns Distance
 */
export function ddist(p: Point, q: Point): number {
  return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y))
}

/**
 * Calculate RGB luminance value
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Luminance value
 */
export function luminance(r: number, g: number, b: number): number {
  return Math.round(0.2126 * r + 0.7153 * g + 0.0721 * b)
}

/**
 * Check if a value is between a min and max (inclusive)
 * @param val - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns true if the value is in range
 */
export function between(val: number, min: number, max: number): boolean {
  return val >= min && val <= max
}

/**
 * Clamp a value between a min and max
 * @param val - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

/**
 * Check if a value is a number
 * @param val - Value to check
 * @returns true if the value is a number
 */
export function isNumber(val: any): boolean {
  return typeof val === 'number'
}

/**
 * Generates path instructions for given curve
 *
 * @param curve - Curve to render
 * @param scale - Scale factor
 * @returns SVG path instructions
 */
export function renderCurve(curve: any, scale?: { x: number, y: number }): string {
  scale = scale || { x: 1, y: 1 }

  const startingPoint = curve.c[(curve.n - 1) * 3 + 2]

  const path = [
    `M ${
      fixed(startingPoint.x * scale.x)} ${
      fixed(startingPoint.y * scale.y)}`,
  ]

  curve.tag.forEach((tag: string, i: number) => {
    const i3 = i * 3
    const p0 = curve.c[i3]
    const p1 = curve.c[i3 + 1]
    const p2 = curve.c[i3 + 2]

    if (tag === 'CURVE') {
      path.push(
        `C ${
          fixed(p0.x * scale.x)} ${fixed(p0.y * scale.y)}, ${
          fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)}, ${
          fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`,
      )
    }
    else if (tag === 'CORNER') {
      path.push(
        `L ${
          fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)} ${
          fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`,
      )
    }
  })

  return path.join(' ')
}

/**
 * Calculate a point on a bezier curve for a given t value
 * @param t - Parameter in [0,1]
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @returns Point on the bezier curve
 */
export function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const s = 1 - t
  const res = new Point()

  res.x = s * s * s * p0.x + 3 * (s * s * t) * p1.x + 3 * (t * t * s) * p2.x + t * t * t * p3.x
  res.y = s * s * s * p0.y + 3 * (s * s * t) * p1.y + 3 * (t * t * s) * p2.y + t * t * t * p3.y

  return res
}

/**
 * Calculate the best t value where a line from q0-q1 intersects the bezier curve
 * @param p0 - Bezier start point
 * @param p1 - First bezier control point
 * @param p2 - Second bezier control point
 * @param p3 - Bezier end point
 * @param q0 - Line start point
 * @param q1 - Line end point
 * @returns Parameter t or -1 if no solution found
 */
export function tangent(p0: Point, p1: Point, p2: Point, p3: Point, q0: Point, q1: Point): number {
  const A = cprod(p0, p1, q0, q1)
  const B = cprod(p1, p2, q0, q1)
  const C = cprod(p2, p3, q0, q1)

  const a = A - 2 * B + C
  const b = -2 * A + 2 * B
  const c = A

  const d = b * b - 4 * a * c

  if (a === 0 || d < 0) {
    return -1.0
  }

  const s = Math.sqrt(d)

  const r1 = (-b + s) / (2 * a)
  const r2 = (-b - s) / (2 * a)

  if (r1 >= 0 && r1 <= 1) {
    return r1
  }

  if (r2 >= 0 && r2 <= 1) {
    return r2
  }

  return -1.0
}
