import { useState } from 'react'
import { useAppStore } from '../store/app-store'
import {
  SUPPORT_PRIMARY_BUYMEACOFFEE,
  SUPPORT_LINKS,
  SUPPORT_SOURCE_URL
} from '../config/support-links'

export default function SupportPanel() {
  const { setCurrentView } = useAppStore()
  const [lastError, setLastError] = useState(null)

  const openUrl = async (url) => {
    const trimmed = String(url || '').trim()
    if (!trimmed) return
    setLastError(null)
    try {
      const res = await window.poeApi.openExternal(trimmed)
      if (!res?.ok) setLastError(res?.error || 'Could not open link')
    } catch (e) {
      setLastError(e?.message || String(e))
    }
  }

  const extraLinks = SUPPORT_LINKS.filter((l) => String(l.url || '').trim())
  const primary = String(SUPPORT_PRIMARY_BUYMEACOFFEE || '').trim()

  return (
    <div className="settings-container support-panel animate-in">
      <h2>Buy Me a Coffee</h2>
      <p className="support-intro">
        PoE Mega Stash stays free. If you want to say thanks, you can leave a tip — totally optional.
      </p>

      {lastError && <div className="support-error">{lastError}</div>}

      <div className="support-actions">
        {primary ? (
          <div className="support-link-card support-link-card-primary">
            <button type="button" className="btn btn-primary" onClick={() => openUrl(primary)}>
              Buy Me a Coffee
            </button>
            <p className="form-hint">Opens in your browser.</p>
          </div>
        ) : (
          <p className="form-hint">Support link is not available right now.</p>
        )}

        {extraLinks.map((link) => (
          <div key={link.key} className="support-link-card">
            <button type="button" className="btn btn-secondary" onClick={() => openUrl(link.url)}>
              {link.label}
            </button>
            {link.hint && <p className="form-hint">{link.hint}</p>}
          </div>
        ))}

        {String(SUPPORT_SOURCE_URL || '').trim() ? (
          <div className="support-link-card">
            <button type="button" className="btn btn-ghost" onClick={() => openUrl(SUPPORT_SOURCE_URL)}>
              Source / releases
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrentView('items')}>
          ← Back
        </button>
      </div>
    </div>
  )
}
