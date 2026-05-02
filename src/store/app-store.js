import { create } from 'zustand'
import Fuse from 'fuse.js'

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 1.0 },
    { name: 'baseType', weight: 0.9 },
    { name: 'typeLine', weight: 0.7 },
    { name: 'rarity', weight: 0.4 },
    { name: 'searchText', weight: 0.5 }
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2
}

export const useAppStore = create((set, get) => ({
  // Auth
  isLoggedIn: false,
  accountName: null,

  // Data
  items: [],
  lastSync: null,

  // Search
  searchQuery: '',
  filteredItems: [],
  fuseIndex: null,

  // Filters
  filters: {
    rarity: [],
    locationTypes: [],    // 'stash' | 'character'
    itemClasses: []
  },

  // UI
  currentView: 'items',    // 'items' | 'settings'
  viewMode: 'grid',        // 'grid' | 'list'
  isSyncing: false,
  syncProgress: null,
  tooltipItem: null,
  tooltipPos: null,

  // Settings
  settings: {
    clientId: '',
    clientSecret: '',
    contactEmail: '',
    league: 'Standard'
  },

  // ── Actions ──

  setAuth: (loggedIn, accountName) => set({ isLoggedIn: loggedIn, accountName }),

  setItems: (items) => {
    const fuse = new Fuse(items, FUSE_OPTIONS)
    set({ items, fuseIndex: fuse })
    get().applyFilters()
  },

  setLastSync: (ts) => set({ lastSync: ts }),

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().applyFilters()
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }))
    get().applyFilters()
  },

  toggleRarityFilter: (rarity) => {
    const current = get().filters.rarity
    const next = current.includes(rarity)
      ? current.filter(r => r !== rarity)
      : [...current, rarity]
    get().setFilter('rarity', next)
  },

  toggleLocationFilter: (type) => {
    const current = get().filters.locationTypes
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    get().setFilter('locationTypes', next)
  },

  applyFilters: () => {
    const { items, searchQuery, filters, fuseIndex } = get()

    let result = items

    // Text search
    if (searchQuery.trim() && fuseIndex) {
      result = fuseIndex.search(searchQuery.trim()).map(r => r.item)
    }

    // Rarity filter
    if (filters.rarity.length > 0) {
      result = result.filter(item => filters.rarity.includes(item.rarity))
    }

    // Location type filter
    if (filters.locationTypes.length > 0) {
      result = result.filter(item =>
        item.location && filters.locationTypes.includes(item.location.type)
      )
    }

    set({ filteredItems: result })
  },

  setCurrentView: (view) => set({ currentView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),

  setTooltip: (item, pos) => set({ tooltipItem: item, tooltipPos: pos }),
  clearTooltip: () => set({ tooltipItem: null, tooltipPos: null }),

  setSettings: (settings) => set(state => ({
    settings: { ...state.settings, ...settings }
  })),

  // Load saved data from electron-store on startup
  loadSavedData: async () => {
    try {
      const settings = await window.poeApi.getSettings()
      const authStatus = await window.poeApi.getAuthStatus()
      const savedData = await window.poeApi.getSavedData()

      set({
        settings: { ...get().settings, ...settings },
        isLoggedIn: authStatus.loggedIn,
        accountName: authStatus.accountName,
        lastSync: savedData.lastSync
      })

      if (savedData.items && savedData.items.length > 0) {
        get().setItems(savedData.items)
      }
    } catch (err) {
      console.error('Failed to load saved data:', err)
    }
  }
}))
