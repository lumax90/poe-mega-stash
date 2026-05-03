import { useEffect } from 'react'
import { useAppStore } from './store/app-store'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import Toolbar from './components/Toolbar'
import ItemGrid from './components/ItemGrid'
import ItemList from './components/ItemList'
import ItemTooltip from './components/ItemTooltip'
import SettingsPanel from './components/SettingsPanel'
import DuplicateFinder from './components/DuplicateFinder'
import WealthStrip from './components/WealthStrip'
import WealthPanel from './components/WealthPanel'
import AdvancedFilters from './components/AdvancedFilters'
import ItemDetailPanel from './components/ItemDetailPanel'
import SyncOverlay from './components/SyncOverlay'
import LoginScreen from './components/LoginScreen'
import SupportPanel from './components/SupportPanel'
import GuidePanel from './components/GuidePanel'
export default function App() {
  const {
    isLoggedIn,
    currentView,
    viewMode,
    items,
    isSyncing,
    settings,
    isAdvancedFiltersOpen,
    setAdvancedFiltersOpen,
    selectedItem,
    clearTooltip,
    closeItemDetail,
    loadSavedData
  } = useAppStore()

  useEffect(() => {
    loadSavedData()
  }, [])

  // Show login/settings if no client ID and no POESESSID configured
  const needsSetup = !settings.clientId && !settings.poeSessId
  const isActuallyLoggedIn = isLoggedIn || !!settings.poeSessId
  const showWealthView = isActuallyLoggedIn && currentView === 'wealth'

  return (
    <>
      <div className="titlebar-drag-region" />
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
        {currentView === 'guide' ? (
          <GuidePanel />
        ) : currentView === 'buymeacoffee' ? (
          <SupportPanel />
        ) : currentView === 'settings' ? (
          <SettingsPanel />
        ) : currentView === 'duplicates' ? (
          <DuplicateFinder />
        ) : showWealthView ? (
          <WealthPanel />
        ) : needsSetup ? (
          <LoginScreen mode="setup" />
        ) : !isActuallyLoggedIn ? (
          <LoginScreen mode="login" />
        ) : items.length === 0 ? (
          <LoginScreen mode="sync" />
        ) : (
          <>
            <SearchBar />
            <WealthStrip />
            <Toolbar />
            {viewMode === 'grid' ? <ItemGrid /> : <ItemList />}
            {isAdvancedFiltersOpen && (
              <>
                <div
                  className="drawer-backdrop"
                  onClick={() => {
                    clearTooltip()
                    setAdvancedFiltersOpen(false)
                  }}
                />
                <AdvancedFilters />
              </>
            )}
          </>
        )}
      </div>
      {!isAdvancedFiltersOpen && !selectedItem && <ItemTooltip />}
      {selectedItem && (
        <>
          <div
            className="item-detail-backdrop"
            onClick={() => {
              clearTooltip()
              closeItemDetail()
            }}
          />
          <ItemDetailPanel />
        </>
      )}
      {isSyncing && <SyncOverlay />}
      </div>
    </>
  )
}
