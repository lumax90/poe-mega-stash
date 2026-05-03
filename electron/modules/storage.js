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
        itemValueOverrides: {},
        auth: {
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          accountName: null
        },
        data: {
          items: [],
          lastSync: null
        },
        wealth: {
          lastEstimate: null,
          history: []
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

  getWealth() {
    return this.store?.get('wealth') || { lastEstimate: null, history: [] }
  }

  /** Snapshot shape from ninja-pricing. Dedupe: replace last entry if same league within 5 min. */
  recordWealthSnapshot(snapshot) {
    const prev = this.getWealth()
    const hist = Array.isArray(prev.history) ? [...prev.history] : []
    const last = hist[hist.length - 1]
    if (
      last &&
      last.league === snapshot.league &&
      snapshot.ts - last.ts < 5 * 60 * 1000
    ) {
      hist[hist.length - 1] = snapshot
    } else {
      hist.push(snapshot)
    }
    const capped = hist.length > 400 ? hist.slice(-400) : hist
    this.store?.set('wealth', {
      lastEstimate: snapshot,
      history: capped
    })
  }

  clearWealthHistory() {
    this.store?.set('wealth', {
      lastEstimate: null,
      history: []
    })
  }

  /** Per-item manual Divine valuation for whole stack (persists across ninja refresh). */
  getItemValueOverrides() {
    return this.store?.get('itemValueOverrides') || {}
  }

  setItemValueOverride(itemId, divineTotal) {
    const id = String(itemId)
    const all = { ...this.getItemValueOverrides() }
    if (divineTotal == null || divineTotal === '' || Number.isNaN(Number(divineTotal))) {
      delete all[id]
    } else {
      const n = Number(divineTotal)
      if (!Number.isFinite(n) || n < 0) delete all[id]
      else all[id] = { divineTotal: Math.round(n * 10000) / 10000, updatedAt: Date.now() }
    }
    this.store?.set('itemValueOverrides', all)
    return all
  }

  removeItemValueOverride(itemId) {
    const id = String(itemId)
    const all = { ...this.getItemValueOverrides() }
    delete all[id]
    this.store?.set('itemValueOverrides', all)
    return all
  }
}

module.exports = { StorageManager }
