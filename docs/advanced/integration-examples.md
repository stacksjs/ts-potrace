# Integration Examples

ts-potrace can be integrated with various frameworks, libraries, and tools to create powerful image processing workflows. This guide provides examples of how to integrate ts-potrace with popular technologies.

## Web Applications

### React Integration

Using ts-potrace in a React application:

```tsx
import React, { useEffect, useState } from 'react'
import { trace } from 'ts-potrace'

// Component that converts an image to SVG
function ImageTracer({ imageUrl }) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Fetch the image first
    fetch(imageUrl)
      .then(response => response.arrayBuffer())
      .then((buffer) => {
        // Convert the fetched image to SVG using ts-potrace
        trace(Buffer.from(buffer), (err, svg) => {
          setIsLoading(false)
          if (err) {
            setError(err)
          }
          else if (svg) {
            setSvgContent(svg)
          }
        })
      })
      .catch((err) => {
        setIsLoading(false)
        setError(err)
      })
  }, [imageUrl])

  if (isLoading)
    return <div>Converting image...</div>
  if (error) {
    return (
      <div>
        Error:
        {error.message}
      </div>
    )
  }
  if (!svgContent)
    return <div>No SVG generated</div>

  // Render the SVG content
  return <div dangerouslySetInnerHTML={{ __html: svgContent }} />
}

// Usage
function App() {
  return (
    <div className="App">
      <h1>Image Tracer</h1>
      <ImageTracer imageUrl="/path/to/image.png" />
    </div>
  )
}

export default App
```

### Vue.js Integration

Using ts-potrace in a Vue.js application:

```vue
<script>
import { trace } from 'ts-potrace'

export default {
  name: 'ImageTracer',
  props: {
    imageUrl: String,
  },
  data() {
    return {
      svgContent: null,
      isLoading: true,
      error: null,
    }
  },
  mounted() {
    // Fetch the image and trace it
    fetch(this.imageUrl)
      .then(response => response.arrayBuffer())
      .then((buffer) => {
        trace(Buffer.from(buffer), (err, svg) => {
          this.isLoading = false
          if (err) {
            this.error = err
          }
          else {
            this.svgContent = svg
          }
        })
      })
      .catch((err) => {
        this.isLoading = false
        this.error = err
      })
  }
}
</script>

<template>
  <div>
    <div v-if="isLoading">
      Converting image...
    </div>
    <div v-else-if="error">
      Error: {{ error.message }}
    </div>
    <div v-else-if="svgContent" v-html="svgContent" />
    <div v-else>
      No SVG generated
    </div>
  </div>
</template>
```

## Server-Side Integration

### Express.js Integration

Creating an image conversion API with Express:

```ts
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import multer from 'multer'
import { posterize, Potrace } from 'ts-potrace'

const app = express()
const upload = multer({ dest: 'uploads/' })

// Simple tracing endpoint
app.post('/api/trace', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' })
  }

  const potrace = new Potrace({
    turdSize: Number(req.query.turdSize) || 2,
    alphaMax: Number(req.query.alphaMax) || 1,
    optCurve: req.query.optCurve !== 'false',
    optTolerance: Number(req.query.optTolerance) || 0.2,
    threshold: Number(req.query.threshold) || -1,
    blackOnWhite: req.query.blackOnWhite !== 'false',
    color: req.query.color || 'auto',
    background: req.query.background || 'transparent',
  })

  potrace.loadImage(req.file.path, (err) => {
    // Clean up the uploaded file
    fs.unlink(req.file!.path, () => {})

    if (err) {
      return res.status(500).json({ error: err.message })
    }

    const svg = potrace.getSVG()

    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svg)
  })
})

// Posterization endpoint
app.post('/api/posterize', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' })
  }

  const options = {
    steps: Number(req.query.steps) || 5,
    fillStrategy: req.query.fillStrategy || 'dominant',
    rangeDistribution: req.query.rangeDistribution || 'auto',
    background: req.query.background || 'transparent',
  }

  posterize(req.file.path, options, (err, svg) => {
    // Clean up the uploaded file
    fs.unlink(req.file!.path, () => {})

    if (err) {
      return res.status(500).json({ error: err.message })
    }

    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svg)
  })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

### Serverless Function Integration

Using ts-potrace in an AWS Lambda function:

```ts
import { Readable } from 'node:stream'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { trace } from 'ts-potrace'

const s3Client = new S3Client({ region: 'us-east-1' })

// Convert S3 object stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

