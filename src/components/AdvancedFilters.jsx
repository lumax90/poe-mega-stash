import { useAppStore } from '../store/app-store'

const CATEGORY_OPTIONS = [
  { key: 'gem', label: 'Gem' },
  { key: 'map', label: 'Map' },
  { key: 'jewel', label: 'Jewel' },
  { key: 'flask', label: 'Flask' },
  { key: 'currency', label: 'Currency' },
  { key: 'card', label: 'Div Card' },
  { key: 'fragment', label: 'Fragment' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'armour', label: 'Armour' },
  { key: 'accessory', label: 'Accessory' },
  { key: 'other', label: 'Other' }
]

function FilterInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="advanced-filter-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="advanced-filter-field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function AdvancedFilters() {
  const {
    filters,
    setFilter,
    toggleCategoryFilter,
    clearAdvancedFilters,
    setAdvancedFiltersOpen,
    clearTooltip
  } = useAppStore()

  return (
    <aside className="advanced-filters-panel animate-in" onMouseEnter={clearTooltip}>
      <div className="advanced-filters-header">
        <div>
          <h3>Advanced Filters</h3>
          <p>PoE trade style local filters</p>
        </div>
        <button onClick={() => {
          clearTooltip()
          setAdvancedFiltersOpen(false)
        }}>✕</button>
      </div>

      <div className="advanced-filters-body">
        <section className="advanced-filter-section">
          <h4>Item Type</h4>
          <div className="advanced-chip-grid">
            {CATEGORY_OPTIONS.map(category => (
              <button
                key={category.key}
                className={`filter-chip ${filters.categories.includes(category.key) ? 'active' : ''}`}
                onClick={() => toggleCategoryFilter(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <section className="advanced-filter-section">
          <h4>Item State</h4>
          <FilterSelect
            label="Corrupted"
            value={filters.corrupted}
            onChange={(value) => setFilter('corrupted', value)}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'yes', label: 'Corrupted only' },
              { value: 'no', label: 'Not corrupted' }
            ]}
          />
          <FilterSelect
            label="Identified"
            value={filters.identified}
            onChange={(value) => setFilter('identified', value)}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'yes', label: 'Identified only' },
              { value: 'no', label: 'Unidentified only' }
            ]}
          />
        </section>

        <section className="advanced-filter-section">
          <h4>Numbers</h4>
          <div className="advanced-filter-row">
            <FilterInput label="Min iLvl" type="number" value={filters.minItemLevel} onChange={(value) => setFilter('minItemLevel', value)} placeholder="84" />
            <FilterInput label="Max iLvl" type="number" value={filters.maxItemLevel} onChange={(value) => setFilter('maxItemLevel', value)} placeholder="100" />
          </div>
          <div className="advanced-filter-row">
            <FilterInput label="Min Links" type="number" value={filters.minLinks} onChange={(value) => setFilter('minLinks', value)} placeholder="6" />
            <FilterInput label="Min Sockets" type="number" value={filters.minSockets} onChange={(value) => setFilter('minSockets', value)} placeholder="6" />
          </div>
          <FilterInput label="Min Quality" type="number" value={filters.minQuality} onChange={(value) => setFilter('minQuality', value)} placeholder="20" />
        </section>

        <section className="advanced-filter-section">
          <h4>Text Filters</h4>
          <FilterInput label="Mod contains" value={filters.modText} onChange={(value) => setFilter('modText', value)} placeholder="maximum life" />
          <FilterInput label="Location contains" value={filters.locationText} onChange={(value) => setFilter('locationText', value)} placeholder="currency tab / deadeye" />
        </section>
      </div>

      <div className="advanced-filters-footer">
        <button className="btn btn-secondary" onClick={clearAdvancedFilters}>Clear Advanced Filters</button>
      </div>
    </aside>
  )
}
