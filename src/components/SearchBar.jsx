import { useAppStore } from '../store/app-store'

export default function SearchBar() {
  const { searchQuery, setSearchQuery, filteredItems, items } = useAppStore()

  return (
    <div className="topbar">
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search items... (name, mods, base type, character)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>
      <span className="search-count">
        {searchQuery
          ? `${filteredItems.length} / ${items.length}`
          : `${items.length} items`
        }
      </span>
    </div>
  )
}
