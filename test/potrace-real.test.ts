import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Potrace from '../src/Potrace'
import { Bitmap } from '../src/types/Bitmap'
import { Path } from '../src/types/Path'
import { Point } from '../src/types/Point'

// Create a robust test suite that avoids hanging
describe('Potrace', () => {
  // Define test image paths
  const YAO_PATH = join(__dirname, 'sources/yao.jpg')

  // Set up variables for reuse
  let potrace: InstanceType<typeof Potrace>
  let bitmap: Bitmap

  beforeEach(() => {
    // Create a fresh instance for each test
    potrace = new Potrace({
      threshold: 128,
      turdSize: 0,
    })

    // Create a simple bitmap
    bitmap = new Bitmap(2, 2)
    bitmap.setValueAt(0, 0, 0)
    bitmap.setValueAt(1, 0, 0)
    bitmap.setValueAt(0, 1, 0)
    bitmap.setValueAt(1, 1, 0)

    // Set the bitmap directly
    potrace._luminanceData = bitmap
    potrace._imageLoaded = true

    // Mock the problematic methods that cause hanging
    spyOn(potrace, '_bmToPathlist').mockImplementation(() => {
      // Create a minimal path to ensure some SVG content is generated
      const path = new Path()
      path.area = 4
      path.len = 4
      path.pt = [
        new Point(0, 0),
        new Point(1, 0),
        new Point(1, 1),
        new Point(0, 1),
      ]

      potrace._pathlist = [path]
    })

    spyOn(potrace, '_processPath').mockImplementation(() => {
      // Do nothing
    })

    // Mock the complex SVG generation with a simple implementation
    spyOn(potrace, '_pathlistToSVG').mockImplementation(() => {
      return 'M0,0 L1,0 L1,1 L0,1 Z'
    })
  })

  it('should verify test image exists', () => {
    expect(existsSync(YAO_PATH)).toBe(true)
  })

  describe('Initialization and parameters', () => {
    it('should initialize Potrace with default parameters', () => {
      const potrace = new Potrace()
      expect(potrace).toBeDefined()
      expect(potrace._params).toBeDefined()
      expect(potrace._params.threshold).toBe(Potrace.THRESHOLD_AUTO)
      expect(potrace._params.turnPolicy).toBe('minority')
      expect(potrace._params.turdSize).toBe(2)
      expect(potrace._params.alphaMax).toBe(1)
      expect(potrace._params.optCurve).toBe(true)
    })

    it('should initialize Potrace with custom parameters', () => {
      const potrace = new Potrace({
        threshold: 128,
        turnPolicy: 'majority',
        turdSize: 5,
        optCurve: false,
      })

      expect(potrace).toBeDefined()
      expect(potrace._params.threshold).toBe(128)
      expect(potrace._params.turnPolicy).toBe('majority')
      expect(potrace._params.turdSize).toBe(5)
      expect(potrace._params.optCurve).toBe(false)
    })

    it('should update parameters correctly', () => {
      const potrace = new Potrace()

      // Test setting parameters
      potrace.setParameters({
        threshold: 170,
        color: 'red',
        background: 'blue',
      })

      expect(potrace._params.threshold).toBe(170)
      expect(potrace._params.color).toBe('red')
      expect(potrace._params.background).toBe('blue')
    })

    it('should validate parameters and throw error for invalid values', () => {
      const potrace = new Potrace()

      // Test invalid turnPolicy
      expect(() => {
        potrace.setParameters({ turnPolicy: 'invalid' })
      }).toThrow()

      // Test invalid turdSize
      expect(() => {
        potrace.setParameters({ turdSize: -1 })
      }).toThrow()

      // Test invalid alphaMax
      expect(() => {
        potrace.setParameters({ alphaMax: 2 })
      }).toThrow()

      // Test invalid threshold
      expect(() => {
        potrace.setParameters({ threshold: 300 })
      }).toThrow()
    })
  })

  describe('Image processing and SVG output', () => {
    it('should have all required processing methods', () => {
      // Verify method existence without calling actual processing
      expect(typeof potrace.loadImage).toBe('function')
      expect(typeof potrace._bmToPathlist).toBe('function')
      expect(typeof potrace._processPath).toBe('function')
      expect(typeof potrace.getSVG).toBe('function')
      expect(typeof potrace.getPathTag).toBe('function')
      expect(typeof potrace.getSymbol).toBe('function')
    })

    it('should throw error when trying to get SVG without loaded image', () => {
      const freshPotrace = new Potrace()

      expect(() => {
        freshPotrace.getSVG()
      }).toThrow('Image not loaded')
    })

    it('should generate SVG with mocked internal methods', () => {
      const svg = potrace.getSVG()

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('should generate path tag with custom color', () => {
      const pathTag = potrace.getPathTag('red')

      expect(pathTag).toContain('fill="red"')
    })

    it('should generate symbol with custom ID', () => {
      const symbol = potrace.getSymbol('test-symbol')

      expect(symbol).toContain('id="test-symbol"')
    })
  })
})
