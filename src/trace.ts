import type { Buffer } from 'node:buffer'
import type { PotraceOptions } from './Potrace'
import { Potrace } from './Potrace'

/**
 * Callback for trace method
 */
export type TraceCallback = (
  err: Error | null,
  svg?: string,
  instance?: Potrace
) => void

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param file - Source image, file path or Jimp instance
 * @param options - Optional Potrace options
 * @param cb - Callback function
 */
export function trace(
  file: string | Buffer | any, // Using 'any' for Jimp to avoid type reference issues
  options: PotraceOptions | TraceCallback,
  cb?: TraceCallback,
): void {
  if (arguments.length === 2) {
    cb = options as TraceCallback
    options = {}
  }

  const potrace = new Potrace(options as PotraceOptions)

  potrace.loadImage(file, (err) => {
    if (err) {
      return (cb as TraceCallback).call(potrace, err)
    }

    (cb as TraceCallback).call(potrace, null, potrace.getSVG(), potrace)
  })
}
