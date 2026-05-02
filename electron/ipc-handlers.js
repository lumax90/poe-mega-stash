const { OAuthManager } = require('./modules/oauth')
const { ApiClient } = require('./modules/api-client')
const { ItemParser } = require('./modules/item-parser')
const { StorageManager } = require('./modules/storage')

async function registerIpcHandlers(ipcMain) {
  const storage = new StorageManager()
  await storage.ensureReady()
  const oauth = new OAuthManager(storage)
  const api = new ApiClient(oauth, storage)
  const parser = new ItemParser()

  // ── OAuth ──
  ipcMain.handle('oauth:start', async () => {
    return await oauth.startAuthFlow()
  })

  ipcMain.handle('oauth:status', async () => {
    return oauth.getStatus()
  })

  ipcMain.handle('oauth:logout', async () => {
    oauth.logout()
    storage.clearItems()
    return { success: true }
  })

  // ── Stash ──
  ipcMain.handle('stash:list', async (_event, league) => {
    return await api.getStashList(league)
  })

  ipcMain.handle('stash:tab', async (_event, league, tabId) => {
    return await api.getStashTab(league, tabId)
  })

  // ── Characters ──
  ipcMain.handle('characters:list', async () => {
    return await api.getCharacters()
  })

  ipcMain.handle('characters:items', async (_event, name) => {
    return await api.getCharacterItems(name)
  })

  // ── Full Sync ──
  ipcMain.handle('sync:all', async (event, league) => {
    const sendProgress = (data) => {
      event.sender.send('sync:progress', data)
    }

    try {
      sendProgress({ stage: 'stash-list', message: 'Fetching stash tab list...' })
      const tabs = await api.getStashList(league)
      const allItems = []

      const settings = storage.getSettings()

      // Fetch each stash tab
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i]
        sendProgress({
          stage: 'stash-tab',
          message: `Fetching tab: ${tab.name || tab.n || tab.id}`,
          current: i + 1,
          total: tabs.length
        })

        try {
          const tabIdentifier = settings.poeSessId ? (tab.i !== undefined ? tab.i : i) : tab.id
          const tabData = await api.getStashTab(league, tabIdentifier)
          if (tabData && tabData.items) {
            const parsed = tabData.items.map(item =>
              parser.parseStashItem(item, tab)
            )
            allItems.push(...parsed)
          }
          // Children tabs (folders)
          if (tab.children) {
            for (const child of tab.children) {
              try {
                const childIdentifier = settings.poeSessId ? child.i : child.id
                const childData = await api.getStashTab(league, childIdentifier)
                if (childData && childData.items) {
                  const parsed = childData.items.map(item =>
                    parser.parseStashItem(item, child)
                  )
                  allItems.push(...parsed)
                }
              } catch (err) {
                console.error(`Failed to fetch child tab ${child.id}:`, err.message)
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch tab ${tab.id}:`, err.message)
        }
      }

      // Fetch characters
      sendProgress({ stage: 'characters', message: 'Fetching characters...' })
      const characters = await api.getCharacters()

      for (let i = 0; i < characters.length; i++) {
        const char = characters[i]
        sendProgress({
          stage: 'character-items',
          message: `Fetching items: ${char.name}`,
          current: i + 1,
          total: characters.length
        })

        try {
          const charData = await api.getCharacterItems(char.name)
          if (charData) {
            const parsed = parser.parseCharacterItems(charData, char)
            allItems.push(...parsed)
          }
        } catch (err) {
          console.error(`Failed to fetch character ${char.name}:`, err.message)
        }
      }

      // Save to storage
      storage.saveItems(allItems)
      storage.saveSyncTime(Date.now())

      sendProgress({
        stage: 'done',
        message: `Sync complete! ${allItems.length} items loaded.`,
        totalItems: allItems.length
      })

      return { success: true, itemCount: allItems.length, items: allItems }
    } catch (err) {
      sendProgress({ stage: 'error', message: err.message })
      return { success: false, error: err.message }
    }
  })

  // ── Storage ──
  ipcMain.handle('storage:get', () => {
    return {
      items: storage.getItems(),
      lastSync: storage.getSyncTime()
    }
  })

  ipcMain.handle('settings:get', () => {
    return storage.getSettings()
  })

  ipcMain.handle('settings:save', (_event, settings) => {
    storage.saveSettings(settings)
    return { success: true }
  })
}

module.exports = { registerIpcHandlers }
