import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { Jimp } from 'jimp'
import { trace } from '../src/index'
import { Potrace } from '../src/Potrace'

describe('Potrace with real image', () => {
  // Path to test image
  const imagePath = join(__dirname, 'sources/yao.jpg')

  it('should trace an image using Potrace class', async () => {
    // Load the image with Jimp
    const image = await Jimp.read(imagePath)

    // Create Potrace instance
    const potrace = new Potrace({ threshold: 128 })

    // Load image and get SVG
    await new Promise<void>((resolve, reject) => {
      potrace.loadImage(image, (err) => {
        if (err) {
          reject(err)
        }
        else {
          // Generate SVG
          const svg = potrace.getSVG()

          // Basic verification
          expect(svg).toBeDefined()
          expect(svg).toContain('<svg')
          expect(svg).toContain('<path')
          expect(svg).toContain('</svg>')

          resolve()
        }
      })
    })
  })

  it('should trace an image using the trace function', async () => {
    await new Promise<void>((resolve, reject) => {
      trace(imagePath, { threshold: 128 }, (err, svg) => {
        if (err) {
          reject(err)
        }
        else {
          // Basic verification
          expect(svg).toBeDefined()
          expect(svg).toContain('<svg')
          expect(svg).toContain('<path')
          expect(svg).toContain('</svg>')

          resolve()
        }
      })
    })
  })
})
