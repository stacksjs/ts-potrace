import { describe, expect, it } from 'bun:test'
import Potrace from '../src/Potrace'
import { Bitmap } from '../src/types/Bitmap'

// Create an ultra minimal test suite for Potrace
describe('Potrace', () => {
  describe('Initialization', () => {
    it('should initialize with default parameters', () => {
      const potrace = new Potrace()
      expect(potrace).toBeDefined()
      expect(potrace._params.threshold).toBe(Potrace.THRESHOLD_AUTO)
      expect(potrace._params.turnPolicy).toBe('minority')
    })
  })

  describe('Direct bitmap processing', () => {
    it('should process a bitmap without using loadImage', () => {
      // Create a 3x3 bitmap with a simple pattern
      const bitmap = new Bitmap(3, 3)

      // Set pixels to form a cross pattern
      bitmap.setValueAt(0, 0, 255)
      bitmap.setValueAt(1, 0, 0)
      bitmap.setValueAt(2, 0, 255)
      bitmap.setValueAt(0, 1, 0)
      bitmap.setValueAt(1, 1, 0)
      bitmap.setValueAt(2, 1, 0)
      bitmap.setValueAt(0, 2, 255)
      bitmap.setValueAt(1, 2, 0)
      bitmap.setValueAt(2, 2, 255)

      // Create Potrace instance
      const potrace = new Potrace({
        threshold: 128,
        turdSize: 0, // Keep all specks
      })

      // Directly set the bitmap data
      potrace._luminanceData = bitmap
      potrace._imageLoaded = true

      // Generate SVG
      const svg = potrace.getSVG()

      // Basic validation
      expect(typeof svg).toBe('string')
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('should generate path tag with custom color', () => {
      // Create a 2x2 bitmap
      const bitmap = new Bitmap(2, 2)
      bitmap.setValueAt(0, 0, 0)
      bitmap.setValueAt(1, 0, 0)
      bitmap.setValueAt(0, 1, 0)
      bitmap.setValueAt(1, 1, 0)

      const potrace = new Potrace({
        threshold: 128,
        turdSize: 0,
      })

      // Directly set the bitmap
      potrace._luminanceData = bitmap
      potrace._imageLoaded = true

      // Get path tag with custom color
      const pathTag = potrace.getPathTag('#ff0000')

      expect(pathTag).toContain('fill="#ff0000"')
    })
  })
})
