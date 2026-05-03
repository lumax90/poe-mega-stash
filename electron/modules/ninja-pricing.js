/**
 * Unofficial poe.ninja PoE1 economy API → chaos → divine.
 * Rare/magic items are not priced (rolls unknown).
 *
 * Legacy URLs (/api/data/currencyoverview, itemoverview) return 404 as of 2025+;
 * data lives under /poe1/api/economy/exchange/… and /poe1/api/economy/stash/….
 */

const ORIGIN = 'https://poe.ninja'

const EXCHANGE_OVERVIEW = `${ORIGIN}/poe1/api/economy/exchange/current/overview`

const STASH_ITEM_OVERVIEW = `${ORIGIN}/poe1/api/economy/stash/current/item/overview`

const EXCHANGE_TYPES = ['Currency', 'Fragment']

const STASH_ITEM_TYPES = [
  'Oil',
  'Incubator',
  'Invitation',
  'Scarab',
  'SkillGem',
  'UniqueWeapon',
  'UniqueArmour',
  'UniqueAccessory',
  'UniqueJewel',
  'UniqueFlask',
  'UniqueMap',
  'UniqueShield',
  'UniqueOther',
  'DivinationCard',
  'Map',
  'Fossil',
  'Essence',
  'Artifact',
  'UniqueSentinel',
  'UniqueRelic',
  'Runegraft',
  'Memories'
]

const CACHE_TTL_MS = 45 * 60 * 1000

/** Max priced rows returned to UI / persisted (sorted by value, highest first). */
const PRICED_LINES_CAP = 450

