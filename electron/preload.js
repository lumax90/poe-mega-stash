const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('poeApi', {
  // OAuth
  startOAuth: () => ipcRenderer.invoke('oauth:start'),
  getAuthStatus: () => ipcRenderer.invoke('oauth:status'),
  logout: () => ipcRenderer.invoke('oauth:logout'),

  // Stash
  fetchStashList: (league) => ipcRenderer.invoke('stash:list', league),
  fetchStashTab: (league, tabId) => ipcRenderer.invoke('stash:tab', league, tabId),

  // Characters
  fetchCharacters: () => ipcRenderer.invoke('characters:list'),
  fetchCharacterItems: (name) => ipcRenderer.invoke('characters:items', name),

  // Sync
  syncAll: (league) => ipcRenderer.invoke('sync:all', league),
  onSyncProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },

  // Leagues (official trade data API — PC realm)
  fetchLeagues: () => ipcRenderer.invoke('leagues:list'),

  getWealth: () => ipcRenderer.invoke('wealth:get'),
  refreshWealth: () => ipcRenderer.invoke('wealth:refresh'),
  clearWealthHistory: () => ipcRenderer.invoke('wealth:clearHistory'),

  estimateOneValuation: (item) => ipcRenderer.invoke('valuation:estimate-one', item),
  getItemValueOverrides: () => ipcRenderer.invoke('item-value:get-all'),
  setItemValue: (payload) => ipcRenderer.invoke('item-value:set', payload),
  removeItemValue: (itemId) => ipcRenderer.invoke('item-value:remove', itemId),
  openTradeSearch: (payload) => ipcRenderer.invoke('trade:open-search', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Storage
  getSavedData: () => ipcRenderer.invoke('storage:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings)
})
