import type { Point } from './Point'

/**
 * Curve type
 */
export class Curve {
  n: number
  tag: string[]
  c: Point[]
  alphaCurve: number
  vertex: Point[]
  alpha: number[]
  alpha0: number[]
  beta: number[]

  /**
   * @param n - Number of segments
   */
  constructor(n: number) {
    this.n = n
    this.tag = Array.from({ length: n })
    this.c = Array.from({ length: n * 3 })
    this.alphaCurve = 0
    this.vertex = Array.from({ length: n })
    this.alpha = Array.from({ length: n })
    this.alpha0 = Array.from({ length: n })
    this.beta = Array.from({ length: n })
  }
}
