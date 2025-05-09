export interface BinaryConfig {
  from: string
  verbose: boolean
}

// Potrace and Posterizer related types
export interface PotraceOptions {
  turnPolicy?: string
  turdSize?: number
  alphaMax?: number
  optCurve?: boolean
  optTolerance?: number
  threshold?: number
  blackOnWhite?: boolean
  color?: string
  background?: string
  width?: number | null
  height?: number | null
}

export interface PosterizerOptions extends PotraceOptions {
  steps?: number | number[]
  rangeDistribution?: string
  fillStrategy?: string
}

export interface Point {
  x: number
  y: number
}

export interface Path {
  sign: string
  area: number
  len: number
  pt: Point[]
  minX: number
  minY: number
  maxX: number
  maxY: number
  curve?: Curve
  x0?: number
  y0?: number
  sums?: Sum[]
}

export interface Curve {
  alphaCurve: number
  beta: number
  tag: string
  c: Point[]
  vertex: Point[]
  n?: number
}

export interface HistogramStats {
  levels: {
    mean: number
    median: number
    stdDev: number
    unique: number
  }
  pixelsPerLevel: {
    mean: number
    median: number
    peak: number
  }
  pixels: number
}

export interface Sum {
  x: number
  y: number
  xy: number
  x2: number
  y2: number
}

export interface Bitmap {
  width: number
  height: number
  size: number
  data: Uint8Array
  copy: (mapper: (val: number) => number) => Bitmap
  getValueAt: (x: number, y: number) => number
  setValueAt: (x: number, y: number, value: number) => void
  pointToIndex: (x: number, y: number) => number
  indexToPoint: (idx: number) => Point
  histogram: () => any
}

export interface Range {
  value: number
  color?: string
  fillColor?: string
  opacity?: number
  colorIntensity?: number
}

export type LoadImageCallback = (err: Error | null) => void

export { default as Posterizer } from './Posterizer'
// Re-export classes for type usage
export { default as Potrace } from './Potrace'
export { default as Histogram } from './types/Histogram'