export async function handler(event: any) {
  try {
    // Get the source bucket and key from the event
    const srcBucket = event.Records[0].s3.bucket.name
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))

    // Get the object from S3
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: srcBucket,
        Key: srcKey,
      })
    )

    if (!Body) {
      throw new Error('Failed to get object from S3')
    }

    // Convert stream to buffer
    const imageBuffer = await streamToBuffer(Body as Readable)

    // Trace the image
    return new Promise((resolve, reject) => {
      trace(imageBuffer, (err, svg) => {
        if (err) {
          return reject(err)
        }

        // Destination key - replace extension with .svg
        const dstKey = srcKey.replace(/\.[^/.]+$/, '.svg')

        // Upload the SVG to S3
        s3Client.send(
          new PutObjectCommand({
            Bucket: srcBucket,
            Key: dstKey,
            Body: svg,
            ContentType: 'image/svg+xml',
          })
        )
          .then(() => {
            resolve({
              statusCode: 200,
              body: JSON.stringify({
                message: 'Image converted successfully',
                source: srcKey,
                result: dstKey,
              }),
            })
          })
          .catch(reject)
      })
    })
  }
  catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing image',
        error: (error as Error).message,
      }),
    }
  }
}
```

## Desktop Applications

### Electron Integration

Using ts-potrace in an Electron application:

```ts
import fs from 'node:fs'
import path from 'node:path'
// In the main process (main.js)
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { trace } from 'ts-potrace'

// Create a function to handle image tracing
function traceImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    trace(filePath, {
      optCurve: true,
      turdSize: 2,
    }, (err, svg) => {
      if (err)
        reject(err)
      else if (svg)
        resolve(svg)
      else reject(new Error('Failed to generate SVG'))
    })
  })
}

// Handle IPC message from renderer
ipcMain.handle('trace-image', async (event, filePath) => {
  try {
    const svg = await traceImage(filePath)
    return { success: true, svg }
  }
  catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Handle save SVG request
ipcMain.handle('save-svg', async (event, svg) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save SVG File',
    defaultPath: 'traced-image.svg',
    filters: [{ name: 'SVG Files', extensions: ['svg'] }],
  })

  if (!canceled && filePath) {
    fs.writeFileSync(filePath, svg)
    return { success: true, filePath }
  }

  return { success: false }
})

// Rest of Electron app initialization...
```

```tsx
import { ipcRenderer } from 'electron'
// In the renderer process (renderer.tsx if using React)
import React, { useState } from 'react'

function ImageTracerApp() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file.path)
      setSvg(null)
      setError(null)
    }
  }

  const handleTrace = async () => {
    if (!selectedImage)
      return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await ipcRenderer.invoke('trace-image', selectedImage)
      if (result.success) {
        setSvg(result.svg)
      }
      else {
        setError(result.error)
      }
    }
    catch (err) {
      setError((err as Error).message)
    }
    finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!svg)
      return

    try {
      const result = await ipcRenderer.invoke('save-svg', svg)
      if (result.success) {
        alert(`SVG saved to: ${result.filePath}`)
      }
    }
    catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div>
      <h1>Electron Image Tracer</h1>

      <div>
        <input type="file" accept="image/*" onChange={handleFileSelect} />
        <button onClick={handleTrace} disabled={!selectedImage || isProcessing}>
          {isProcessing ? 'Processing...' : 'Trace Image'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {svg && (
        <div>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
          <button onClick={handleSave}>Save SVG</button>
        </div>
      )}
    </div>
  )
}

export default ImageTracerApp
```

## Build Tools Integration

### Webpack / Vite Plugin

A simple webpack loader for converting images to SVG at build time:

```ts
import loaderUtils from 'loader-utils'
// ts-potrace-loader.js
import { trace } from 'ts-potrace'

export default function loader(source) {
  const callback = this.async()
  const options = loaderUtils.getOptions(this) || {}

  trace(source, options, (err, svg) => {
    if (err) {
      callback(err)
    }
    else {
      // Return the SVG as a module
      callback(null, `export default ${JSON.stringify(svg)}`)
    }
  })
}

// Set the loader to handle binary files
export const raw = true
```

In your webpack config:

```js
// webpack.config.js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        oneOf: [
          {
            // For files with .svg.png extension, use the ts-potrace loader
            resourceQuery: /trace/,
            use: [
              {
                loader: 'ts-potrace-loader',
                options: {
                  turdSize: 2,
                  optCurve: true,
                }
              }
            ]
          },
          // For other images, use regular file-loader
          {
            loader: 'file-loader',
          }
        ]
      }
    ]
  }
}
```

Usage in your code:

```js
// Import a traced SVG version of the image
import tracedLogo from './logo.png?trace'

// Use the traced SVG
document.getElementById('logo-container').innerHTML = tracedLogo
```
