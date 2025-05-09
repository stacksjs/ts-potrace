import { Point } from './Point'

/**
 * Optimization helper class
 */
export class Opti {
  pen: number = 0
  c: Point[] = [new Point(), new Point()]
  t: number = 0
  s: number = 0
  alpha: number = 0
}

export default Opti
