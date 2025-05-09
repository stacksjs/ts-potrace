import { describe, expect, it } from 'bun:test'
import Potrace from '../src/Potrace'

// Create a simple test that doesn't require real image processing
describe('Potrace Minimal Test', () => {
  it('should create a Potrace instance', () => {
    const potrace = new Potrace()
    expect(potrace).toBeDefined()
  })

  it('should create instance with custom parameters', () => {
    const potrace = new Potrace({
      turdSize: 5,
      optTolerance: 0.5,
      color: '#ff0000',
      background: '#ffffff',
    })

    // @ts-ignore: Accessing private property for testing
    expect(potrace._params.color).toBe('#ff0000')
    // @ts-ignore: Accessing private property for testing
    expect(potrace._params.background).toBe('#ffffff')
  })

  it('should update parameters via setParameters', () => {
    const potrace = new Potrace()

    potrace.setParameters({
      color: '#00ff00',
      background: '#000000',
    })

    // @ts-ignore: Accessing private property for testing
    expect(potrace._params.color).toBe('#00ff00')
    // @ts-ignore: Accessing private property for testing
    expect(potrace._params.background).toBe('#000000')
  })
})
