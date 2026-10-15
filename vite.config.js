import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const ORT_DIST = dirname(require.resolve('onnxruntime-web/ort-wasm-simd-threaded.wasm'))

// Runtime WASM files fetched by onnxruntime-web. Served from /ort in dev and
// copied into dist/ort at build time. Not committed (kept out of git).
const ORT_FILES = [
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
]

const MIME = {
  wasm: 'application/wasm',
  mjs: 'text/javascript',
}

function ortWasm() {
  return {
    name: 'eyespy-ort-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.split('?')[0].match(/^\/ort\/([\w.-]+)$/)
        if (!match) return next()
        const file = join(ORT_DIST, match[1])
        if (!existsSync(file)) return next()
        res.setHeader('Content-Type', MIME[match[1].split('.').pop()] || 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      const out = join(process.cwd(), 'dist', 'ort')
      mkdirSync(out, { recursive: true })
      for (const file of ORT_FILES) {
        cpSync(join(ORT_DIST, file), join(out, file))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), ortWasm()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
})
