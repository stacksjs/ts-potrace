import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Jimp } from 'jimp'
import { posterize, trace } from '../src/index'
import { Posterizer } from '../src/Posterizer'
import { Potrace } from '../src/Potrace'

describe('TypeScript Potrace', () => {
  test('Potrace class exists and has expected properties', () => {
    const potrace = new Potrace()
    expect(potrace).toBeDefined()
    expect(typeof potrace.loadImage).toBe('function')
    expect(typeof potrace.getSVG).toBe('function')
    expect(typeof potrace.getPathTag).toBe('function')
    expect(typeof potrace.getSymbol).toBe('function')
    expect(typeof potrace.setParameters).toBe('function')
  })

  test('Posterizer class exists and has expected properties', () => {
    const posterizer = new Posterizer()
    expect(posterizer).toBeDefined()
    expect(typeof posterizer.loadImage).toBe('function')
    expect(typeof posterizer.getSVG).toBe('function')
    expect(typeof posterizer.getSymbol).toBe('function')
    expect(typeof posterizer.setParameters).toBe('function')
  })

  test('API provides expected functions', () => {
    expect(typeof trace).toBe('function')
    expect(typeof posterize).toBe('function')
  })

  test('Source files are properly converted to TypeScript', async () => {
    // Check source directory for leftover JS files
    const sourceFiles = await fs.readdir(path.resolve(process.cwd(), 'src'))
    const jsFiles = sourceFiles.filter(file => file.endsWith('.js'))

    expect(jsFiles.length).toBe(0)

    // Check types directory for leftover JS files
    const typeFiles = await fs.readdir(path.resolve(process.cwd(), 'src/types'))
    const jsTypeFiles = typeFiles.filter(file => file.endsWith('.js'))

    expect(jsTypeFiles.length).toBe(0)
  })

  test('Potrace class contains all expected constants', () => {
    expect(Potrace.THRESHOLD_AUTO).toBeDefined()
    expect(Potrace.COLOR_AUTO).toBeDefined()
    expect(Potrace.COLOR_TRANSPARENT).toBeDefined()
    expect(Potrace.TURNPOLICY_BLACK).toBeDefined()
    expect(Potrace.TURNPOLICY_WHITE).toBeDefined()
    expect(Potrace.TURNPOLICY_LEFT).toBeDefined()
    expect(Potrace.TURNPOLICY_RIGHT).toBeDefined()
    expect(Potrace.TURNPOLICY_MINORITY).toBeDefined()
    expect(Potrace.TURNPOLICY_MAJORITY).toBeDefined()
  })

  test('Posterizer class contains all expected constants', () => {
    expect(Posterizer.RANGES_AUTO).toBeDefined()
    expect(Posterizer.RANGES_EQUAL).toBeDefined()
  })

  test('Can integrate with Jimp v1 API', async () => {
    // Create a small test image with Jimp using the new constructor
    const testImage = new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF })

    // Draw a simple shape - a black square in the middle
    for (let x = 25; x < 75; x++) {
      for (let y = 25; y < 75; y++) {
        testImage.setPixelColor(0x000000FF, x, y)
      }
    }

    // Test with Potrace
    const potrace = new Potrace({ threshold: 128 })
    await new Promise<void>((resolve, reject) => {
      potrace.loadImage(testImage, (err) => {
        if (err)
          reject(err)

        const svg = potrace.getSVG()
        expect(svg).toBeDefined()
        expect(svg).toContain('<svg')
        expect(svg).toContain('<path')
        resolve()
      })
    })

    // Test with Posterizer
    const posterizer = new Posterizer({ steps: 2 })
    await new Promise<void>((resolve, reject) => {
      posterizer.loadImage(testImage, (err) => {
        if (err)
          reject(err)

        const svg = posterizer.getSVG()
        expect(svg).toBeDefined()
        expect(svg).toContain('<svg')
        expect(svg).toContain('<path')
        resolve()
      })
    })
  })
})
