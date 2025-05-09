import type { PosterizeCallback, TraceCallback } from '../src/index'
import { describe, expect, test } from 'bun:test'
import * as path from 'node:path'
import { Jimp } from 'jimp'
import { posterize, trace } from '../src/index'

const PATH_TO_YAO = path.join(import.meta.dir, 'sources/yao.jpg')
const PATH_TO_CLOUDS = path.join(import.meta.dir, 'sources/clouds.jpg')

describe('Image Processing with Modern Jimp API', () => {
  test('can load and process images with Jimp v1', async () => {
    // Use modern Jimp API to load an image
    const image = await Jimp.read(PATH_TO_YAO)
    expect(image).toBeDefined()
    expect(image.bitmap).toBeDefined()

    // Test resizing with modern API (no AUTO constant needed)
    const resized = image.clone().resize({ w: 200 })
    expect(resized.bitmap.width).toBe(200)

    // Test that we can pass the image to Potrace
    let svgResult = ''
    await new Promise<void>((resolve, reject) => {
      trace(image, ((err: Error | null, svg?: string) => {
        if (err)
          reject(err)
        if (!svg) {
          reject(new Error('No SVG generated'))
          return
        }
        svgResult = svg
        resolve()
      }) as TraceCallback)
    })

    expect(svgResult).toBeDefined()
    expect(typeof svgResult).toBe('string')
    expect(svgResult.startsWith('<svg')).toBe(true)
  })

  test('can use Posterizer with Jimp v1', async () => {
    const image = await Jimp.read(PATH_TO_CLOUDS)
    expect(image).toBeDefined()

    let svgResult = ''
    await new Promise<void>((resolve, reject) => {
      posterize(image, {
        steps: 3,
      }, ((err: Error | null, svg?: string) => {
        if (err)
          reject(err)
        if (!svg) {
          reject(new Error('No SVG generated'))
          return
        }
        svgResult = svg
        resolve()
      }) as PosterizeCallback)
    })

    expect(svgResult).toBeDefined()
    expect(typeof svgResult).toBe('string')
    expect(svgResult.startsWith('<svg')).toBe(true)
  })
})
