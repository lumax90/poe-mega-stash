const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { registerIpcHandlers } = require('./ipc-handlers')
const { setupUpdater } = require('./modules/updater')

let mainWindow = null

function firstExistingPath(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

function createWindow() {
  const preloadPath = firstExistingPath([
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '../preload/preload.js')
  ])

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#141414',
      symbolColor: '#999',
      height: 36
    },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const indexHtml = firstExistingPath([
      path.join(__dirname, '../renderer/index.html'),
      path.join(__dirname, '../dist/renderer/index.html')
    ])
    mainWindow.loadFile(indexHtml)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  await registerIpcHandlers(ipcMain)
  createWindow()
  setupUpdater(ipcMain, () => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
