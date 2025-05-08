import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Posterizer } from '../src/Posterizer'
import { Potrace } from '../src/Potrace'

describe('ts-potrace', () => {
  test('Potrace class exists and has expected properties', () => {
    const potrace = new Potrace()
    expect(potrace).toBeDefined()
    expect(typeof potrace.loadImage).toBe('function')
    expect(typeof potrace.getSVG).toBe('function')
  })

  test('Posterizer class exists and has expected properties', () => {
    const posterizer = new Posterizer()
    expect(posterizer).toBeDefined()
    expect(typeof posterizer.loadImage).toBe('function')
    expect(typeof posterizer.getSVG).toBe('function')
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
})
