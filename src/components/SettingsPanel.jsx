import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/app-store'

export default function SettingsPanel() {
  const { settings, setSettings } = useAppStore()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [leagues, setLeagues] = useState([])
  const [leaguesLoading, setLeaguesLoading] = useState(true)
  const [leaguesError, setLeaguesError] = useState(null)

  useEffect(() => { setForm(settings) }, [settings])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLeaguesLoading(true)
      setLeaguesError(null)
      try {
        const res = await window.poeApi.fetchLeagues()
        if (cancelled) return
        if (res.ok && Array.isArray(res.leagues)) {
          setLeagues(res.leagues)
        } else {
          setLeagues([])
          setLeaguesError(res.error || 'Could not load leagues.')
        }
      } catch (e) {
        if (!cancelled) {
          setLeagues([])
          setLeaguesError(e?.message || String(e))
        }
      } finally {
        if (!cancelled) setLeaguesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    setSettings(form)
    await window.poeApi.saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    const store = useAppStore.getState()
    if (store.items.length === 0) {
      store.setCurrentView('items')
    }
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const leagueOptions = useMemo(() => {
    const cur = form.league || 'Standard'
    const base =
      leagues.length > 0
        ? leagues
        : [
            { id: 'Standard', text: 'Standard' },
            { id: 'Hardcore', text: 'Hardcore' }
          ]
    if (base.some((l) => l.id === cur)) return base
    return [...base, { id: cur, text: `${cur} (saved)` }]
  }, [leagues, form.league])

  return (
    <div className="settings-container animate-in">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Account (POESESSID)</h3>
        <div className="form-group">
          <label className="form-label">Account Name</label>
          <input className="form-input" value={form.accountName || ''} onChange={e => update('accountName', e.target.value)} placeholder="E.g. YourAccount#1234" />
        </div>
        <div className="form-group">
          <label className="form-label">POESESSID</label>
          <input className="form-input" type="password" value={form.poeSessId || ''} onChange={e => update('poeSessId', e.target.value)} placeholder="Paste POESESSID cookie here" />
          <div className="form-hint">Press F12 on pathofexile.com, go to Application -&gt; Cookies and copy POESESSID.</div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Game Settings</h3>
        <div className="form-group">
          <label className="form-label">League</label>
          <select
            className="form-select"
            value={form.league || 'Standard'}
            onChange={(e) => update('league', e.target.value)}
            disabled={leaguesLoading && leagues.length === 0}
          >
            {leagueOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.text}</option>
            ))}
          </select>
          {leaguesLoading && <div className="form-hint">Loading leagues from pathofexile.com…</div>}
          {leaguesError && (
            <div className="form-hint" style={{ color: 'var(--warning)' }}>
              Could not refresh league list: {leaguesError}. Using Standard/Hardcore fallback; your saved league is kept if it differs.
            </div>
          )}
          <div className="form-hint">
            Loaded from GGG trade data (PC). Ids match the stash API. Private leagues may be missing — your saved value still appears as an extra option when needed.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        {saved && <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ Saved</span>}
      </div>
    </div>
  )
}
