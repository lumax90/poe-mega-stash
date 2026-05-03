import { useEffect, useState } from 'react'

export default function UpdateChecker() {
  const [state, setState] = useState({ phase: 'idle' })

  useEffect(() => {
    const api = window.poeApi
    if (!api?.updaterGetStatus) return undefined

    api.updaterGetStatus().then(setState).catch(() => {})

    const unsub = api.onUpdaterPush?.(setState)
    return typeof unsub === 'function' ? unsub : undefined
  }, [])

  const { phase, version, percent, message } = state

  if (phase === 'disabled' || phase === 'idle') return null

  if (phase === 'checking') {
    return (
      <div className="sidebar-update-widget sidebar-update-muted" title="Checking for updates…">
        <span className="sidebar-update-pulse" aria-hidden />
      </div>
    )
  }

  if (phase === 'downloading') {
    const label = Number.isFinite(percent) ? `${percent}%` : '…'
    return (
      <div
        className="sidebar-update-widget sidebar-update-download"
        title={version ? `Downloading v${version}…` : 'Downloading update…'}
      >
        <span className="sidebar-update-label">{label}</span>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <button
        type="button"
        className="sidebar-update-btn"
        title={version ? `Install v${version} and restart` : 'Install update and restart'}
        onClick={() => window.poeApi?.updaterInstall?.()}
      >
        Update
      </button>
    )
  }

  if (phase === 'error') {
    return (
      <button
        type="button"
        className="sidebar-update-btn sidebar-update-btn-muted"
        title={message || 'Update check failed'}
        onClick={() => window.poeApi?.updaterCheck?.()}
      >
        Retry
      </button>
    )
  }

  return null
}
