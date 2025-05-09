import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as lib from '../src'
import Potrace from '../src/Potrace'

describe('Potrace Library', () => {
  it('should export Potrace class', () => {
    expect(lib.Potrace).toBeDefined()
  })

  it('should export Posterizer class', () => {
    expect(lib.Posterizer).toBeDefined()
  })

  it('should export trace function', () => {
    expect(lib.trace).toBeDefined()
    expect(typeof lib.trace).toBe('function')
  })

  it('should export posterize function', () => {
    expect(lib.posterize).toBeDefined()
    expect(typeof lib.posterize).toBe('function')
  })

  it('should create a Potrace instance', () => {
    const instance = new Potrace()
    expect(instance).toBeInstanceOf(Potrace)
  })

  it('should create a Potrace instance with options', () => {
    const instance = new Potrace({
      turdSize: 5,
      threshold: 200,
      color: '#ff0000',
    })
    expect(instance).toBeInstanceOf(Potrace)
  })

  it('should store parameters correctly', () => {
    const instance = new Potrace({ color: '#000000' })

    // Set parameters should work
    instance.setParameters({ color: '#ff0000' })

    // Check the parameters were stored (without calling getSVG which requires an image)
    // @ts-expect-error Accessing private property for testing
    expect(instance._params.color).toBe('#ff0000')
  })
})
