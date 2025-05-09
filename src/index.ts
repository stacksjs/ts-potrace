import Posterizer from './Posterizer'
import Potrace from './Potrace'
import * as types from './types'

export * from './config'
export * from './types'

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param file - Source image, file path or Jimp instance
 * @param options - Potrace options
 * @param cb - Callback function
 */
function trace(file: string | Buffer | any, options?: any, cb?: traceCallback): void {
  if (arguments.length === 2) {
    cb = options
    options = {}
  }

  const potrace = new Potrace(options)

  potrace.loadImage(file, (err: Error | null) => {
    if (err) { return cb?.(err) }
    cb?.(null, potrace.getSVG(), potrace)
  })
}

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param file - Source image, file path or Jimp instance
 * @param options - Posterizer options
 * @param cb - Callback function
 */
function posterize(file: string | Buffer | any, options?: any, cb?: posterizeCallback): void {
  if (arguments.length === 2) {
    cb = options
    options = {}
  }

  const posterizer = new Posterizer(options)

  posterizer.loadImage(file, (err: Error | null) => {
    if (err) { return cb?.(err) }
    cb?.(null, posterizer.getSVG(), posterizer)
  })
}

/**
 * Callback for trace method
 * @callback traceCallback
 * @param err - Error or null
 * @param svg - SVG document contents
 * @param instance - Potrace class instance
 */
export type traceCallback = (err: Error | null, svg?: string, instance?: Potrace) => void

/**
 * Callback for posterize method
 * @callback posterizeCallback
 * @param err - Error or null
 * @param svg - SVG document contents
 * @param instance - Posterizer class instance
 */
export type posterizeCallback = (err: Error | null, svg?: string, instance?: Posterizer) => void

export {
  posterize,
  Posterizer,
  Potrace,
  trace,
  types,
}
