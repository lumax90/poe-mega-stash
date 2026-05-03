import { useAppStore } from '../store/app-store'
import { SORT_OPTIONS } from '../lib/item-sort-stats'

const RARITY_OPTIONS = [
  { key: 'normal', label: 'Normal', color: 'var(--rarity-normal)' },
  { key: 'magic', label: 'Magic', color: 'var(--rarity-magic)' },
  { key: 'rare', label: 'Rare', color: 'var(--rarity-rare)' },
  { key: 'unique', label: 'Unique', color: 'var(--rarity-unique)' },
  { key: 'gem', label: 'Gem', color: 'var(--rarity-gem)' },
  { key: 'currency', label: 'Currency', color: 'var(--rarity-currency)' },
  { key: 'divination', label: 'Div Card', color: 'var(--rarity-divination)' }
]

const LOCATION_OPTIONS = [
  { key: 'stash', label: '📦 Stash', icon: '📦' },
  { key: 'character', label: '👤 Character', icon: '👤' }
]

export default function Toolbar() {
  const {
    filters,
    toggleRarityFilter,
    toggleLocationFilter,
    viewMode,
    setViewMode,
    items,
    setIsSyncing,
    setSyncProgress,
    setItems,
    setLastSync,
    isAdvancedFiltersOpen,
    setAdvancedFiltersOpen,
    clearTooltip,
    sortKey,
    sortDescending,
    setSortKey,
    toggleSortDescending,
    setWealthSummary
  } = useAppStore()

  const handleSync = async () => {
    const settings = await window.poeApi.getSettings()
    setIsSyncing(true)

    const unsub = window.poeApi.onSyncProgress((data) => {
      setSyncProgress(data)
      if (data.stage === 'done') {
        setIsSyncing(false)
      }
    })

    try {
      const result = await window.poeApi.syncAll(settings.league || 'Standard')
      if (result.success) {
        setItems(result.items)
        setLastSync(Date.now())
        if (result.wealth) {
          setWealthSummary(result.wealth)
        } else {
          try {
            const w = await window.poeApi.getWealth()
            setWealthSummary(w?.lastEstimate ?? null)
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
      unsub()
    }
  }

  // Count items by rarity
  const rarityCounts = {}
  for (const item of items) {
    rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + 1
  }

  const advancedFilterCount =
    filters.categories.length +
    (filters.corrupted !== 'any' ? 1 : 0) +
    (filters.identified !== 'any' ? 1 : 0) +
    (filters.minItemLevel ? 1 : 0) +
    (filters.maxItemLevel ? 1 : 0) +
    (filters.minLinks ? 1 : 0) +
    (filters.minSockets ? 1 : 0) +
    (filters.minQuality ? 1 : 0) +
    (filters.modText ? 1 : 0) +
    (filters.locationText ? 1 : 0)

  return (
    <div className="toolbar">
      <span className="toolbar-label">Source:</span>
      {LOCATION_OPTIONS.map(loc => (
        <button
          key={loc.key}
          className={`filter-chip ${filters.locationTypes.includes(loc.key) ? 'active' : ''}`}
          onClick={() => toggleLocationFilter(loc.key)}
        >
          {loc.label}
        </button>
      ))}

      <div className="toolbar-separator" />

      <span className="toolbar-label">Rarity:</span>
      {RARITY_OPTIONS.map(r => (
        <button
          key={r.key}
          className={`filter-chip ${filters.rarity.includes(r.key) ? 'active' : ''}`}
          onClick={() => toggleRarityFilter(r.key)}
          style={filters.rarity.includes(r.key) ? { borderColor: r.color, color: r.color, background: `${r.color}15` } : {}}
        >
          {r.label}
          {rarityCounts[r.key] > 0 && (
            <span className="chip-count">({rarityCounts[r.key]})</span>
          )}
        </button>
      ))}

      <div className="toolbar-separator" />

      <span className="toolbar-label">Sort:</span>
      <select
        className="toolbar-sort-select"
        value={sortKey}
        onChange={(e) => {
          clearTooltip()
          setSortKey(e.target.value)
        }}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-sm btn-secondary toolbar-sort-dir"
        title={sortDescending ? 'High → low' : 'Low → high'}
        onClick={() => {
          clearTooltip()
          toggleSortDescending()
        }}
      >
        {sortDescending ? '↓' : '↑'}
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >⊞</button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="List view"
          >☰</button>
        </div>

        <button
          className={`btn btn-sm ${isAdvancedFiltersOpen || advancedFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            clearTooltip()
            setAdvancedFiltersOpen(!isAdvancedFiltersOpen)
          }}
        >
          Filters{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}
        </button>

        <button className="btn btn-sm btn-secondary" onClick={handleSync}>
          🔄 Sync
        </button>
      </div>
    </div>
  )
}
