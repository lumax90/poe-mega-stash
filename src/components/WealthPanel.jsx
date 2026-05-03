import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/app-store'

const CHART_W = 560
const CHART_H = 140
const CHART_PAD = { t: 16, r: 16, b: 28, l: 44 }

function WealthSparkline({ points }) {
  const innerW = CHART_W - CHART_PAD.l - CHART_PAD.r
  const innerH = CHART_H - CHART_PAD.t - CHART_PAD.b

  const { pathD, areaD, minV, maxV, coords } = useMemo(() => {
    if (!points.length) {
      return { pathD: '', areaD: '', minV: 0, maxV: 1, coords: [] }
    }
    const vals = points.map((p) => p.totalDivine)
    let minV = Math.min(...vals)
    let maxV = Math.max(...vals)
    if (minV === maxV) {
      minV -= 1
      maxV += 1
    }
    const n = points.length
    const coords = points.map((p, i) => {
      const x = CHART_PAD.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y =
        CHART_PAD.t + innerH - ((p.totalDivine - minV) / (maxV - minV)) * innerH
      return { x, y, ts: p.ts, totalDivine: p.totalDivine }
    })
    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
    const first = coords[0]
    const last = coords[coords.length - 1]
    const baseY = (CHART_PAD.t + innerH).toFixed(1)
    const areaD = `${pathD} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`
    return { pathD, areaD, minV, maxV, coords }
  }, [points, innerW, innerH])

  if (points.length === 0) {
    return (
      <div className="wealth-chart-empty">
        No snapshots yet. Sync your stash or tap Refresh to record a point.
      </div>
    )
  }

  return (
    <svg className="wealth-sparkline" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="wealth-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x={CHART_PAD.l} y={14} className="wealth-chart-axis">
        {maxV.toFixed(1)} D
      </text>
      <text x={CHART_PAD.l} y={CHART_H - 8} className="wealth-chart-axis">
        {minV.toFixed(1)} D
      </text>
      {areaD ? <path d={areaD} fill="url(#wealth-fill)" /> : null}
      {pathD ? (
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {coords.map((c, i) => (
        <circle key={`${c.ts}-${i}`} cx={c.x} cy={c.y} r={points.length === 1 ? 5 : 3} fill="var(--accent)" opacity={0.9}>
          <title>{`${new Date(c.ts).toLocaleString()}: ${c.totalDivine.toFixed(2)} Divine`}</title>
        </circle>
      ))}
    </svg>
  )
}

function PricedItemRow({ row, items, openItemDetail }) {
  const item = row.itemId ? items.find((i) => i.id === row.itemId) : null
  const clickable = Boolean(row.itemId && item)
  let title = 'Show item details'
  if (!row.itemId) title = 'Older snapshot — re-run valuation for clickable rows'
  else if (!item) title = 'Not in current stash — run Sync'

  return (
    <li>
      <button
        type="button"
        className="wealth-priced-row"
        disabled={!clickable}
        title={title}
        onClick={() => clickable && openItemDetail(item)}
      >
        <span className="wealth-top-label">{row.label}</span>
        <span className="wealth-top-val">{row.divine != null ? `${row.divine} D` : ''}</span>
      </button>
    </li>
  )
}

export default function WealthPanel() {
  const { settings, setWealthSummary, setCurrentView, items, openItemDetail } = useAppStore()
  const league = settings.league || 'Standard'

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [lastEstimate, setLastEstimate] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.poeApi.getWealth()
      setHistory(Array.isArray(data.history) ? data.history : [])
      setLastEstimate(data.lastEstimate || null)
      setWealthSummary(data.lastEstimate || null)
    } catch (e) {
      setError(e?.message || 'Failed to load wealth data')
    } finally {
      setLoading(false)
    }
  }, [setWealthSummary])

  useEffect(() => {
    load()
  }, [load])

  const series = useMemo(() => {
    return history
      .filter((h) => h && h.league === league)
      .slice()
      .sort((a, b) => a.ts - b.ts)
  }, [history, league])

  const growth = useMemo(() => {
    if (series.length < 2) return null
    const a = series[0].totalDivine
    const b = series[series.length - 1].totalDivine
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null
    return ((b - a) / Math.abs(a)) * 100
  }, [series])

  const refresh = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await window.poeApi.refreshWealth()
      if (!res.ok) {
        setError(res.error || 'Refresh failed')
        return
      }
      await load()
    } catch (e) {
      setError(e?.message || 'Refresh failed')
    } finally {
      setBusy(false)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all wealth history and the current estimate? This cannot be undone.')) return
    setBusy(true)
    try {
      await window.poeApi.clearWealthHistory()
      setHistory([])
      setLastEstimate(null)
      setWealthSummary(null)
    } catch (e) {
      setError(e?.message || 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  const display =
    lastEstimate?.league === league
      ? lastEstimate
      : series[series.length - 1] ?? null

  const pricedRows = useMemo(() => {
    if (!display) return []
    if (Array.isArray(display.pricedLines) && display.pricedLines.length > 0) return display.pricedLines
    return Array.isArray(display.topItems) ? display.topItems : []
  }, [display])

  return (
    <div className="wealth-panel animate-in">
      <div className="wealth-panel-head">
        <div>
          <h2 className="wealth-panel-title">Wealth tracker</h2>
          <p className="wealth-panel-sub">
            League: <strong>{league}</strong>
            {' · '}
            Snapshots in chart: {series.length}
          </p>
        </div>
        <div className="wealth-panel-actions">
          <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => setCurrentView('items')}>
            Back to stash
          </button>
          <button type="button" className="btn btn-sm btn-primary" disabled={busy || loading} onClick={refresh}>
            {busy ? 'Working…' : 'Refresh valuation'}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy || loading} onClick={clearHistory}>
            Clear history
          </button>
        </div>
      </div>

      <div className="wealth-panel-experimental" role="note">
        <strong>Experimental</strong> — do not trust these values for real decisions; estimates are incomplete and can be
        wrong (e.g. rare gear, outdated rates, manual overrides).
      </div>

      {error && <div className="wealth-panel-error">{error}</div>}

      {!loading && lastEstimate && lastEstimate.league !== league && series.length === 0 && (
        <div className="wealth-panel-error" style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--text-secondary)' }}>
          No snapshots for <strong>{league}</strong> yet. Last saved estimate is for <strong>{lastEstimate.league}</strong>
          — refresh valuation or change league in Settings.
        </div>
      )}

      {loading ? (
        <div className="wealth-panel-loading">Loading…</div>
      ) : (
        <>
          <div className="wealth-panel-cards">
            <div className="wealth-card">
              <div className="wealth-card-label">Estimated stash (Divine)</div>
              <div className="wealth-card-value">
                {display?.totalDivine != null
                  ? Number(display.totalDivine).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : '—'}
              </div>
              <div className="wealth-card-meta">
                {display?.countedItems != null ? `${display.countedItems.toLocaleString()} priced lines` : ''}
                {display?.skippedRare ? ` · rare skipped ${display.skippedRare}` : ''}
                {display?.skippedMagic ? ` · magic skipped ${display.skippedMagic}` : ''}
                {display?.priceKeysLoaded != null && display.priceKeysLoaded > 0 ? (
                  <> · poe.ninja index ~{display.priceKeysLoaded.toLocaleString()} names</>
                ) : null}
              </div>
              {display?.priceKeysLoaded === 0 && (
                <div className="wealth-panel-error" style={{ marginTop: 8 }}>
                  Economy API returned no prices for this league (check league name / connection).
                </div>
              )}
            </div>
            <div className="wealth-card">
              <div className="wealth-card-label">Change over recorded history</div>
              <div className={`wealth-card-value ${growth != null && growth >= 0 ? 'positive' : growth != null ? 'negative' : ''}`}>
                {growth == null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
              </div>
              <div className="wealth-card-meta">
                {series.length >= 2
                  ? `${new Date(series[0].ts).toLocaleDateString()} → ${new Date(series[series.length - 1].ts).toLocaleDateString()}`
                  : 'Need at least two snapshots'}
              </div>
            </div>
          </div>

          {display != null && display.totalItems != null && (
            <div className="wealth-breakdown">
              <div className="wealth-breakdown-title">Valuation coverage</div>
              <ul className="wealth-breakdown-list">
                <li>
                  <strong>{display.totalItems.toLocaleString()}</strong> items in synced stash / inventory
                </li>
                <li>
                  <strong>{(display.countedItems ?? 0).toLocaleString()}</strong> stacks summed into the total (currency stacks count once each)
                </li>
                <li>
                  <strong>{(display.unknownItems ?? 0).toLocaleString()}</strong> stacks had no matching poe.ninja row — they add <strong>0</strong> (legacy names, disabled drops, league mismatches, etc.)
                </li>
                <li>
                  Excluded by rule — rare: <strong>{display.skippedRare ?? 0}</strong>, magic:{' '}
                  <strong>{display.skippedMagic ?? 0}</strong>, other (normal gear, quest, prophecy…):{' '}
                  <strong>{display.skippedOther ?? 0}</strong>
                </li>
              </ul>
            </div>
          )}

          <div className="wealth-chart-wrap">
            <div className="wealth-chart-title">History ({league})</div>
            <WealthSparkline points={series} />
          </div>

          {pricedRows.length > 0 && (
            <div className="wealth-top">
              <div className="wealth-chart-title">Valued items (tap row for detail)</div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                Showing up to {pricedRows.length.toLocaleString()} rows by value
                {display?.countedItems != null ? ` · ${display.countedItems.toLocaleString()} priced stacks total` : ''}.
              </p>
              <div className="wealth-priced-scroll">
                <ul className="wealth-top-list">
                  {pricedRows.map((row, i) => (
                    <PricedItemRow
                      key={row.itemId ? `${row.itemId}-${i}` : `${row.label}-${i}`}
                      row={row}
                      items={items}
                      openItemDetail={openItemDetail}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="wealth-disclaimer">
            Totals include poe.ninja matches plus any <strong>manual Divine</strong> values you set in item details (those overrides survive refresh). Wrong ninja matches are possible if names collide. Gems use the{' '}
            <strong>lowest</strong> chaos price among variants with the same name (conservative). Rare/magic gear counts only when manually priced.
          </p>
        </>
      )}
    </div>
  )
}
