/**
 * electron-vite only emits dist/main/main.js; ipc-handlers + modules stay as plain CJS.
 * Copy them next to main.js so production/packaged runs resolve ./ipc-handlers and ./modules/*.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))
const projRoot = path.join(root, '..')
const distMain = path.join(projRoot, 'dist/main')
const electronRoot = path.join(projRoot, 'electron')

const mainJs = path.join(distMain, 'main.js')
if (!fs.existsSync(mainJs)) {
  console.error('[copy-electron-main] Missing dist/main/main.js — run electron-vite build first.')
  process.exit(1)
}

fs.copyFileSync(path.join(electronRoot, 'ipc-handlers.js'), path.join(distMain, 'ipc-handlers.js'))
const modulesDst = path.join(distMain, 'modules')
fs.rmSync(modulesDst, { recursive: true, force: true })
fs.cpSync(path.join(electronRoot, 'modules'), modulesDst, { recursive: true })
console.log('[copy-electron-main] ipc-handlers.js + modules/ → dist/main/')
