import { useState, useEffect } from 'react'
import { useAppStore } from '../store/app-store'

export default function SettingsPanel() {
  const { settings, setSettings } = useAppStore()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

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

  return (
    <div className="settings-container animate-in">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>PoE OAuth Credentials (Recommended)</h3>
        <div className="form-group">
          <label className="form-label">Client ID</label>
          <input className="form-input" value={form.clientId || ''} onChange={e => update('clientId', e.target.value)} placeholder="Your OAuth Client ID" />
          <div className="form-hint">Get this from pathofexile.com/developer/docs</div>
        </div>
        <div className="form-group">
          <label className="form-label">Client Secret (optional)</label>
          <input className="form-input" type="password" value={form.clientSecret || ''} onChange={e => update('clientSecret', e.target.value)} placeholder="Your OAuth Client Secret" />
        </div>
        <div className="form-group">
          <label className="form-label">Contact Email</label>
          <input className="form-input" value={form.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} placeholder="your@email.com" />
          <div className="form-hint">Required by GGG for User-Agent header</div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Alternative: POESESSID (No registration required)</h3>
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
          <select className="form-select" value={form.league || 'Standard'} onChange={e => update('league', e.target.value)}>
            <option value="Standard">Standard</option>
            <option value="Hardcore">Hardcore</option>
            <option value="Settlers">Settlers of Kalguur</option>
            <option value="Hardcore Settlers">HC Settlers of Kalguur</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        {saved && <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ Saved</span>}
      </div>
    </div>
  )
}
