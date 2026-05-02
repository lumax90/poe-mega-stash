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

  // Storage
  getSavedData: () => ipcRenderer.invoke('storage:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings)
})
