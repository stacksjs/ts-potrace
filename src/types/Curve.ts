/**
 * Curve type
 *
 * @param n
 * @constructor
 * @protected
 */
export function Curve(n: number): {
  n: number;
  tag: string[];
  c: number[];
  alphaCurve: number;
  vertex: number[];
  alpha: number[];
  alpha0: number[];
  beta: number[];
} {
  return {
    n,
    tag: new Array(n),
    c: new Array(n * 3),
    alphaCurve: 0,
    vertex: new Array(n),
    alpha: new Array(n),
    alpha0: new Array(n),
    beta: new Array(n),
  };
}

export default Curve