const UA = 'PoE-Mega-Stash/1.0 (wealth estimate; contact via app settings)'

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** poe.ninja expects league display names (e.g. Standard). All-lowercase slugs return empty data. */
function leagueForNinjaQuery(league) {
  const s = String(league || 'Standard').trim() || 'Standard'
  if (s !== s.toLowerCase()) return s
  return s
    .split(/\s+/)
    .map((w) => {
      if (/^\d/.test(w)) return w
      if (/^\([^)]+\)$/.test(w)) return w
      if (w.length <= 4 && w === w.toUpperCase()) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function ingestExchangeOverview(data, chaosByKey) {
  if (!data?.lines?.length || !Array.isArray(data.items)) return
  const idToName = new Map()
  for (const it of data.items) {
    if (it?.id != null && it.name) idToName.set(it.id, it.name)
  }
  for (const line of data.lines) {
    const name = idToName.get(line.id)
    const pv = line.primaryValue
    if (!name || pv == null || Number.isNaN(Number(pv))) continue
    const k = norm(name)
    if (!k) continue
    if (!chaosByKey.has(k)) chaosByKey.set(k, Number(pv))
  }
}

/**
 * Stash overview lines include many variants per gem name; keep minimum chaos per label
 * so a random roll is not priced at the top variant.
 */
function ingestStashItemOverview(data, chaosByKey) {
  if (!Array.isArray(data?.lines)) return
  for (const line of data.lines) {
    const name = line.name
    const cv = line.chaosValue
    if (!name || cv == null || !Number.isFinite(Number(cv))) continue
    const chaos = Number(cv)
    if (chaos <= 0) continue
    const k = norm(name)
    if (!k) continue
    const prev = chaosByKey.get(k)
    if (prev == null || chaos < prev) chaosByKey.set(k, chaos)
  }
}

/**
 * User overrides: divineTotal = Divine for the whole stack (persists; never replaced by ninja refresh).
 * @param {Record<string, { divineTotal?: number }>} overrides
 */
function computeItemStackValue(item, chaosByKey, divineChaos, overrides) {
  const stack = Math.max(1, parseInt(item.stackSize, 10) || 1)
  const oid = item.id != null ? String(item.id) : ''
  const ov = oid ? overrides[oid] : null

  if (
    ov &&
    ov.divineTotal != null &&
    Number.isFinite(Number(ov.divineTotal)) &&
    Number(ov.divineTotal) >= 0
  ) {
    const dt = Number(ov.divineTotal)
    const label = ((item.name || '').trim() || item.typeLine || item.baseType || 'Item').slice(0, 120)
    return { kind: 'manual', chaosTotal: dt * divineChaos, label }
  }

  const r = item.rarity
  if (r === 'rare') return { kind: 'skipped_rare', chaosTotal: null, label: null }
  if (r === 'magic') return { kind: 'skipped_magic', chaosTotal: null, label: null }

  if (r === 'currency') {
    const label = item.typeLine || item.baseType || item.name
    const ce = chaosByKey.get(norm(label))
    if (ce != null) return { kind: 'ninja', chaosTotal: ce * stack, label: String(label).slice(0, 120) }
    return { kind: 'unknown', chaosTotal: null, label: null }
  }

  if (r === 'unique' || r === 'foil') {
    const label = ((item.name || '').trim() || item.typeLine || item.baseType).slice(0, 120)
    let ce = chaosByKey.get(norm(label))
    if (ce == null && item.typeLine) ce = chaosByKey.get(norm(item.typeLine))
    if (ce != null) return { kind: 'ninja', chaosTotal: ce * stack, label }
    return { kind: 'unknown', chaosTotal: null, label: null }
  }

  if (r === 'gem') {
    const label = (item.typeLine || item.baseType || item.name).slice(0, 120)
    const ce = chaosByKey.get(norm(item.typeLine || item.baseType || item.name))
    if (ce != null) return { kind: 'ninja', chaosTotal: ce * stack, label }
    return { kind: 'unknown', chaosTotal: null, label: null }
  }

  if (r === 'divination') {
    const label = (item.typeLine || item.baseType || item.name).slice(0, 120)
    const ce = chaosByKey.get(norm(item.typeLine || item.baseType || item.name))
    if (ce != null) return { kind: 'ninja', chaosTotal: ce * stack, label }
    return { kind: 'unknown', chaosTotal: null, label: null }
  }

  if (r === 'normal') {
    const tl = item.typeLine || ''
    const bt = item.baseType || ''
    if (/\bmap\b/i.test(tl) || /\bmap\b/i.test(bt)) {
      let ce = chaosByKey.get(norm(tl))
      if (ce == null) ce = chaosByKey.get(norm(bt))
      const lab = (tl || bt).slice(0, 120)
      if (ce != null) return { kind: 'ninja', chaosTotal: ce * stack, label: lab }
      return { kind: 'unknown', chaosTotal: null, label: null }
    }
    return { kind: 'skipped_other', chaosTotal: null, label: null }
  }

  return { kind: 'skipped_other', chaosTotal: null, label: null }
}

class NinjaPricing {
  constructor() {
    /** @type {Map<string, { at: number, chaosByKey: Map<string, number>, divineChaos: number, leagueQuery: string }>} */
    this.cache = new Map()
  }

  async load(league) {
    const leagueQuery = leagueForNinjaQuery(league)
    const hit = this.cache.get(leagueQuery)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit

    const chaosByKey = new Map()
    const leagueParam = encodeURIComponent(leagueQuery)

    const urls = [
      ...EXCHANGE_TYPES.map(
        (t) => `${EXCHANGE_OVERVIEW}?league=${leagueParam}&type=${encodeURIComponent(t)}`
      ),
      ...STASH_ITEM_TYPES.map(
        (t) => `${STASH_ITEM_OVERVIEW}?league=${leagueParam}&type=${encodeURIComponent(t)}`
      )
    ]

    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
          if (!res.ok) return
          const data = await res.json()
          if (url.includes('/exchange/')) ingestExchangeOverview(data, chaosByKey)
          else ingestStashItemOverview(data, chaosByKey)
        } catch {
          /* ignore single endpoint failures */
        }
      })
    )

    let divineChaos = chaosByKey.get(norm('Divine Orb'))
    if (!divineChaos || divineChaos <= 0) divineChaos = 200

    const payload = {
      at: Date.now(),
      chaosByKey,
      divineChaos,
      leagueQuery
    }
    this.cache.set(leagueQuery, payload)
    return payload
  }

  async estimateStash(items, league, overrides = {}) {
    const leaguePassThrough = league || 'Standard'
    const { chaosByKey, divineChaos } = await this.load(leaguePassThrough)

    let totalChaos = 0
    let countedItems = 0
    let skippedRare = 0
    let skippedMagic = 0
    let skippedOther = 0
    let unknownItems = 0
    /** @type {{ label: string, chaos: number, itemId: string | null }[]} */
    const contributions = []

    const totalItems = items.length

    for (const item of items) {
      const res = computeItemStackValue(item, chaosByKey, divineChaos, overrides)
      const idStr = item.id != null ? String(item.id) : null

      if (res.kind === 'manual' || res.kind === 'ninja') {
        totalChaos += res.chaosTotal
        countedItems++
        contributions.push({
          label: res.label,
          chaos: res.chaosTotal,
          itemId: idStr
        })
        continue
      }

      if (res.kind === 'skipped_rare') {
        skippedRare++
        continue
      }
      if (res.kind === 'skipped_magic') {
        skippedMagic++
        continue
      }
      if (res.kind === 'skipped_other') {
        skippedOther++
        continue
      }
      if (res.kind === 'unknown') {
        unknownItems++
        continue
      }

      skippedOther++
    }

    contributions.sort((a, b) => b.chaos - a.chaos)
    const mapRow = (x) => ({
      itemId: x.itemId,
      label: x.label,
      chaos: Math.round(x.chaos * 100) / 100,
      divine: Math.round((x.chaos / divineChaos) * 100) / 100
    })
    const topItems = contributions.slice(0, 25).map(mapRow)
    const pricedLines = contributions.slice(0, PRICED_LINES_CAP).map(mapRow)

    const totalDivine = totalChaos / divineChaos

    return {
      ts: Date.now(),
      league: leaguePassThrough,
      divineChaosRate: Math.round(divineChaos * 100) / 100,
      totalChaos: Math.round(totalChaos * 100) / 100,
      totalDivine: Math.round(totalDivine * 100) / 100,
      totalItems,
      countedItems,
      skippedRare,
      skippedMagic,
      skippedOther,
      unknownItems,
      topItems,
      pricedLines,
      source: 'poe.ninja',
      priceKeysLoaded: chaosByKey.size
    }
  }

  async estimateOneItem(item, league, overrides = {}) {
    const leaguePassThrough = league || 'Standard'
    const { chaosByKey, divineChaos } = await this.load(leaguePassThrough)
    const res = computeItemStackValue(item, chaosByKey, divineChaos, overrides)
    const chaosTotal =
      res.chaosTotal != null && Number.isFinite(res.chaosTotal)
        ? Math.round(res.chaosTotal * 100) / 100
        : null
    const divineTotal =
      chaosTotal != null ? Math.round((chaosTotal / divineChaos) * 100) / 100 : null
    const suggestTradeSearch =
      res.kind === 'skipped_rare' ||
      res.kind === 'skipped_magic' ||
      res.kind === 'unknown'

    return {
      kind: res.kind,
      label: res.label,
      chaosTotal,
      divineTotal,
      divineRate: Math.round(divineChaos * 100) / 100,
      league: leaguePassThrough,
      suggestTradeSearch
    }
  }
}

module.exports = { NinjaPricing, norm, leagueForNinjaQuery }
