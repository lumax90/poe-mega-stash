import { create } from 'zustand'
import Fuse from 'fuse.js'
import { sortItemsList } from '../lib/item-sort-stats'

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 1.0 },
    { name: 'baseType', weight: 0.9 },
    { name: 'typeLine', weight: 0.7 },
    { name: 'rarity', weight: 0.4 },
    { name: 'searchText', weight: 0.7 },
    { name: 'location.tabName', weight: 0.8 },
    { name: 'location.characterName', weight: 0.8 },
    { name: 'location.characterClass', weight: 0.5 },
    { name: 'location.slot', weight: 0.6 },
    { name: 'location.tabType', weight: 0.5 }
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2
}

function getItemQuality(item) {
  const qualityProp = item.properties?.find(prop => prop.name?.toLowerCase() === 'quality')
  const qualityText = qualityProp?.values?.[0]?.[0] || ''
  return parseInt(String(qualityText).replace(/[^0-9-]/g, ''), 10) || 0
}

function getItemCategory(item) {
  const text = [item.name, item.baseType, item.typeLine, item.searchText].join(' ').toLowerCase()
  const properties = (item.properties || []).map(prop => prop.name?.toLowerCase()).join(' ')

  if (item.rarity === 'gem' || properties.includes('level') && text.includes('support')) return 'gem'
  if (item.rarity === 'currency') return 'currency'
  if (item.rarity === 'divination') return 'card'
  if (text.includes('map') && !text.includes('map fragment')) return 'map'
  if (text.includes('jewel')) return 'jewel'
  if (text.includes('flask')) return 'flask'
  if (text.includes('ring') || text.includes('amulet') || text.includes('belt')) return 'accessory'
  if (text.includes('sword') || text.includes('axe') || text.includes('mace') || text.includes('bow') || text.includes('wand') || text.includes('staff') || text.includes('dagger') || text.includes('claw') || text.includes('sceptre') || text.includes('quiver')) return 'weapon'
  if (text.includes('helmet') || text.includes('gloves') || text.includes('boots') || text.includes('armour') || text.includes('shield')) return 'armour'
  if (text.includes('fragment') || text.includes('scarab') || text.includes('splinter') || text.includes('offering') || text.includes('invitation')) return 'fragment'

  return 'other'
}

