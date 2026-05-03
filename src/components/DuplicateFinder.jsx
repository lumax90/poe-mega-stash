import { useMemo, useState } from 'react'
import { useAppStore } from '../store/app-store'

function getItemTitle(item) {
  return item.name || item.baseType || item.typeLine || 'Unknown Item'
}

function getDuplicateKey(item) {
  return [
    item.rarity || 'unknown',
    item.name || '',
    item.baseType || '',
    item.typeLine || ''
  ].join('|').toLowerCase()
}

function getLocationText(location) {
  if (!location) return 'Location unknown'

  if (location.type === 'stash') {
    const tabName = location.tabName || `Tab ${location.tabIndex}`
    const pos = location.gridPos ? ` / Pos: ${location.gridPos.x},${location.gridPos.y}` : ''
    return `Stash: ${tabName}${pos}`
  }

  if (location.type === 'character') {
    return `Character: ${location.characterName} / ${location.slot || 'equipped'}`
  }

  return 'Location unknown'
}

export default function DuplicateFinder() {
  const { items, setTooltip, clearTooltip } = useAppStore()
  const [selectedKey, setSelectedKey] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const duplicateGroups = useMemo(() => {
    const groups = new Map()

    for (const item of items) {
      const key = getDuplicateKey(item)
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: getItemTitle(item),
          baseType: item.baseType || item.typeLine || '',
          rarity: item.rarity,
          icon: item.icon,
          items: []
        })
      }
      groups.get(key).items.push(item)
    }

    return [...groups.values()]
      .filter(group => group.items.length > 1)
      .sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title))
  }, [items])

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return duplicateGroups

    return duplicateGroups.filter(group => {
      const searchText = [
        group.title,
        group.baseType,
        group.rarity,
        ...group.items.map(item => item.searchText || '')
      ].join(' ').toLowerCase()

      return searchText.includes(query)
    })
  }, [duplicateGroups, searchQuery])

  const selectedGroup = filteredGroups.find(group => group.key === selectedKey) || filteredGroups[0]

  const handleMouseEnter = (event, item) => {
    const tooltipWidth = 380
    const tooltipHeight = 400
    const preferredX = event.clientX + 16
    const x = preferredX + tooltipWidth > window.innerWidth
      ? Math.max(8, event.clientX - tooltipWidth - 16)
      : preferredX
    const y = Math.max(8, Math.min(event.clientY - 24, window.innerHeight - tooltipHeight - 8))

    setTooltip(item, { x, y })
  }

  if (duplicateGroups.length === 0) {
    return (
      <div className="duplicates-container animate-in">
        <div className="duplicates-header">
          <h2>Duplicate Finder</h2>
          <p>No duplicate items found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="duplicates-container animate-in">
      <div className="duplicates-header">
        <div>
          <h2>Duplicate Finder</h2>
          <p>{filteredGroups.length} / {duplicateGroups.length} duplicate groups shown.</p>
        </div>
        <div className="duplicate-search">
          <span>🔍</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search duplicates..."
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      <div className="duplicates-layout">
        <div className="duplicate-groups">
          {filteredGroups.length === 0 ? (
            <div className="duplicate-empty">No duplicate groups match your search.</div>
          ) : filteredGroups.map(group => (
            <button
              key={group.key}
              className={`duplicate-group ${selectedGroup?.key === group.key ? 'active' : ''}`}
              onClick={() => setSelectedKey(group.key)}
            >
              <div className="duplicate-group-icon">
                {group.icon ? <img src={group.icon} alt="" loading="lazy" /> : <span>📦</span>}
              </div>
              <div className="duplicate-group-info">
                <div className={`duplicate-group-title name-${group.rarity}`}>{group.title}</div>
                <div className="duplicate-group-base">{group.baseType}</div>
              </div>
              <div className="duplicate-count">x{group.items.length}</div>
            </button>
          ))}
        </div>

        <div className="duplicate-items">
          <div className="duplicate-items-title">
            <span>{selectedGroup?.title}</span>
            <strong>x{selectedGroup?.items.length}</strong>
          </div>

          {!selectedGroup ? (
            <div className="duplicate-empty">Select a duplicate group.</div>
          ) : selectedGroup.items.map(item => (
            <div
              key={item.id}
              className="duplicate-item-row"
              onMouseEnter={(event) => handleMouseEnter(event, item)}
              onMouseLeave={clearTooltip}
            >
              <div className="duplicate-item-icon">
                {item.icon ? <img src={item.icon} alt="" loading="lazy" /> : <span>📦</span>}
              </div>
              <div className="duplicate-item-info">
                <div className={`duplicate-item-name name-${item.rarity}`}>{getItemTitle(item)}</div>
                <div className="duplicate-item-base">
                  {item.baseType || item.typeLine}
                  {item.itemLevel > 0 && ` · iLvl ${item.itemLevel}`}
                  {item.sockets?.maxLink >= 5 && ` · ${item.sockets.maxLink}L`}
                </div>
              </div>
              <div className="duplicate-item-location" title={getLocationText(item.location)}>
                {getLocationText(item.location)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
