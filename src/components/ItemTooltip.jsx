import { useAppStore } from '../store/app-store'

export default function ItemTooltip() {
  const { tooltipItem: item, tooltipPos: pos } = useAppStore()

  if (!item || !pos) return null

  const allMods = [
    ...(item.mods?.implicit || []).map(m => ({ text: m, type: 'implicit' })),
    ...(item.mods?.enchant || []).map(m => ({ text: m, type: 'enchant' })),
    ...(item.mods?.explicit || []).map(m => ({ text: m, type: 'explicit' })),
    ...(item.mods?.crafted || []).map(m => ({ text: m, type: 'crafted' })),
    ...(item.mods?.fractured || []).map(m => ({ text: m, type: 'fractured' }))
  ]

  const properties = item.properties || []
  const socketText = item.sockets?.total > 0
    ? `${item.sockets.total} Sockets (${item.sockets.maxLink}L)`
    : null

  return (
    <div
      className="item-tooltip animate-in"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header */}
      <div className="tooltip-header">
        <div className={`tooltip-name name-${item.rarity}`}>
          {item.name || item.typeLine || item.baseType}
        </div>
        {item.name && (
          <div className="tooltip-base">{item.baseType || item.typeLine}</div>
        )}
      </div>

      {/* Properties */}
      {(properties.length > 0 || socketText) && (
        <div className="tooltip-section">
          {properties.map((prop, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)' }}>
              {prop.name}: {prop.values?.map(v => v[0]).join(', ')}
            </div>
          ))}
          {socketText && <div>{socketText}</div>}
          {item.itemLevel > 0 && (
            <div>Item Level: {item.itemLevel}</div>
          )}
        </div>
      )}

      {/* Requirements */}
      {Object.keys(item.requirements || {}).length > 0 && (
        <div className="tooltip-section">
          <div style={{ color: 'var(--text-muted)' }}>
            Requires{' '}
            {Object.entries(item.requirements)
              .map(([key, val]) => `${key} ${val}`)
              .join(', ')}
          </div>
        </div>
      )}

      {/* Mods */}
      {allMods.length > 0 && (
        <div className="tooltip-section">
          {allMods.map((mod, i) => (
            <div key={i} className={`tooltip-mod ${mod.type}`}>
              {mod.text}
            </div>
          ))}
        </div>
      )}

      {/* Corrupted */}
      {item.corrupted && (
        <div className="tooltip-section" style={{ color: 'var(--error)', textAlign: 'center' }}>
          Corrupted
        </div>
      )}

      {/* Unidentified */}
      {!item.identified && (
        <div className="tooltip-section" style={{ color: 'var(--error)', textAlign: 'center' }}>
          Unidentified
        </div>
      )}

      {/* Flavour text for uniques */}
      {item.flavourText?.length > 0 && (
        <div className="tooltip-section" style={{ fontStyle: 'italic', color: 'var(--rarity-unique)', fontSize: 11 }}>
          {item.flavourText.join(' ')}
        </div>
      )}

      {/* Location — the key feature */}
      <div className="tooltip-location">
        {item.location?.type === 'stash' ? (
          <>
            <span className="loc-icon">📦</span>
            <span className="loc-label">Stash:</span>
            <span className="loc-value">{item.location.tabName}</span>
            {item.location.gridPos && (
              <span className="loc-label" style={{ marginLeft: 8 }}>
                Pos: ({item.location.gridPos.x}, {item.location.gridPos.y})
              </span>
            )}
          </>
        ) : item.location?.type === 'character' ? (
          <>
            <span className="loc-icon">👤</span>
            <span className="loc-label">Character:</span>
            <span className="loc-value">{item.location.characterName}</span>
            <span className="loc-label" style={{ marginLeft: 8 }}>
              ({item.location.slot})
            </span>
          </>
        ) : (
          <span className="loc-label">Location unknown</span>
        )}
      </div>
    </div>
  )
}