function enrichItemSearchText(item) {
  const location = item.location || {}
  const category = item.category || getItemCategory(item)
  const quality = item.quality ?? getItemQuality(item)
  const parts = [
    item.searchText,
    item.name,
    item.baseType,
    item.typeLine,
    item.rarity,
    category,
    quality > 0 ? `quality ${quality}` : '',
    location.type,
    location.tabName,
    location.tabType,
    location.characterName,
    location.characterClass,
    location.slot,
    item.corrupted ? 'corrupted' : '',
    item.identified ? 'identified' : 'unidentified',
    item.sockets?.colors,
    item.sockets?.total > 0 ? `${item.sockets.total} sockets` : '',
    item.sockets?.maxLink > 0 ? `${item.sockets.maxLink}-link` : '',
    item.sockets?.maxLink > 0 ? `${item.sockets.maxLink} link` : '',
    item.itemLevel > 0 ? `ilvl ${item.itemLevel}` : '',
    item.stackSize ? `stack ${item.stackSize}` : ''
  ]

  return {
    ...item,
    category,
    quality,
    searchText: parts.filter(Boolean).join(' ').toLowerCase()
  }
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
    itemClasses: [],
    categories: [],
    corrupted: 'any',     // 'any' | 'yes' | 'no'
    identified: 'any',    // 'any' | 'yes' | 'no'
    minItemLevel: '',
    maxItemLevel: '',
    minLinks: '',
    minSockets: '',
    minQuality: '',
    modText: '',
    locationText: ''
  },

  // UI
  currentView: 'items',    // 'items' | 'guide' | 'buymeacoffee' | 'settings' | 'duplicates' | 'wealth'
  viewMode: 'grid',        // 'grid' | 'list'
  isSyncing: false,
  syncProgress: null,
  tooltipItem: null,
  tooltipPos: null,
  selectedItem: null,
  isItemDetailOpen: false,
  isAdvancedFiltersOpen: false,

  /** Sort: stash = API sync order; stats parsed from English mod text + properties */
  sortKey: 'stash',
  sortDescending: false,

  /** Latest stash valuation (poe.ninja); rare/magic excluded */
  wealthSummary: null,

  /** Per-item manual Divine overrides (whole stack), keyed by item id */
  itemValueOverrides: {},

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
    const enrichedItems = items.map(enrichItemSearchText)
    const fuse = new Fuse(enrichedItems, FUSE_OPTIONS)
    set({ items: enrichedItems, fuseIndex: fuse })
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

  toggleCategoryFilter: (category) => {
    const current = get().filters.categories
    const next = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category]
    get().setFilter('categories', next)
  },

  clearAdvancedFilters: () => {
    set(state => ({
      filters: {
        ...state.filters,
        categories: [],
        corrupted: 'any',
        identified: 'any',
        minItemLevel: '',
        maxItemLevel: '',
        minLinks: '',
        minSockets: '',
        minQuality: '',
        modText: '',
        locationText: ''
      }
    }))
    get().applyFilters()
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

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter(item => filters.categories.includes(item.category))
    }

    // State filters
    if (filters.corrupted !== 'any') {
      result = result.filter(item => filters.corrupted === 'yes' ? !!item.corrupted : !item.corrupted)
    }

    if (filters.identified !== 'any') {
      result = result.filter(item => filters.identified === 'yes' ? item.identified !== false : item.identified === false)
    }

    const minItemLevel = parseInt(filters.minItemLevel, 10)
    if (!Number.isNaN(minItemLevel)) {
      result = result.filter(item => (item.itemLevel || 0) >= minItemLevel)
    }

    const maxItemLevel = parseInt(filters.maxItemLevel, 10)
    if (!Number.isNaN(maxItemLevel)) {
      result = result.filter(item => (item.itemLevel || 0) <= maxItemLevel)
    }

    const minLinks = parseInt(filters.minLinks, 10)
    if (!Number.isNaN(minLinks)) {
      result = result.filter(item => (item.sockets?.maxLink || 0) >= minLinks)
    }

    const minSockets = parseInt(filters.minSockets, 10)
    if (!Number.isNaN(minSockets)) {
      result = result.filter(item => (item.sockets?.total || 0) >= minSockets)
    }

    const minQuality = parseInt(filters.minQuality, 10)
    if (!Number.isNaN(minQuality)) {
      result = result.filter(item => (item.quality || 0) >= minQuality)
    }

    const modText = filters.modText.trim().toLowerCase()
    if (modText) {
      result = result.filter(item => [
        ...(item.mods?.implicit || []),
        ...(item.mods?.explicit || []),
        ...(item.mods?.crafted || []),
        ...(item.mods?.enchant || []),
        ...(item.mods?.fractured || []),
        ...(item.mods?.utility || [])
      ].join(' ').toLowerCase().includes(modText))
    }

    const locationText = filters.locationText.trim().toLowerCase()
    if (locationText) {
      result = result.filter(item => [
        item.location?.type,
        item.location?.tabName,
        item.location?.tabType,
        item.location?.characterName,
        item.location?.characterClass,
        item.location?.slot
      ].filter(Boolean).join(' ').toLowerCase().includes(locationText))
    }

    const { sortKey, sortDescending } = get()
    const sorted = sortItemsList(result, sortKey, sortDescending)

    set({ filteredItems: sorted })
  },

  setSortKey: (key) => {
    set({
      sortKey: key,
      sortDescending: key === 'stash' ? false : true
    })
    get().applyFilters()
  },

  toggleSortDescending: () => {
    set(state => ({ sortDescending: !state.sortDescending }))
    get().applyFilters()
  },

  setCurrentView: (view) => set({ currentView: view }),

  setWealthSummary: (summary) => set({ wealthSummary: summary }),

  mergeItemValueOverrides: (overrides) =>
    set({ itemValueOverrides: overrides && typeof overrides === 'object' ? overrides : {} }),

  refreshWealthSnapshot: async () => {
    const res = await window.poeApi.refreshWealth()
    if (!res.ok) throw new Error(res.error || 'Wealth refresh failed')
    const w = await window.poeApi.getWealth()
    set({ wealthSummary: w?.lastEstimate || null })
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setAdvancedFiltersOpen: (open) => set({ isAdvancedFiltersOpen: open }),

  setTooltip: (item, pos) => set({ tooltipItem: item, tooltipPos: pos }),
  clearTooltip: () => set({ tooltipItem: null, tooltipPos: null }),
  openItemDetail: (item) => set({ selectedItem: item, isItemDetailOpen: true, tooltipItem: null, tooltipPos: null, isAdvancedFiltersOpen: false }),
  closeItemDetail: () => set({ selectedItem: null, isItemDetailOpen: false }),

  setSettings: (settings) => set(state => ({
    settings: { ...state.settings, ...settings }
  })),

  // Load saved data from electron-store on startup
  loadSavedData: async () => {
    try {
      const settings = await window.poeApi.getSettings()
      const authStatus = await window.poeApi.getAuthStatus()
      const savedData = await window.poeApi.getSavedData()

      const mergedSettings = {
        ...get().settings,
        ...settings
      }

      set({
        settings: mergedSettings,
        isLoggedIn: authStatus.loggedIn,
        accountName: authStatus.accountName,
        lastSync: savedData.lastSync
      })

      if (savedData.items && savedData.items.length > 0) {
        get().setItems(savedData.items)
      }

      try {
        const wealthData = await window.poeApi.getWealth()
        set({
          wealthSummary: wealthData?.lastEstimate || null
        })
      } catch {
        /* ignore */
      }

      try {
        const overrides = await window.poeApi.getItemValueOverrides()
        set({ itemValueOverrides: overrides && typeof overrides === 'object' ? overrides : {} })
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Failed to load saved data:', err)
    }
  }
}))
