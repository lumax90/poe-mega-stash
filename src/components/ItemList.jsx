import { useCallback } from 'react'
import { useAppStore } from '../store/app-store'

function getLocationText(location) {
  if (!location) return ''
  if (location.type === 'stash') {
    const tabName = location.tabName || `Tab ${location.tabIndex}`
    const pos = location.gridPos ? ` / Pos: ${location.gridPos.x},${location.gridPos.y}` : ''
    return `Stash: ${tabName}${pos}`
  }
  if (location.type === 'character') {
    return `Character: ${location.characterName} / ${location.slot || 'equipped'}`
  }
  return ''
}

function pickItem(item) {
  useAppStore.getState().openItemDetail(item)
}

export default function ItemList() {
  const { filteredItems, setTooltip, clearTooltip } = useAppStore()

  const handleMouseEnter = useCallback((e, item) => {
    const tooltipWidth = 380
    const tooltipHeight = 400
    const preferredX = e.clientX + 16
    const x = preferredX + tooltipWidth > window.innerWidth
      ? Math.max(8, e.clientX - tooltipWidth - 16)
      : preferredX
    const y = Math.max(8, Math.min(e.clientY - 24, window.innerHeight - tooltipHeight - 8))

    setTooltip(item, { x, y })
  }, [setTooltip])

  if (filteredItems.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <h3>No items found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="item-list-native-scroll">
      {filteredItems.map((item, index) => (
        <div
          key={item.id != null ? String(item.id) : `i-${index}`}
          className="item-row"
          onMouseEnter={(e) => handleMouseEnter(e, item)}
          onMouseLeave={clearTooltip}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            pickItem(item)
          }}
        >
          <div className="item-row-icon">
            {item.icon ? (
              <img src={item.icon} alt="" loading="lazy" draggable={false} />
            ) : (
              <span style={{ fontSize: 16 }}>📦</span>
            )}
          </div>
          <div className="item-row-info">
            <div className={`item-row-name name-${item.rarity}`}>
              {item.name || item.baseType || item.typeLine}
            </div>
            <div className="item-row-base">
              {item.name ? item.baseType : item.typeLine}
              {item.itemLevel > 0 && ` · iLvl ${item.itemLevel}`}
              {item.sockets?.maxLink >= 5 && ` · ${item.sockets.maxLink}L`}
            </div>
          </div>
          <div className="item-row-location" title={getLocationText(item.location)}>
            {item.location?.type === 'stash' && <span>📦 </span>}
            {item.location?.type === 'character' && <span>👤 </span>}
            <span className="loc-highlight">{getLocationText(item.location)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
