import type { Curve } from './Curve'
import type { Point } from './Point'
import type { Sum } from './Sum'

export class Path {
  area: number
  len: number
  curve: Curve | null
  pt: Point[]
  minX: number
  minY: number
  maxX: number
  maxY: number

  // Additional properties needed for Potrace implementation
  sign?: string // Sign of the path (+ or -)
  x0?: number // Origin x coordinate
  y0?: number // Origin y coordinate
  sums?: Sum[] // Sum of points
  lon?: number[] // Longest edges
  m?: number // Number of segments in polygon
  po?: number[] // Polygon point indices

  constructor() {
    this.area = 0
    this.len = 0
    this.curve = null
    this.pt = []
    this.minX = 100000
    this.minY = 100000
    this.maxX = -1
    this.maxY = -1
  }
}
