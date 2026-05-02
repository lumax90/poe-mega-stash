import { useAppStore } from '../store/app-store'

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    items,
    lastSync,
    isLoggedIn,
    accountName,
    isSyncing,
    startSync
  } = useAppStore()

  const stashItems = items.filter(i => i.location?.type === 'stash')
  const charItems = items.filter(i => i.location?.type === 'character')

  const formatTime = (ts) => {
    if (!ts) return 'Never'
    const diff = Date.now() - ts
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">💎</span>
          <h1>PoE Mega Stash</h1>
        </div>
        <div className="sidebar-subtitle">Search. Find. Track Wealth.</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>

        <div
          className={`nav-item ${currentView === 'items' ? 'active' : ''}`}
          onClick={() => setCurrentView('items')}
        >
          <span className="nav-icon">📦</span>
          <span>All Items</span>
          {items.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
              {items.length.toLocaleString()}
            </span>
          )}
        </div>

        <div
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </div>

        {items.length > 0 && (
          <>
            <div className="nav-section-title">Breakdown</div>

            <div className="nav-item" style={{ cursor: 'default', opacity: 0.7 }}>
              <span className="nav-icon">📦</span>
              <span>Stash Items</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
                {stashItems.length.toLocaleString()}
              </span>
            </div>

            <div className="nav-item" style={{ cursor: 'default', opacity: 0.7 }}>
              <span className="nav-icon">👤</span>
              <span>Character Items</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
                {charItems.length.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {isLoggedIn && (
          <div className="sync-status" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 12 }}>👤</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{accountName || 'Connected'}</span>
            </div>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={startSync}
              disabled={isSyncing}
              style={{ padding: '0 8px', height: 24, fontSize: 11 }}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}
        <div className="sync-status">
          <span className={`sync-dot ${isSyncing ? 'stale' : (lastSync ? '' : 'offline')}`} />
          <span>{isSyncing ? 'Syncing in progress...' : `Synced: ${formatTime(lastSync)}`}</span>
        </div>
      </div>
    </div>
  )
}
