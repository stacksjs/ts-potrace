import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Potrace from '../src/Potrace'

// Create a diagnostic test suite to figure out what's happening
describe('Potrace', () => {
  const YAO_PATH = join(__dirname, 'sources/yao.jpg')

  // Basic verification
  it('should verify test image exists', () => {
    expect(existsSync(YAO_PATH)).toBe(true)
  })

  // Create and configure a Potrace instance
  it('should create a Potrace instance', () => {
    const potrace = new Potrace()
    expect(potrace).toBeDefined()
    expect(potrace._params).toBeDefined()
  })

  // Test parameter setting
  it('should set custom parameters', () => {
    const potrace = new Potrace()
    potrace.setParameters({ threshold: 170 })
    expect(potrace._params.threshold).toBe(170)
  })

  // Test parameter updating
  it('should update parameters', () => {
    const potrace = new Potrace({ threshold: 100 })
    expect(potrace._params.threshold).toBe(100)
    potrace.setParameters({ threshold: 200 })
    expect(potrace._params.threshold).toBe(200)
  })
})
