import type Curve from './types/Curve'
import Point from './types/Point'

const attrRegexps: Record<string, RegExp> = {}

function getAttrRegexp(attrName: string) {
  if (attrRegexps[attrName]) {
    return attrRegexps[attrName]
  }

  attrRegexps[attrName] = new RegExp(` ${attrName}="((?:\\\\(?=")"|[^"])+)"`, 'i')
  return attrRegexps[attrName]
}

function setHtmlAttribute(html: string, attrName: string, value: string) {
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

function fixed(number: number) {
  return number.toFixed(3).replace('.000', '')
}

function mod(a: number, n: number) {
  return a >= n ? a % n : a >= 0 ? a : n - 1 - (-1 - a) % n
}

function xprod(p1: Point, p2: Point) {
  return p1.x * p2.y - p1.y * p2.x
}

function cyclic(a: number, b: number, c: number) {
  if (a <= c) {
    return (a <= b && b < c)
  }

  return (a <= b || b < c)
}

function sign(i: number) {
  return i > 0 ? 1 : i < 0 ? -1 : 0
}

function quadform(Q: number[][], w: Point) {
  const v = Array.from({ length: 3 })
  let i
  let j
  let sum

  v[0] = w.x
  v[1] = w.y
  v[2] = 1
  sum = 0.0

  for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      sum += v[i] * Q.at(i, j) * v[j]
    }
  }
  return sum
}

function interval(lambda: number, a: Point, b: Point) {
  const res = new Point()

  res.x = a.x + lambda * (b.x - a.x)
  res.y = a.y + lambda * (b.y - a.y)
  return res
}

function dorth_infty(p0: Point, p2: Point) {
  const r = new Point()

  r.y = sign(p2.x - p0.x)
  r.x = -sign(p2.y - p0.y)

  return r
}

function ddenom(p0: Point, p2: Point) {
  const r = dorth_infty(p0, p2)

  return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y)
}

function dpara(p0: Point, p1: Point, p2: Point) {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * y2 - x2 * y1
}

function cprod(p0: Point, p1: Point, p2: Point, p3: Point) {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * y2 - x2 * y1
}

function iprod(p0: Point, p1: Point, p2: Point) {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p2.x - p0.x
  const y2 = p2.y - p0.y

  return x1 * x2 + y1 * y2
}

function iprod1(p0: Point, p1: Point, p2: Point, p3: Point) {
  const x1 = p1.x - p0.x
  const y1 = p1.y - p0.y
  const x2 = p3.x - p2.x
  const y2 = p3.y - p2.y

  return x1 * x2 + y1 * y2
}

function ddist(p: Point, q: Point) {
  return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y))
}

module.exports = {
  luminance(r: number, g: number, b: number) {
    return Math.round(0.2126 * r + 0.7153 * g + 0.0721 * b)
  },

  between(val: number, min: number, max: number) {
    return val >= min && val <= max
  },

  clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val))
  },

  isNumber(val: number) {
    return typeof val === 'number'
  },

  setHtmlAttr: setHtmlAttribute,

  /**
   * Generates path instructions for given curve
   *
   * @param {Curve} curve
   * @param {number} [scale]
   * @returns {string}
   */
  renderCurve(curve: Curve, scale: { x: number, y: number }) {
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
  },

  bezier: function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point) {
    const s = 1 - t
    const res = new Point()

    res.x = s * s * s * p0.x + 3 * (s * s * t) * p1.x + 3 * (t * t * s) * p2.x + t * t * t * p3.x
    res.y = s * s * s * p0.y + 3 * (s * s * t) * p1.y + 3 * (t * t * s) * p2.y + t * t * t * p3.y

    return res
  },

  tangent: function tangent(p0: Point, p1: Point, p2: Point, p3: Point, q0: Point, q1: Point) {
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
  },

  mod,
  xprod,
  cyclic,
  sign,
  quadform,
  interval,
  dorth_infty,
  ddenom,
  dpara,
  cprod,
  iprod,
  iprod1,
  ddist,
}
