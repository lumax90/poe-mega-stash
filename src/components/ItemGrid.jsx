import { useCallback, useState, useEffect } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { useAppStore } from '../store/app-store'

const CELL_SIZE = 68 // 64px cell + 4px gap

export default function ItemGrid() {
  const { filteredItems, setTooltip, clearTooltip } = useAppStore()
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const { items, columnCount } = data
    const index = rowIndex * columnCount + columnIndex
    const item = items[index]

    if (!item) return null

    // Apply gap by reducing size slightly within the cell area
    const cellStyle = {
      ...style,
      left: style.left + 2,
      top: style.top + 2,
      width: style.width - 4,
      height: style.height - 4
    }

    return (
      <div
        style={cellStyle}
        className={`item-cell rarity-${item.rarity}`}
        onMouseEnter={(e) => handleMouseEnter(e, item)}
        onMouseLeave={clearTooltip}
      >
        {item.icon ? (
          <img src={item.icon} alt={item.name || item.baseType} loading="lazy" />
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', padding: 4 }}>
            {(item.name || item.baseType || '?').slice(0, 8)}
          </span>
        )}
        {item.stackSize > 1 && (
          <span className="item-stack">{item.stackSize}</span>
        )}
      </div>
    )
  }

  return (
    <div className="item-grid-container" style={{ padding: 0, flex: 1, overflow: 'hidden' }}>
      <Grid
        columnCount={Math.max(1, Math.floor((windowSize.width - 280) / CELL_SIZE))}
        columnWidth={CELL_SIZE}
        height={windowSize.height - 140}
        rowCount={Math.ceil(filteredItems.length / Math.max(1, Math.floor((windowSize.width - 280) / CELL_SIZE)))}
        rowHeight={CELL_SIZE}
        width={windowSize.width - 280}
        itemData={{ items: filteredItems, columnCount: Math.max(1, Math.floor((windowSize.width - 280) / CELL_SIZE)) }}
        style={{ padding: '12px 16px' }}
      >
        {Cell}
      </Grid>
    </div>
  )
}
