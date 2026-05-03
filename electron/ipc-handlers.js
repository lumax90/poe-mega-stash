const { shell, app } = require('electron')
const { OAuthManager } = require('./modules/oauth')
const { ApiClient } = require('./modules/api-client')
const { ItemParser } = require('./modules/item-parser')
const { StorageManager } = require('./modules/storage')
const { NinjaPricing } = require('./modules/ninja-pricing')
const { createTradeSearchUrl } = require('./modules/trade-search')

async function registerIpcHandlers(ipcMain) {
  const storage = new StorageManager()
  await storage.ensureReady()
  const oauth = new OAuthManager(storage)
  const api = new ApiClient(oauth, storage)
  const parser = new ItemParser()
  const ninjaPricing = new NinjaPricing()

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
      let syncOrder = 0
      const appendParsed = (parsed) => {
        if (!parsed?.length) return
        for (const item of parsed) {
          item._syncOrder = syncOrder++
          allItems.push(item)
        }
      }

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
            appendParsed(parsed)
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
                  appendParsed(parsed)
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
            appendParsed(parsed)
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

      let wealth = null
      try {
        const overrides = storage.getItemValueOverrides()
        wealth = await ninjaPricing.estimateStash(allItems, league, overrides)
        const slim = {
          ...wealth,
          topItems: (wealth.topItems || []).slice(0, 12),
          pricedLines: (wealth.pricedLines || []).slice(0, 320),
          trigger: 'sync'
        }
        storage.recordWealthSnapshot(slim)
      } catch (wErr) {
        console.error('Wealth estimate after sync:', wErr.message)
      }

      return { success: true, itemCount: allItems.length, items: allItems, wealth }
    } catch (err) {
      sendProgress({ stage: 'error', message: err.message })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('wealth:get', () => storage.getWealth())

  ipcMain.handle('wealth:refresh', async () => {
    const items = storage.getItems()
    const league = storage.getSettings().league || 'Standard'
    try {
      const overrides = storage.getItemValueOverrides()
      const estimate = await ninjaPricing.estimateStash(items, league, overrides)
      const slim = {
        ...estimate,
        topItems: (estimate.topItems || []).slice(0, 12),
        pricedLines: (estimate.pricedLines || []).slice(0, 320),
        trigger: 'manual'
      }
      storage.recordWealthSnapshot(slim)
      return { ok: true, estimate }
    } catch (err) {
      console.error('wealth:refresh', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('wealth:clearHistory', async () => {
    storage.clearWealthHistory()
    return { ok: true }
  })

  ipcMain.handle('valuation:estimate-one', async (_event, item) => {
    const league = storage.getSettings().league || 'Standard'
    const overrides = storage.getItemValueOverrides()
    try {
      const v = await ninjaPricing.estimateOneItem(item, league, overrides)
      return { ok: true, ...v }
    } catch (err) {
      console.error('valuation:estimate-one', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('item-value:get-all', () => storage.getItemValueOverrides())

  ipcMain.handle('item-value:set', (_event, { itemId, divineTotal }) => {
    const overrides = storage.setItemValueOverride(itemId, divineTotal)
    return { ok: true, overrides }
  })

  ipcMain.handle('item-value:remove', (_event, itemId) => {
    const overrides = storage.removeItemValueOverride(itemId)
    return { ok: true, overrides }
  })

  ipcMain.handle('shell:open-external', async (_event, url) => {
    const s = String(url || '').trim()
    if (!/^https?:\/\//i.test(s)) {
      return { ok: false, error: 'Only http(s) URLs are allowed' }
    }
    try {
      await shell.openExternal(s)
      return { ok: true }
    } catch (err) {
      console.error('shell:open-external', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('trade:open-search', async (_event, payload) => {
    const item = payload?.item
    if (!item) return { ok: false, error: 'No item' }
    const settings = storage.getSettings()
    const league = payload?.league || settings.league || 'Standard'
    const tradeOffsetPct =
      payload?.tradeOffsetPct ?? payload?.tolerancePct ?? 10
    try {
      const url = await createTradeSearchUrl(league, item, tradeOffsetPct, {
        statsCacheDir: app.getPath('userData')
      })
      await shell.openExternal(url)
      return { ok: true, url }
    } catch (err) {
      console.error('trade:open-search', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('leagues:list', async () => {
    try {
      const leagues = await api.getLeaguesTradePc()
      return { ok: true, leagues }
    } catch (err) {
      console.error('leagues:list', err)
      return { ok: false, error: err.message, leagues: [] }
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
