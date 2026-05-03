import { useAppStore } from '../store/app-store'

export default function WealthStrip() {
  const { wealthSummary, setCurrentView } = useAppStore()

  const val = wealthSummary?.totalDivine
  const league = wealthSummary?.league

  return (
    <button
      type="button"
      className="wealth-strip"
      onClick={() => setCurrentView('wealth')}
      title="Open wealth tracker"
    >
      <span className="wealth-strip-label">Wealth</span>
      <span className="wealth-strip-value">
        {val != null ? `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} Divine` : '—'}
      </span>
      {league && (
        <span className="wealth-strip-meta">{league}</span>
      )}
      <span className="wealth-strip-hint">chart →</span>
    </button>
  )
}
