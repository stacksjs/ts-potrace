export class Point {
  x: number
  y: number

  constructor(x?: number, y?: number) {
    this.x = x || 0
    this.y = y || 0
  }

  copy(): Point {
    return new Point(this.x, this.y)
  }
}
