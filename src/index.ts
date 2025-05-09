export * from './config'
export * from './types'

let Posterizer = require('./Posterizer')
let Potrace = require('./Potrace')

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param {string|Buffer|Jimp} file Source image, file path or {@link Jimp} instance
 * @param {Potrace~Options} [options]
 * @param {traceCallback} cb Callback function. Accepts 3 arguments: error, svg content and instance of {@link Potrace} (so it could be reused with different set of parameters)
 */
function trace(file, options, cb) {
  if (arguments.length === 2) {
    cb = options
    options = {}
  }

  let potrace = new Potrace(options)

  potrace.loadImage(file, (err) => {
    if (err) { return cb(err) }
    cb(null, potrace.getSVG(), potrace)
  })
}

/**
 * Wrapper for Potrace that simplifies use down to one function call
 *
 * @param {string|Buffer|Jimp} file Source image, file path or {@link Jimp} instance
 * @param {Posterizer~Options} [options]
 * @param {posterizeCallback} cb Callback function. Accepts 3 arguments: error, svg content and instance of {@link Potrace} (so it could be reused with different set of parameters)
 */
function posterize(file, options, cb) {
  if (arguments.length === 2) {
    cb = options
    options = {}
  }

  let posterizer = new Posterizer(options)

  posterizer.loadImage(file, (err) => {
    if (err) { return cb(err) }
    cb(null, posterizer.getSVG(), posterizer)
  })
}

module.exports = {
  trace,
  posterize,
  Potrace,
  Posterizer,
}

/**
 * Callback for trace method
 * @callback traceCallback
 * @param {Error|null} err
 * @param {string} svg SVG document contents
 * @param {Potrace} [instance] Potrace class instance
 */

/**
 * Callback for posterize method
 * @callback posterizeCallback
 * @param {Error|null} err
 * @param {string} svg SVG document contents
 * @param {Posterizer} [instance] Posterizer class instance
 */
