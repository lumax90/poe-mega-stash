import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../store/app-store'

function getItemTitle(item) {
  return item?.name || item?.baseType || item?.typeLine || 'Unknown Item'
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

function copyText(text) {
  if (!text) return
  navigator.clipboard?.writeText(text).catch(() => {})
}

function normalizeValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(' ')
  if (typeof value === 'object') return value.text || value.name || JSON.stringify(value)
  return String(value)
}

function ModSection({ title, mods }) {
  const normalizedMods = Array.isArray(mods)
    ? mods.map(normalizeValue).filter(Boolean)
    : []

  if (normalizedMods.length === 0) return null

  return (
    <section className="item-detail-section">
      <h4>{title}</h4>
      {normalizedMods.map((mod, index) => (
        <div key={`${title}-${index}`} className="item-detail-mod">{mod}</div>
      ))}
    </section>
  )
}

function kindLabel(kind) {
  switch (kind) {
    case 'manual': return 'Manual override'
    case 'ninja': return 'poe.ninja estimate'
    case 'unknown': return 'No automatic listing'
    case 'skipped_rare': return 'Rare (auto pricing off)'
    case 'skipped_magic': return 'Magic (auto pricing off)'
    case 'skipped_other': return 'Not auto-priced'
    default: return kind || '—'
  }
}

