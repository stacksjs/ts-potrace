import type { Curve } from './Curve'
import type { Point } from './Point'

/**
 * Path class for storing path data
 */
export class Path {
  area: number = 0
  len: number = 0
  curve?: Curve
  pt: Point[] = []
  minX: number = 100000
  minY: number = 100000
  maxX: number = -1
  maxY: number = -1
  sign: string = '+'
  x0: number = 0
  y0: number = 0
  sums?: any[] // Will be refined later
  po?: number[] // Will be refined later
  m?: number // Will be refined later
  lon?: number[] // Will be refined later
}

export default Path
