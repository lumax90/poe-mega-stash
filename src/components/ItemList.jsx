import { useCallback, useState, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import { useAppStore } from '../store/app-store'

function getLocationText(location) {
  if (!location) return ''
  if (location.type === 'stash') {
    return location.tabName || `Tab ${location.tabIndex}`
  }
  if (location.type === 'character') {
    return `${location.characterName} (${location.slot || 'equipped'})`
  }
  return ''
}

export default function ItemList() {
  const { filteredItems, setTooltip, clearTooltip } = useAppStore()
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMouseEnter = useCallback((e, item) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip(item, {
      x: rect.right + 8,
      y: Math.min(rect.top, window.innerHeight - 400)
    })
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

  const Row = ({ index, style, data }) => {
    const item = data[index]
    
    // Add horizontal padding inside the style so the row doesn't touch the very edges if we want padding
    const rowStyle = {
      ...style,
      boxSizing: 'border-box'
    }

    return (
      <div
        style={rowStyle}
        className="item-row"
        onMouseEnter={(e) => handleMouseEnter(e, item)}
        onMouseLeave={clearTooltip}
      >
        <div className="item-row-icon">
          {item.icon ? (
            <img src={item.icon} alt="" loading="lazy" />
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
        <div className="item-row-location">
          {item.location?.type === 'stash' && <span>📦 </span>}
          {item.location?.type === 'character' && <span>👤 </span>}
          <span className="loc-highlight">{getLocationText(item.location)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="item-list-container" style={{ padding: 0, flex: 1, overflow: 'hidden' }}>
      <List
        height={windowSize.height - 140}
        itemCount={filteredItems.length}
        itemSize={57}
        width={windowSize.width - 280}
        itemData={filteredItems}
      >
        {Row}
      </List>
    </div>
  )
}
