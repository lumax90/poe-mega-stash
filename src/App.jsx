import { useEffect } from 'react'
import { useAppStore } from './store/app-store'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import Toolbar from './components/Toolbar'
import ItemGrid from './components/ItemGrid'
import ItemList from './components/ItemList'
import ItemTooltip from './components/ItemTooltip'
import SettingsPanel from './components/SettingsPanel'
import SyncOverlay from './components/SyncOverlay'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const {
    isLoggedIn,
    currentView,
    viewMode,
    items,
    isSyncing,
    settings,
    loadSavedData
  } = useAppStore()

  useEffect(() => {
    loadSavedData()
  }, [])

  // Show login/settings if no client ID and no POESESSID configured
  const needsSetup = !settings.clientId && !settings.poeSessId
  const isActuallyLoggedIn = isLoggedIn || !!settings.poeSessId

  return (
    <>
      <div className="titlebar-drag-region" />
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
        {currentView === 'settings' ? (
          <SettingsPanel />
        ) : needsSetup ? (
          <LoginScreen mode="setup" />
        ) : !isActuallyLoggedIn ? (
          <LoginScreen mode="login" />
        ) : items.length === 0 ? (
          <LoginScreen mode="sync" />
        ) : (
          <>
            <SearchBar />
            <Toolbar />
            {viewMode === 'grid' ? <ItemGrid /> : <ItemList />}
          </>
        )}
      </div>
      <ItemTooltip />
      {isSyncing && <SyncOverlay />}
      </div>
    </>
  )
}
