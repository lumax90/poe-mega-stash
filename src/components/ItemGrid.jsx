import { useCallback } from 'react'
import { useAppStore } from '../store/app-store'

function pickItem(item) {
  useAppStore.getState().openItemDetail(item)
}

export default function ItemGrid() {
  const { filteredItems, setTooltip, clearTooltip } = useAppStore()

  const handleMouseEnter = useCallback((e, item) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.right + 8
    const y = rect.top
    const adjustedX = x + 320 > window.innerWidth ? rect.left - 328 : x
    const adjustedY = Math.min(y, window.innerHeight - 400)
    setTooltip(item, { x: adjustedX, y: Math.max(0, adjustedY) })
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
    <div className="item-grid-native-scroll">
      <div className="item-grid-native">
        {filteredItems.map((item, index) => (
          <div
            key={item.id != null ? String(item.id) : `i-${index}`}
            className={`item-cell rarity-${item.rarity}`}
            onMouseEnter={(e) => handleMouseEnter(e, item)}
            onMouseLeave={clearTooltip}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              pickItem(item)
            }}
          >
            {item.icon ? (
              <img src={item.icon} alt={item.name || item.baseType} loading="lazy" draggable={false} />
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', padding: 4 }}>
                {(item.name || item.baseType || '?').slice(0, 8)}
              </span>
            )}
            {item.stackSize > 1 && (
              <span className="item-stack">{item.stackSize}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