export default function ItemDetailPanel() {
  const {
    selectedItem,
    closeItemDetail,
    clearTooltip,
    settings,
    itemValueOverrides,
    mergeItemValueOverrides,
    refreshWealthSnapshot
  } = useAppStore()

  const [valuation, setValuation] = useState(null)
  const [manualDivine, setManualDivine] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeError, setTradeError] = useState(null)
  /** Roll offset % next to trade button — lowers stat/gem min floors only (no global setting). */
  const [tradeRollOffsetPct, setTradeRollOffsetPct] = useState(10)
  const [wealthErr, setWealthErr] = useState(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeItemDetail()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeItemDetail])

  useEffect(() => {
    if (!selectedItem?.id) return
    const ov = itemValueOverrides[selectedItem.id]
    setManualDivine(ov?.divineTotal != null ? String(ov.divineTotal) : '')
  }, [selectedItem?.id, itemValueOverrides])

  useEffect(() => {
    if (!selectedItem) {
      setValuation(null)
      setTradeError(null)
      setWealthErr(null)
      return
    }

    let cancelled = false
    const itemId = selectedItem.id

    ;(async () => {
      setValuation(null)
      try {
        const res = await window.poeApi.estimateOneValuation(selectedItem)
        if (cancelled || selectedItem.id !== itemId) return
        setValuation(res)
      } catch (e) {
        if (!cancelled && selectedItem.id === itemId) {
          setValuation({ ok: false, error: e?.message || String(e) })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedItem])

  const applyOverridesAndRefresh = useCallback(
    async (nextOverrides, guardItemId) => {
      mergeItemValueOverrides(nextOverrides)
      setWealthErr(null)
      try {
        await refreshWealthSnapshot()
      } catch (e) {
        setWealthErr(e?.message || 'Could not refresh wealth totals')
      }
      const cur = useAppStore.getState().selectedItem
      if (guardItemId != null && cur?.id !== guardItemId) return
      if (!cur) return
      try {
        const res = await window.poeApi.estimateOneValuation(cur)
        setValuation(res.ok ? res : { ok: false, error: res.error })
      } catch {
        /* ignore */
      }
    },
    [mergeItemValueOverrides, refreshWealthSnapshot]
  )

  const saveManualDivine = async () => {
    if (!selectedItem?.id) return
    const raw = manualDivine.trim().replace(',', '.')
    setSaveBusy(true)
    setWealthErr(null)
    try {
      const gid = selectedItem.id
      if (raw === '') {
        const res = await window.poeApi.removeItemValue(gid)
        if (res.ok) await applyOverridesAndRefresh(res.overrides, gid)
        return
      }
      const n = parseFloat(raw)
      if (!Number.isFinite(n) || n < 0) return
      const res = await window.poeApi.setItemValue({ itemId: gid, divineTotal: n })
      if (res.ok) await applyOverridesAndRefresh(res.overrides, gid)
    } finally {
      setSaveBusy(false)
    }
  }

  const clearManual = async () => {
    if (!selectedItem?.id) return
    setSaveBusy(true)
    setWealthErr(null)
    try {
      const gid = selectedItem.id
      const res = await window.poeApi.removeItemValue(gid)
      if (res.ok) {
        setManualDivine('')
        await applyOverridesAndRefresh(res.overrides, gid)
      }
    } finally {
      setSaveBusy(false)
    }
  }

  const openTrade = async () => {
    if (!selectedItem) return
    setTradeBusy(true)
    setTradeError(null)
    try {
      const res = await window.poeApi.openTradeSearch({
        item: selectedItem,
        league: settings.league || 'Standard',
        tradeOffsetPct: tradeRollOffsetPct
      })
      if (!res.ok) setTradeError(res.error || 'Trade search failed')
    } catch (e) {
      setTradeError(e?.message || String(e))
    } finally {
      setTradeBusy(false)
    }
  }

  if (!selectedItem) return null

  const item = selectedItem
  const title = getItemTitle(item)
  const locationText = getLocationText(item.location)

  const vOk = valuation && valuation.ok
  const showTrade =
    Boolean(valuation?.suggestTradeSearch || item.rarity === 'rare' || item.rarity === 'magic')

  return (
    <aside className="item-detail-panel animate-in" onMouseEnter={clearTooltip}>
      <div className="item-detail-header">
        <div className="item-detail-icon">
          {item.icon ? <img src={item.icon} alt="" /> : <span>📦</span>}
        </div>
        <div className="item-detail-title-wrap">
          <h3 className={`name-${item.rarity}`}>{title}</h3>
          <p>{item.name ? item.baseType : item.typeLine}</p>
        </div>
        <button type="button" className="item-detail-close" onClick={closeItemDetail}>✕</button>
      </div>

      <div className="item-detail-body">
        <section className="item-detail-section">
          <h4>Summary</h4>
          <div className="item-detail-facts">
            <span>Rarity: <strong>{item.rarity || 'unknown'}</strong></span>
            <span>Category: <strong>{item.category || 'other'}</strong></span>
            {item.itemLevel > 0 && <span>iLvl: <strong>{item.itemLevel}</strong></span>}
            {item.quality > 0 && <span>Quality: <strong>{item.quality}</strong></span>}
            {item.sockets?.total > 0 && <span>Sockets: <strong>{item.sockets.total}</strong></span>}
            {item.sockets?.maxLink > 0 && <span>Links: <strong>{item.sockets.maxLink}</strong></span>}
            {item.sockets?.colors && <span>Colors: <strong>{item.sockets.colors}</strong></span>}
            {item.stackSize && <span>Stack: <strong>{item.stackSize}{item.maxStackSize ? `/${item.maxStackSize}` : ''}</strong></span>}
            <span>Corrupted: <strong>{item.corrupted ? 'Yes' : 'No'}</strong></span>
            <span>Identified: <strong>{item.identified === false ? 'No' : 'Yes'}</strong></span>
          </div>
        </section>

        <section className="item-detail-section item-detail-valuation">
          <h4>Wealth valuation</h4>
          {!valuation && <div className="item-detail-muted">Loading estimate…</div>}
          {valuation && !valuation.ok && (
            <div className="item-detail-error">{valuation.error || 'Could not estimate'}</div>
          )}
          {vOk && (
            <div className="item-detail-valuation-grid">
              <div>
                <span className="item-detail-muted">Source</span>
                <strong>{kindLabel(valuation.kind)}</strong>
              </div>
              <div>
                <span className="item-detail-muted">This stack (Divine)</span>
                <strong className="item-detail-price">
                  {valuation.divineTotal != null ? valuation.divineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                </strong>
              </div>
              <div>
                <span className="item-detail-muted">This stack (Chaos)</span>
                <strong>
                  {valuation.chaosTotal != null ? valuation.chaosTotal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                </strong>
              </div>
              <div>
                <span className="item-detail-muted">League divine rate</span>
                <strong>{valuation.divineRate != null ? `${valuation.divineRate} c/D` : '—'}</strong>
              </div>
            </div>
          )}
          {showTrade && (
            <div className="item-detail-valuation-actions item-detail-trade-block">
              <div className="item-detail-trade-row">
                <label className="item-detail-trade-offset-label" htmlFor="trade-roll-offset">
                  Offset
                </label>
                <select
                  id="trade-roll-offset"
                  className="form-select item-detail-trade-offset-select"
                  value={String(tradeRollOffsetPct)}
                  onChange={(e) => setTradeRollOffsetPct(Number(e.target.value))}
                  disabled={tradeBusy}
                >
                  <option value={0}>0%</option>
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={tradeBusy}
                  onClick={openTrade}
                >
                  {tradeBusy ? 'Opening…' : 'Search on pathofexile.com trade'}
                </button>
              </div>
              <span className="item-detail-muted item-detail-trade-hint">
                Stat filters use minimum rolls only (no max cap). Offset lowers each minimum (e.g. 30% rolled + 10%
                offset → ≥27%). Rare/magic/uniques: mods + rarity only — no base type or item name. Currency,
                divination cards, and gems still use item type. Listings: Instant Buyout and In Person. Gems: same
                offset on level/quality minimums.
              </span>
            </div>
          )}
          {tradeError && <div className="item-detail-error" style={{ marginTop: 8 }}>{tradeError}</div>}

          <div className="item-detail-manual-row">
            <label className="item-detail-muted" htmlFor="manual-divine">Manual Divine (whole stack)</label>
            <div className="item-detail-manual-inputs">
              <input
                id="manual-divine"
                type="text"
                inputMode="decimal"
                className="form-input item-detail-input-compact"
                placeholder="e.g. 12.5"
                value={manualDivine}
                onChange={(e) => setManualDivine(e.target.value)}
              />
              <button type="button" className="btn btn-sm btn-primary" disabled={saveBusy} onClick={saveManualDivine}>
                {saveBusy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" disabled={saveBusy} onClick={clearManual}>
                Clear manual
              </button>
            </div>
          </div>
          <p className="item-detail-muted" style={{ margin: '8px 0 0', fontSize: 11, lineHeight: 1.45 }}>
            Manual values are stored per item and <strong>never</strong> overwritten when you refresh stash valuation.
            Clear manual to let poe.ninja price this stack again (when supported).
          </p>
          {wealthErr && <div className="item-detail-error" style={{ marginTop: 8 }}>{wealthErr}</div>}
        </section>

        <section className="item-detail-section">
          <h4>Location</h4>
          <div className="item-detail-location">{locationText}</div>
        </section>

        {Array.isArray(item.properties) && item.properties.length > 0 && (
          <section className="item-detail-section">
            <h4>Properties</h4>
            {item.properties.map((prop, index) => (
              <div key={index} className="item-detail-property">
                <span>{prop.name || 'Property'}</span>
                <strong>{normalizeValue(prop.values)}</strong>
              </div>
            ))}
          </section>
        )}

        <ModSection title="Implicit Mods" mods={item.mods?.implicit} />
        <ModSection title="Explicit Mods" mods={item.mods?.explicit} />
        <ModSection title="Crafted Mods" mods={item.mods?.crafted} />
        <ModSection title="Enchant Mods" mods={item.mods?.enchant} />
        <ModSection title="Fractured Mods" mods={item.mods?.fractured} />
        <ModSection title="Utility Mods" mods={item.mods?.utility} />
      </div>

      <div className="item-detail-actions">
        <button type="button" className="btn btn-secondary" onClick={() => copyText(title)}>Copy Name</button>
        <button type="button" className="btn btn-secondary" onClick={() => copyText(locationText)}>Copy Location</button>
      </div>
    </aside>
  )
}
