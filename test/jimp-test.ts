// Testing Jimp API
import { Jimp } from 'jimp'

async function test() {
  try {
    // Create image from scratch using Jimp.read
    console.warn('Creating test image...')
    const img = await Jimp.read(Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAnElEQVR42u3RAQ0AAAgDoL/1'
      + '1waBoJvUQUdIQIAYECAGBIgBAWJAgAAxIEAMCBADAgSIAQFiQIAYECAGBAgQAwLEgAAxIEAM'
      + 'CBADAgSIAQFiQIAYECAGBAgQAwLEgAAxIEAMCBADAgSIAQFiQIAYECAGBAgQAwLEgAAxIEAM'
      + 'CBADAsSAADEgQAwIECAGBIgBAWJAgBgQIAYECBAgBgSIAQFiQIC8HhZdw1wCHYhlAAAAAElF'
      + 'TkSuQmCC',
      'base64',
    ))

    console.warn(`Original image dimensions: ${img.bitmap.width}x${img.bitmap.height}`)

    // Test resize method
    img.resize(50, 50)
    console.warn(`After resize: ${img.bitmap.width}x${img.bitmap.height}`)

    // Create a solid color image
    const blackImage = await Jimp.read(100, 100)
    blackImage.bitmap.data.fill(0) // Make it black
    console.warn(`Black image size: ${blackImage.bitmap.width}x${blackImage.bitmap.height}`)

    // Test setting pixel colors
    for (let x = 25; x < 75; x++) {
      for (let y = 25; y < 75; y++) {
        blackImage.setPixelColor(0xFFFFFFFF, x, y) // Set white pixels
      }
    }

    // Check available methods for reference
    console.warn('Available Jimp methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(img))
      .filter(m => typeof img[m] === 'function')
      .join(', '))
  }
  catch (err) {
    console.error('Error:', err)
  }
}

test()
