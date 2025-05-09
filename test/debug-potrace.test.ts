import { describe, expect, it, spyOn } from 'bun:test'
import Potrace from '../src/Potrace'
import { Bitmap } from '../src/types/Bitmap'

// Create a debug test suite to diagnose hanging
describe('Debug Potrace', () => {
  it('should create potrace instance', () => {
    const potrace = new Potrace()
    expect(potrace).toBeDefined()
  })

  // Test each component independently
  describe('Bitmap', () => {
    it('should create and manipulate bitmap', () => {
      const bitmap = new Bitmap(2, 2)
      bitmap.setValueAt(0, 0, 100)
      bitmap.setValueAt(1, 0, 200)
      bitmap.setValueAt(0, 1, 150)
      bitmap.setValueAt(1, 1, 50)

      expect(bitmap.getValueAt(0, 0)).toBe(100)
      expect(bitmap.getValueAt(1, 0)).toBe(200)
      expect(bitmap.getValueAt(0, 1)).toBe(150)
      expect(bitmap.getValueAt(1, 1)).toBe(50)
    })
  })

  // Test _bmToPathlist in isolation
  describe('_bmToPathlist', () => {
    it('should be called when generating SVG', () => {
      const potrace = new Potrace()
      const spy = spyOn(potrace, '_bmToPathlist')

      // Setup direct bitmap
      const bitmap = new Bitmap(2, 2)
      bitmap.setValueAt(0, 0, 0) // All black
      bitmap.setValueAt(1, 0, 0)
      bitmap.setValueAt(0, 1, 0)
      bitmap.setValueAt(1, 1, 0)

      potrace._luminanceData = bitmap
      potrace._imageLoaded = true

      try {
        console.warn('About to call getSVG...')
        potrace.getSVG()
        console.warn('getSVG completed')
      }
      catch (e) {
        console.error('Error in getSVG:', e)
      }

      expect(spy).toHaveBeenCalled()
    })
  })

  // Test minimal SVG generation with extreme simplification
  describe('Simplified SVG generation', () => {
    it('should generate SVG with all functionality mocked', () => {
      const potrace = new Potrace()

      // Mock internal functions that might be causing problems
      spyOn(potrace, '_bmToPathlist').mockImplementation(() => {
        potrace._pathlist = []
      })

      spyOn(potrace, '_processPath').mockImplementation(() => {
        // Do nothing
      })

      // Setup direct bitmap
      const bitmap = new Bitmap(2, 2)
      bitmap.setValueAt(0, 0, 0)
      bitmap.setValueAt(1, 0, 0)
      bitmap.setValueAt(0, 1, 0)
      bitmap.setValueAt(1, 1, 0)

      potrace._luminanceData = bitmap
      potrace._imageLoaded = true

      // This should now work since we've mocked the problematic functions
      const svg = potrace.getSVG()

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })
  })
})
