/**
 * Copies README.md → src/content/guide.md so the renderer can bundle it (?raw).
 * Run automatically via postinstall / predev / prebuild (see package.json).
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'README.md')
const destDir = resolve(root, 'src/content')
const dest = resolve(destDir, 'guide.md')

if (!existsSync(src)) {
  console.warn('[sync-guide] README.md missing at', src)
  process.exit(0)
}
mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[sync-guide] README.md → src/content/guide.md')
