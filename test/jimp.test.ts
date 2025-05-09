import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import path, { join } from 'node:path'
import { Jimp } from 'jimp'

describe('Jimp functionality', () => {
  const IMAGE_PATH = join(__dirname, 'sources/yao.jpg')

  it('should verify image exists', () => {
    console.log('IMAGE_PATH:', IMAGE_PATH)
    expect(existsSync(IMAGE_PATH)).toBe(true)
  })

  it('should load the image correctly', async () => {
    console.warn('Starting Jimp image load test')

    try {
      const image = await Jimp.read(IMAGE_PATH)
      console.warn('Image loaded successfully with dimensions:', image.bitmap.width, 'x', image.bitmap.height)

      expect(image).toBeDefined()
      expect(image.bitmap).toBeDefined()
      expect(image.bitmap.width).toBeGreaterThan(0)
      expect(image.bitmap.height).toBeGreaterThan(0)

      // Test basic operations that don't require proper TypeScript types
      const width = image.bitmap.width
      const height = image.bitmap.height
      console.warn('Image dimensions from bitmap:', width, 'x', height)

      // Use the bitmap directly for resizing test
      console.warn('Testing image manipulation...')

      // Check what methods are available on the image
      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(image))
        .filter(prop => typeof (image as any)[prop] === 'function')

      console.warn('Available methods:', methodNames.join(', '))

      // Try manual resizing by creating a new bitmap
      // This is just a diagnostic test, not the recommended way to resize
      const smallWidth = Math.floor(width / 2)
      const smallHeight = Math.floor(height / 2)

      // Success message
      console.warn('Image loaded and tested successfully')
    }
    catch (err) {
      console.error('Error during Jimp test:', err)
      throw err
    }
  })

  // This test is now enabled, but with proper timeout handling
  it('should resize the image correctly', async () => {
    console.warn('Starting resize test...')

    // Set up timeout handling
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const TIMEOUT = 3000 // 3 seconds

    try {
      // Race between the actual test and a timeout
      await Promise.race([
        // The actual test
        (async () => {
          const image = await Jimp.read(IMAGE_PATH)
          console.warn('Original size:', image.bitmap.width, 'x', image.bitmap.height)

          // Test resize with any-cast to bypass TypeScript
          console.warn('Attempting resize...')

          // Fix: need to use w/h instead of width/height based on error message
          const resizedImage = (image as any).resize({
            w: 100,
            h: 100,
          })

          console.warn('Resize complete, new size:', resizedImage.bitmap.width, 'x', resizedImage.bitmap.height)
          expect(resizedImage.bitmap.width).toBe(100)
          expect(resizedImage.bitmap.height).toBe(100)

          return 'success'
        })(),

        // The timeout
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            console.error('Test timed out after', TIMEOUT, 'ms')
            reject(new Error(`Test timed out after ${TIMEOUT}ms`))
          }, TIMEOUT)
        }),
      ])

      console.warn('Resize test completed successfully!')
    }
    catch (err) {
      console.error('Error during resize test:', err)
      throw err
    }
    finally {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, 5000) // Give the test 5 seconds at the Bun level
})
