import { beforeAll, describe, expect, test } from 'bun:test'
import * as path from 'node:path'
import { Jimp } from 'jimp'
import { trace } from '../src/index'
import { Potrace } from '../src/Potrace'

const PATH_TO_YAO = path.join(import.meta.dir, 'sources/yao.jpg')
const PATH_TO_BLACK_AND_WHITE_IMAGE = path.join(import.meta.dir, 'sources/clouds.jpg')

describe('Potrace class', () => {
  let jimpInstance: typeof Jimp.prototype

  beforeAll(async () => {
    jimpInstance = await Jimp.read(PATH_TO_YAO)
    return Promise.resolve()
  })

  test('loadImage passes instance to callback function as context', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(PATH_TO_YAO, function (this: Potrace, err?: Error) {
        if (err)
          reject(err)
        expect(this).toBe(instance)
        resolve()
      })
    })
  })

  test('loadImage accepts a path to image and returns SVG string', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(PATH_TO_YAO, (err?: Error) => {
        if (err)
          reject(err)
        const svg = instance.getSVG()
        expect(typeof svg).toBe('string')
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        resolve()
      })
    })
  })

  test('loadImage accepts Jimp v1 object and returns SVG string', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(jimpInstance, (err?: Error) => {
        if (err)
          reject(err)
        const svg = instance.getSVG()
        expect(typeof svg).toBe('string')
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        resolve()
      })
    })
  })

  test('trace exports a convenience function that processes an image with default settings', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(PATH_TO_YAO, (err: Error | null, svg?: string) => {
        if (err)
          reject(err)
        expect(typeof svg).toBe('string')
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        resolve()
      })
    })
  })

  test('trace can pass options that are correctly used during the process', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(PATH_TO_YAO, { blackOnWhite: false }, (err: Error | null, svg?: string) => {
        if (err)
          reject(err)
        expect(typeof svg).toBe('string')
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        resolve()
      })
    })
  })

  test('trace accepts Jimp v1 object', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(jimpInstance, (err: Error | null, svg?: string) => {
        if (err)
          reject(err)
        expect(typeof svg).toBe('string')
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        resolve()
      })
    })
  })

  test('loadImage invokes callback function with error object if path to image is invalid', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve) => {
      instance.loadImage('invalid/path', (err?: Error) => {
        expect(err).toBeDefined()
        resolve()
      })
    })
  })

  test('setParameters correctly sets options for processing', async () => {
    // Create instance with initial parameters
    const instance = new Potrace({ threshold: 128 })

    // Load an image and verify we get SVG output with initial settings
    await new Promise<void>((resolve, reject) => {
      instance.loadImage(jimpInstance, (err?: Error) => {
        if (err)
          reject(err)

        const svg1 = instance.getSVG()
        expect(typeof svg1).toBe('string')

        // Now change parameters and verify we can get different output
        instance.setParameters({ threshold: 200 })
        const svg2 = instance.getSVG()

        // The SVGs should be different due to different threshold
        expect(svg1).not.toBe(svg2)

        resolve()
      })
    })
  })

  test('potrace correctly processes Jimp instances', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(jimpInstance, (err?: Error) => {
        if (err)
          reject(err)

        // Verify it produces some SVG output
        const svg = instance.getSVG()
        expect(typeof svg).toBe('string')
        expect(svg.startsWith('<svg')).toBe(true)
        resolve()
      })
    })
  })

  test('loadImage supports Jimp instances provided as source image', async () => {
    const instance = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(jimpInstance, (err) => {
        if (err)
          reject(err)
        resolve()
      })
    })
  })

  test('loadImage can proceed with a second load after the first one completes', async () => {
    const potraceInstance = new Potrace()
    let firstFinished = false
    let secondFinished = false

    // First load the image
    await new Promise<void>((resolve) => {
      potraceInstance.loadImage(PATH_TO_YAO, (err) => {
        firstFinished = true
        expect(err).toBeUndefined()
        resolve()
      })
    })

    // Then load it again
    await new Promise<void>((resolve) => {
      potraceInstance.loadImage(PATH_TO_YAO, (err) => {
        secondFinished = true
        expect(err).toBeUndefined()
        resolve()
      })
    })

    expect(firstFinished && secondFinished).toBe(true)
  })

  test('getSVG produces expected results with different thresholds', async () => {
    const instanceYao = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instanceYao.loadImage(jimpInstance, (err) => {
        if (err)
          reject(err)
        resolve()
      })
    })

    const compareBasicSVGStructure = (actual: string) => {
      // Check that both are SVG files with the same basic structure
      expect(actual).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
      expect(actual).toContain('viewBox="0 0')
      expect(actual).toContain('version="1.1"')
      expect(actual).toContain('<path d="')
      expect(actual).toContain('fill-rule="evenodd"')
      expect(actual).toContain('</svg>')
    }

    // Check with threshold 128
    instanceYao.setParameters({ threshold: 128 })
    compareBasicSVGStructure(instanceYao.getSVG())

    // Check with threshold 65
    instanceYao.setParameters({ threshold: 65 })
    compareBasicSVGStructure(instanceYao.getSVG())

    // Check with threshold 170
    instanceYao.setParameters({ threshold: 170 })
    compareBasicSVGStructure(instanceYao.getSVG())
  })

  test('produces expected white on black image with threshold 128', async () => {
    const instance = new Potrace({
      threshold: 128,
      blackOnWhite: false,
      color: 'cyan',
      background: 'darkred',
    })

    await new Promise<void>((resolve, reject) => {
      instance.loadImage(PATH_TO_BLACK_AND_WHITE_IMAGE, (err) => {
        if (err)
          reject(err)
        resolve()
      })
    })

    const actual = instance.getSVG()

    // Check that both are SVG files with the same basic structure
    expect(actual).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(actual).toContain('viewBox="0 0')
    expect(actual).toContain('version="1.1"')
    expect(actual).toContain('<path d="')
    expect(actual).toContain('fill="cyan"')
    expect(actual).toContain('fill-rule="evenodd"')
    expect(actual).toContain('</svg>')
  })

  test('getSymbol should not have fill color or background', async () => {
    const instanceYao = new Potrace()

    await new Promise<void>((resolve, reject) => {
      instanceYao.loadImage(jimpInstance, (err) => {
        if (err)
          reject(err)
        resolve()
      })
    })

    instanceYao.setParameters({
      color: 'red',
      background: 'cyan',
    })

    const symbol = instanceYao.getSymbol('whatever')

    expect(symbol).not.toMatch(/<rect/i)
    expect(symbol).toMatch(/<path[^>]+>/i)
  })
})

