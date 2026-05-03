/**
 * Derive numeric sort keys from PoE item JSON (English mod text + properties).
 * Attributes & resists use combined lines (e.g. +all Attributes, all Elemental Resistances).
 * Unidentified items may sort low.
 */

const RARITY_RANK = {
  unique: 6,
  foil: 6,
  rare: 5,
  magic: 4,
  normal: 3,
  gem: 3,
  currency: 2,
  divination: 2,
  prophecy: 2,
  quest: 1,
  unknown: 0
}

function allModText(item) {
  const m = item.mods || {}
  return [
    ...(m.implicit || []),
    ...(m.explicit || []),
    ...(m.crafted || []),
    ...(m.enchant || []),
    ...(m.fractured || []),
    ...(m.utility || [])
  ].join(' ')
}

function sumRegexGlobal(text, regex) {
  let sum = 0
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`)
  let m
  while ((m = r.exec(text)) !== null) {
    const v = parseFloat(m[1])
    if (!Number.isNaN(v)) sum += v
  }
  return sum
}

function resistancesFromMods(text) {
  let fire = 0
  let cold = 0
  let lightning = 0
  let chaos = 0

  const add = (re, fn) => {
    const r = new RegExp(re.source, 'gi')
    let m
    while ((m = r.exec(text)) !== null) {
      const v = parseInt(m[1], 10)
      if (!Number.isNaN(v)) fn(v)
    }
  }

  /* Order: broader / combined lines before singles where needed */
  add(/\+(\d+)% to all Elemental Resistances/g, v => {
    fire += v
    cold += v
    lightning += v
  })
  add(/\+(\d+)% to Fire, Cold and Lightning Resistances/g, v => {
    fire += v
    cold += v
    lightning += v
  })
  add(/\+(\d+)% to all Resistances/g, v => {
    fire += v
    cold += v
    lightning += v
    chaos += v
  })
  add(/\+(\d+)% to Fire and Cold Resistances/g, v => { fire += v; cold += v })
  add(/\+(\d+)% to Fire and Lightning Resistances/g, v => { fire += v; lightning += v })
  add(/\+(\d+)% to Cold and Lightning Resistances/g, v => { cold += v; lightning += v })
  add(/\+(\d+)% to Fire and Chaos Resistances/g, v => { fire += v; chaos += v })
  add(/\+(\d+)% to Cold and Chaos Resistances/g, v => { cold += v; chaos += v })
  add(/\+(\d+)% to Lightning and Chaos Resistances/g, v => { lightning += v; chaos += v })
  add(/\+(\d+)% to Fire Resistance/g, v => { fire += v })
  add(/\+(\d+)% to Cold Resistance/g, v => { cold += v })
  add(/\+(\d+)% to Lightning Resistance/g, v => { lightning += v })
  add(/\+(\d+)% to Chaos Resistance/g, v => { chaos += v })

  return {
    fire,
    cold,
    lightning,
    chaos,
    totalEle: fire + cold + lightning,
    totalAll: fire + cold + lightning + chaos
  }
}

/** Effective Str/Dex/Int from mods: all Attributes, dual lines, then standalone (no double count). */
function attributesFromMods(text) {
  let str = 0
  let dex = 0
  let int = 0

  const add = (re, fn) => {
    const r = new RegExp(re.source, 'gi')
    let m
    while ((m = r.exec(text)) !== null) {
      const v = parseInt(m[1], 10)
      if (!Number.isNaN(v)) fn(v)
    }
  }

  add(/\+(\d+) to all Attributes/g, v => {
    str += v
    dex += v
    int += v
  })
  add(/\+(\d+) to Strength and Intelligence/g, v => { str += v; int += v })
  add(/\+(\d+) to Strength and Dexterity/g, v => { str += v; dex += v })
  add(/\+(\d+) to Dexterity and Intelligence/g, v => { dex += v; int += v })
  add(/\+(\d+) to Strength(?!\s+and\b)/g, v => { str += v })
  add(/\+(\d+) to Dexterity(?!\s+and\b)/g, v => { dex += v })
  add(/\+(\d+) to Intelligence(?!\s+and\b)/g, v => { int += v })

  return { str, dex, int }
}

function propertyNumberMatch(item, nameTest) {
  let sum = 0
  for (const p of item.properties || []) {
    const name = (p.name || '').toLowerCase()
    if (!nameTest(name)) continue
    for (const row of p.values || []) {
      for (const cell of row) {
        const n = parseFloat(String(cell).replace(/[^0-9.+-]/g, ''))
        if (!Number.isNaN(n)) sum += n
      }
    }
  }
  return sum
}

function energyShieldTotal(item) {
  const fromProp = propertyNumberMatch(item, n =>
    n.includes('energy shield') && !n.includes('recharge') && !n.includes('delay'))
  const text = allModText(item)
  const fromMods = sumRegexGlobal(text, /\+(\d+) to maximum Energy Shield/g)
  const tripleLME = sumRegexGlobal(text, /\+(\d+) to maximum Life, Mana and Energy Shield/g)
  return fromProp + fromMods + tripleLME
}

function evasionTotal(item) {
  return propertyNumberMatch(item, n => n.includes('evasion') && n.includes('rating'))
}

function blockTotal(item) {
  const fromProp = propertyNumberMatch(item, n =>
    n.includes('chance to block'))
  const text = allModText(item)
  const fromMods = sumRegexGlobal(text, /\+?(\d+(?:\.\d+)?)% Chance to Block/g)
  return fromProp + fromMods
}

function lifeFromMods(item) {
  const text = allModText(item)
  let sum = sumRegexGlobal(text, /\+(\d+) to maximum Life, Mana and Energy Shield/g)
  sum += sumRegexGlobal(text, /\+(\d+) to maximum Life(?!\s*,\s*Mana)/g)
  return sum
}

function manaFromMods(item) {
  const text = allModText(item)
  let sum = sumRegexGlobal(text, /\+(\d+) to maximum Life, Mana and Energy Shield/g)
  sum += sumRegexGlobal(text, /\+(\d+) to maximum Mana(?!\s*,\s*Life)/g)
  return sum
}

function attrFromMods(item, attr) {
  const { str, dex, int } = attributesFromMods(allModText(item))
  if (attr === 'str') return str
  if (attr === 'dex') return dex
  return int
}

function accuracyFromMods(item) {
  return sumRegexGlobal(allModText(item), /\+(\d+) to Accuracy Rating/g)
}

function attackSpeedIncreased(item) {
  return sumRegexGlobal(allModText(item), /(\d+(?:\.\d+)?)% increased Attack Speed/g)
}

function castSpeedIncreased(item) {
  return sumRegexGlobal(allModText(item), /(\d+(?:\.\d+)?)% increased Cast Speed/g)
}

function rarityRank(item) {
  return RARITY_RANK[item.rarity] ?? 0
}

/** Lower = earlier in sync (stash tab order, then grid order, then characters). */
export function stashOrderValue(item) {
  if (typeof item._syncOrder === 'number' && !Number.isNaN(item._syncOrder)) {
    return item._syncOrder
  }
  const loc = item.location || {}
  if (loc.type === 'stash') {
    const tab = loc.tabIndex ?? 0
    const y = loc.gridPos?.y ?? 0
    const x = loc.gridPos?.x ?? 0
    return tab * 1e9 + y * 1e4 + x
  }
  const name = String(loc.characterName || '')
  const slot = String(loc.slot || '')
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return 5e15 + (Math.abs(h) % 1e12) + slot.charCodeAt(0) * 1e6
}

export function getSortValue(item, sortKey) {
  const text = allModText(item)
  const res = resistancesFromMods(text)

  switch (sortKey) {
    case 'stash':
      return stashOrderValue(item)
    case 'maxLife':
      return lifeFromMods(item)
    case 'energyShield':
      return energyShieldTotal(item)
    case 'fireRes':
      return res.fire
    case 'coldRes':
      return res.cold
    case 'lightRes':
      return res.lightning
    case 'chaosRes':
      return res.chaos
    case 'totalEleRes':
      return res.totalEle
    case 'totalAllRes':
      return res.totalAll
    case 'accuracy':
      return accuracyFromMods(item)
    case 'evasion':
      return evasionTotal(item)
    case 'str':
      return attrFromMods(item, 'str')
    case 'dex':
      return attrFromMods(item, 'dex')
    case 'int':
      return attrFromMods(item, 'int')
    case 'maxMana':
      return manaFromMods(item)
    case 'block':
      return blockTotal(item)
    case 'rarity':
      return rarityRank(item)
    case 'attackSpeed':
      return attackSpeedIncreased(item)
    case 'castSpeed':
      return castSpeedIncreased(item)
    default:
      return stashOrderValue(item)
  }
}

export const SORT_OPTIONS = [
  { key: 'stash', label: 'Stash order' },
  { key: 'maxLife', label: 'Max Life (flat on item)' },
  { key: 'energyShield', label: 'Energy Shield' },
  { key: 'fireRes', label: 'Fire resistance' },
  { key: 'coldRes', label: 'Cold resistance' },
  { key: 'lightRes', label: 'Lightning resistance' },
  { key: 'chaosRes', label: 'Chaos resistance' },
  { key: 'totalEleRes', label: 'Total elemental res' },
  { key: 'totalAllRes', label: 'Total all res' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'evasion', label: 'Evasion' },
  { key: 'str', label: 'Strength (incl. all Attr)' },
  { key: 'dex', label: 'Dexterity (incl. all Attr)' },
  { key: 'int', label: 'Intelligence (incl. all Attr)' },
  { key: 'maxMana', label: 'Max Mana' },
  { key: 'block', label: 'Block %' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'attackSpeed', label: 'Attack speed (% inc.)' },
  { key: 'castSpeed', label: 'Cast speed (% inc.)' }
]

export function sortItemsList(items, sortKey, descending) {
  return [...items].sort((a, b) => {
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    const na = Number.isFinite(va) ? va : 0
    const nb = Number.isFinite(vb) ? vb : 0
    let cmp = 0
    if (na < nb) cmp = -1
    else if (na > nb) cmp = 1
    if (descending) cmp = -cmp
    if (cmp !== 0) return cmp
    return stashOrderValue(a) - stashOrderValue(b)
  })
}