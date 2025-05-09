/**
 * Sum class for storing accumulated values
 */
export class Sum {
  x: number
  y: number
  xy: number
  x2: number
  y2: number

  constructor(x: number = 0, y: number = 0, xy: number = 0, x2: number = 0, y2: number = 0) {
    this.x = x
    this.y = y
    this.xy = xy
    this.x2 = x2
    this.y2 = y2
  }
}

export default Sum