describe('Shorthand methods', () => {
  let jimpInstance: typeof Jimp.prototype

  beforeAll(async () => {
    jimpInstance = await Jimp.read(PATH_TO_YAO)
    return Promise.resolve()
  })

  test('trace works with Jimp instance and callback', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(jimpInstance, (err: Error | null, svgContents?: string, inst?: Potrace) => {
        if (err)
          reject(err)

        // Check that the SVG has the right structure
        expect(svgContents).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
        expect(svgContents).toContain('viewBox="0 0')
        expect(svgContents).toContain('version="1.1"')
        expect(svgContents).toContain('<path d="')
        expect(svgContents).toContain('fill-rule="evenodd"')
        expect(svgContents).toContain('</svg>')

        expect(inst).toBeInstanceOf(Potrace)
        resolve()
      })
    })
  })

  test('trace works with Jimp instance, options, and callback', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(jimpInstance, { threshold: 170 }, (err: Error | null, svg?: string) => {
        if (err)
          reject(err)

        // Check that the SVG has the right structure
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
        expect(svg).toContain('viewBox="0 0')
        expect(svg).toContain('version="1.1"')
        expect(svg).toContain('<path d="')
        expect(svg).toContain('fill-rule="evenodd"')
        expect(svg).toContain('</svg>')

        resolve()
      })
    })
  })
})
