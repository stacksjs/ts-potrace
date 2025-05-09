/**
 * Quad class for quadratic elements storage
 */
export class Quad {
  data: number[]

  constructor() {
    this.data = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  }

  /**
   * Access matrix element at specific position
   * @param i - Row index
   * @param j - Column index
   */
  at(i: number, j: number): number {
    return this.data[i * 3 + j]
  }
}

export default Quad
