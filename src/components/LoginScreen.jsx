import { useState } from 'react'
import { useAppStore } from '../store/app-store'

export default function LoginScreen({ mode }) {
  const { settings, setIsSyncing, setSyncProgress, setItems, setLastSync, setAuth, setCurrentView } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.poeApi.startOAuth()
      if (result.success) {
        const status = await window.poeApi.getAuthStatus()
        setAuth(true, status.accountName)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    const unsub = window.poeApi.onSyncProgress((data) => setSyncProgress(data))
    try {
      const result = await window.poeApi.syncAll(settings.league || 'Standard')
      if (result.success) { setItems(result.items); setLastSync(Date.now()) }
      else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setIsSyncing(false); unsub() }
  }

  const content = {
    setup: { icon: '⚙️', title: 'Welcome to PoE Mega Stash', desc: 'Configure your PoE OAuth credentials in Settings first.', btnText: 'Open Settings', btnAction: () => setCurrentView('settings') },
    login: { icon: '🔑', title: 'Connect PoE Account', desc: 'Login with your Path of Exile account.', btnText: loading ? '⏳ Waiting...' : '🔗 Connect with PoE', btnAction: handleLogin },
    sync: { icon: '📦', title: 'Ready to Load Items', desc: `Fetch all items. League: ${settings.league || 'Standard'}`, btnText: '🔄 Sync All Items', btnAction: handleSync }
  }[mode]

  if (!content) return null

  return (
    <div className="login-screen">
      <div className="login-card animate-in">
        <div className="login-icon">{content.icon}</div>
        <h2>{content.title}</h2>
        <p>{content.desc}</p>
        {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <button className="btn btn-primary btn-lg" onClick={content.btnAction} disabled={loading}>{content.btnText}</button>
      </div>
    </div>
  )
}
