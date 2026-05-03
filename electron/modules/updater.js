const { app } = require('electron')

/** @type {{ phase: string, version?: string, percent?: number, message?: string }} */
let cached = { phase: 'idle' }

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
function setupUpdater(ipcMain, getMainWindow) {
  const broadcast = () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:push', { ...cached })
    }
  }

  ipcMain.handle('updater:getStatus', () => ({ ...cached }))

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'dev' }
    try {
      const { autoUpdater } = require('electron-updater')
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  })

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return { ok: false }
    try {
      const { autoUpdater } = require('electron-updater')
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) }
    }
  })

  if (!app.isPackaged) {
    cached = { phase: 'disabled' }
    return
  }

  let autoUpdater
  try {
    autoUpdater = require('electron-updater').autoUpdater
  } catch (e) {
    console.warn('[updater] load failed', e?.message || e)
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    cached = { phase: 'checking' }
    broadcast()
  })

  autoUpdater.on('update-available', (info) => {
    cached = { phase: 'downloading', version: info?.version, percent: 0 }
    broadcast()
  })

  autoUpdater.on('update-not-available', () => {
    cached = { phase: 'idle' }
    broadcast()
  })

  autoUpdater.on('download-progress', (p) => {
    cached = {
      phase: 'downloading',
      version: cached.version,
      percent: Math.round(p.percent ?? 0)
    }
    broadcast()
  })

  autoUpdater.on('update-downloaded', (info) => {
    cached = { phase: 'ready', version: info?.version }
    broadcast()
  })

  autoUpdater.on('error', (err) => {
    cached = { phase: 'error', message: err?.message || String(err) }
    broadcast()
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      cached = { phase: 'error', message: err?.message || String(err) }
      broadcast()
    })
  }, 600)
}

module.exports = { setupUpdater }
