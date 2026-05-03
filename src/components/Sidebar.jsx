import { useAppStore } from '../store/app-store'
import UpdateChecker from './UpdateChecker'
import appIcon from '../assets/app-icon.png'

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    items,
    filters,
    setFilter,
    lastSync,
    isLoggedIn,
    accountName,
    isSyncing,
    settings
  } = useAppStore()

  const sessionReady = isLoggedIn || !!settings.poeSessId

  const stashItems = items.filter(i => i.location?.type === 'stash')
  const charItems = items.filter(i => i.location?.type === 'character')

  const locTypes = filters.locationTypes
  const isItemsView = currentView === 'items'
  const stashOnlyActive = isItemsView && locTypes.length === 1 && locTypes[0] === 'stash'
  const characterOnlyActive = isItemsView && locTypes.length === 1 && locTypes[0] === 'character'
  const allItemsActive = isItemsView && !stashOnlyActive && !characterOnlyActive

  const showAllItemsOnly = () => {
    setCurrentView('items')
    setFilter('locationTypes', [])
  }

  const showStashItemsOnly = () => {
    setCurrentView('items')
    setFilter('locationTypes', ['stash'])
  }

  const showCharacterItemsOnly = () => {
    setCurrentView('items')
    setFilter('locationTypes', ['character'])
  }

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
          <div className="logo-icon-wrap">
            <img className="logo-icon" src={appIcon} alt="" draggable={false} />
          </div>
          <h1>PoE Mega Stash</h1>
        </div>
        <div className="sidebar-subtitle">Search. Find. Track Wealth.</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-groups">
          <div className="nav-section-title">Navigation</div>

          <div className="nav-all-items-group">
            <div
              className={`nav-item ${allItemsActive ? 'active' : ''}`}
              onClick={showAllItemsOnly}
            >
              <span className="nav-icon">📦</span>
              <span>All Items</span>
              {items.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
                  {items.length.toLocaleString()}
                </span>
              )}
            </div>

            {items.length > 0 && (
              <div className="nav-subitems">
                <div
                  className={`nav-item nav-subitem ${stashOnlyActive ? 'active' : ''}`}
                  onClick={showStashItemsOnly}
                >
                  <span className="nav-icon">📦</span>
                  <span>Stash Items</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
                    {stashItems.length.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`nav-item nav-subitem ${characterOnlyActive ? 'active' : ''}`}
                  onClick={showCharacterItemsOnly}
                >
                  <span className="nav-icon">👤</span>
                  <span>Character Items</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>
                    {charItems.length.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {(sessionReady || items.length > 0) && (
            <>
              <div className="nav-section-title">Tools</div>

              {sessionReady && (
                <div
                  className={`nav-item ${currentView === 'wealth' ? 'active' : ''}`}
                  onClick={() => setCurrentView('wealth')}
                >
                  <span className="nav-icon">📈</span>
                  <span>Wealth</span>
                </div>
              )}

              {items.length > 0 && (
                <div
                  className={`nav-item ${currentView === 'duplicates' ? 'active' : ''}`}
                  onClick={() => setCurrentView('duplicates')}
                >
                  <span className="nav-icon">⧉</span>
                  <span>Duplicate Finder</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar-nav-settings">
          <div
            className={`nav-item ${currentView === 'guide' ? 'active' : ''}`}
            onClick={() => setCurrentView('guide')}
          >
            <span className="nav-icon">📖</span>
            <span>Guide</span>
          </div>
          <div className="sidebar-settings-row">
            <div
              className={`nav-item nav-settings-main ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span>Settings</span>
            </div>
            <UpdateChecker />
          </div>
        </div>

        <div className="sidebar-nav-support">
          <div
            className={`nav-item ${currentView === 'buymeacoffee' ? 'active' : ''}`}
            onClick={() => setCurrentView('buymeacoffee')}
          >
            <span className="nav-icon">☕</span>
            <span>Buy Me a Coffee</span>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        {isLoggedIn && (
          <div className="sync-status" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12 }}>👤</span>
            <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{accountName || 'Connected'}</span>
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
