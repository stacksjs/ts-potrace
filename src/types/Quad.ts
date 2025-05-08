export class Quad {
  data: number[]

  constructor() {
    this.data = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  }

  at(x: number, y: number): number {
    return this.data[x * 3 + y]
  }
}
