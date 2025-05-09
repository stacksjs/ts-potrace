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
}

export interface Curve {
  alphaCurve: number
  beta: number
  tag: string
  c: Point[]
  vertex: Point[]
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

export interface Histogram {
  MODE_LUMINANCE: 'luminance'
  MODE_SATURATION: 'saturation'
  getDominantColor: (min?: number, max?: number, tolerance?: number) => number
  getStats: (min?: number, max?: number) => HistogramStats
  multilevelThresholding: (count: number, min?: number, max?: number) => number[]
}

export interface Range {
  value: number
  color?: string
  fillColor?: string
  opacity?: number
  colorIntensity?: number
}

export type LoadImageCallback = (err: Error | null) => void
