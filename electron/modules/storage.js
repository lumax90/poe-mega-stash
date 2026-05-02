class StorageManager {
  constructor() {
    this.store = null
    this._initPromise = this._init()
  }

  async _init() {
    const { default: Store } = await import('electron-store')
    this.store = new Store({
      name: 'poe-item-finder',
      defaults: {
        settings: {
          clientId: '',
          clientSecret: '',
          contactEmail: '',
          league: 'Standard',
          theme: 'dark',
          poeSessId: '',
          accountName: ''
        },
        auth: {
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          accountName: null
        },
        data: {
          items: [],
          lastSync: null
        }
      }
    })
  }

  async ensureReady() {
    await this._initPromise
  }

  // Settings
  getSettings() { return this.store?.get('settings') || {} }
  saveSettings(settings) { this.store?.set('settings', { ...this.getSettings(), ...settings }) }

  // Auth
  getToken() { return this.store?.get('auth.accessToken') }
  saveToken(token) { this.store?.set('auth.accessToken', token) }
  getRefreshToken() { return this.store?.get('auth.refreshToken') }
  saveRefreshToken(token) { this.store?.set('auth.refreshToken', token) }
  getTokenExpiry() { return this.store?.get('auth.tokenExpiry') }
  saveTokenExpiry(ts) { this.store?.set('auth.tokenExpiry', ts) }
  getAccountName() { return this.store?.get('auth.accountName') }
  saveAccountName(name) { this.store?.set('auth.accountName', name) }

  clearAuth() {
    this.store?.set('auth', {
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      accountName: null
    })
  }

  // Items
  getItems() { return this.store?.get('data.items') || [] }
  saveItems(items) { this.store?.set('data.items', items) }
  clearItems() { this.store?.set('data.items', []) }

  // Sync
  getSyncTime() { return this.store?.get('data.lastSync') }
  saveSyncTime(ts) { this.store?.set('data.lastSync', ts) }
}

module.exports = { StorageManager }
