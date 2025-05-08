import { Point } from './Point'

export class Opti {
  pen: number
  c: Point[]
  t: number
  s: number
  alpha: number

  constructor() {
    this.pen = 0
    this.c = [new Point(), new Point()]
    this.t = 0
    this.s = 0
    this.alpha = 0
  }

  /**
   * Creates a copy of this Opti instance
   * @returns A new Opti instance with the same properties
   */
  copy(): Opti {
    const newOpti = new Opti()
    newOpti.c = [this.c[0].copy(), this.c[1].copy()]
    newOpti.alpha = this.alpha
    newOpti.t = this.t
    newOpti.s = this.s
    newOpti.pen = this.pen
    return newOpti
  }
}
