import type { Curve } from './types/Curve'
import { Point } from './types/Point'

// Define attrRegexps object for HTML attribute handling
const attrRegexps: Record<string, RegExp> = {}

/**
 * Calculates luminance from RGB values
 */
export function luminance(r: number, g: number, b: number): number {
  return Math.round(0.2126 * r + 0.7153 * g + 0.0721 * b)
}

/**
 * Checks if value is between min and max, inclusive
 */
export function between(val: number, min: number, max: number): boolean {
  return val >= min && val <= max
}

/**
 * Clamps value between min and max, inclusive
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

/**
 * Checks if value is a number
 */
export function isNumber(val: any): val is number {
  return typeof val === 'number'
}

/**
 * Sets HTML attribute on an element
 */
export function setHtmlAttr(html: string, attrName: string, value: string): string {
  return setHtmlAttribute(html, attrName, value)
}

function getAttrRegexp(attrName: string): RegExp {
  if (attrRegexps[attrName]) {
    return attrRegexps[attrName]
  }

  attrRegexps[attrName] = new RegExp(` ${attrName}="((?:\\\\(?=")"|[^"])+)"`, 'i')
  return attrRegexps[attrName]
}

function setHtmlAttribute(html: string, attrName: string, value: string): string {
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
 * Format a number to a fixed number of decimal places with proper comma formatting
 * like in the reference SVG
 */
export function fixed(number: number): string {
  // Format with 3 decimal places
  let formatted = number.toFixed(3)

  // Remove trailing zeros
  if (formatted.endsWith('.000')) {
    formatted = formatted.slice(0, -4)
  }
  else if (formatted.endsWith('00')) {
    formatted = formatted.slice(0, -2)
  }
  else if (formatted.endsWith('0')) {
    formatted = formatted.slice(0, -1)
  }

  // Replace decimal point with comma + space
  return formatted.replace('.', ', ')
}

/**
 * Generates path instructions for given curve
 */
export function renderCurve(curve: Curve, scale?: { x: number, y: number }): string {
  scale = scale || { x: 1, y: 1 }

  const startingPoint = curve.c[(curve.n - 1) * 3 + 2]

  const path = [
    `M ${fixed(startingPoint.x * scale.x)} ${fixed(startingPoint.y * scale.y)}`,
  ]

  curve.tag.forEach((tag, i) => {
    const i3 = i * 3
    const p0 = curve.c[i3]
    const p1 = curve.c[i3 + 1]
    const p2 = curve.c[i3 + 2]

    if (tag === 'CURVE') {
      path.push(
        `C ${fixed(p0.x * scale.x)} ${fixed(p0.y * scale.y)}, ${fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)}, ${fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`,
      )
    }
    else if (tag === 'CORNER') {
      path.push(
        `L ${fixed(p0.x * scale.x)} ${fixed(p0.y * scale.y)}`,
      )
      path.push(
        `L ${fixed(p1.x * scale.x)} ${fixed(p1.y * scale.y)}`,
      )
      path.push(
        `L ${fixed(p2.x * scale.x)} ${fixed(p2.y * scale.y)}`,
      )
    }
  })

  return path.join(' ')
}

/**
 * Calculate bezier curve point
 */
export function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const s = 1 - t
  const res = new Point()

  res.x = s * s * s * p0.x + 3 * (s * s * t) * p1.x + 3 * (t * t * s) * p2.x + t * t * t * p3.x
  res.y = s * s * s * p0.y + 3 * (s * s * t) * p1.y + 3 * (t * t * s) * p2.y + t * t * t * p3.y

  return res
}

/**
 * Calculate tangent point
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
  else if (r2 >= 0 && r2 <= 1) {
    return r2
  }
  else {
    return -1.0
  }
}

export function mod(a: number, n: number): number {
  return a >= n ? a % n : a >= 0 ? a : n - 1 - (-1 - a) % n
}

export function xprod(p1: Point, p2: Point): number {
  return p1.x * p2.y - p1.y * p2.x
}

export function cyclic(a: number, b: number, c: number): boolean {
  if (a <= c) {
    return (a <= b && b < c)
  }
  else {
    return (a <= b || b < c)
  }
}

export function sign(i: number): number {
  return i > 0 ? 1 : i < 0 ? -1 : 0
}

export function quadform(Q: any, w: Point): number {
  const v = [w.x, w.y, 1]
  let sum = 0.0

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += v[i] * Q.at(i, j) * v[j]
    }
  }

  return sum
}

export function interval(lambda: number, a: Point, b: Point): Point {
  const res = new Point()

  res.x = a.x + lambda * (b.x - a.x)
  res.y = a.y + lambda * (b.y - a.y)

  return res
}

export function dorth_infty(p0: Point, p2: Point): Point {
  const r = new Point()

  r.y = sign(p2.x - p0.x)
  r.x = -sign(p2.y - p0.y)

  return r
}

export function ddenom(p0: Point, p2: Point): number {
  const r = dorth_infty(p0, p2)

  return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y)
}

export function dpara(p0: Point, p1: Point, p2: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * y2 - x2 * y1
}

export function cprod(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * y2 - x2 * y1
}

export function iprod(p0: Point, p1: Point, p2: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * x2 + y1 * y2
}

export function iprod1(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * x2 + y1 * y2
}

export function ddist(p: Point, q: Point): number {
  return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y))
}
