import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(import.meta.dirname, 'electron/main.js')
      },
      rollupOptions: {
        external: ['electron', 'electron-store']
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(import.meta.dirname, 'electron/preload.js')
      },
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    root: './src',
    build: {
      outDir: resolve(import.meta.dirname, 'dist/renderer'),
      rollupOptions: {
        input: resolve(import.meta.dirname, 'src/index.html')
      }
    },
    plugins: [react()]
  }
})
