/**
 * Build PoE official trade queries and obtain a web URL via POST /api/trade/search/:league
 */

const { ensureTradeStats, buildTradeStatFilters } = require('./trade-stat-matcher')

const TRADE_API = 'https://www.pathofexile.com/api/trade/search'
const TRADE_WEB = 'https://www.pathofexile.com/trade/search'

const TRADE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PoE-Mega-Stash/1.0'

const EMPTY_STATS = [{ type: 'and', filters: [] }]

function clampPct(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 10
  return Math.min(80, Math.max(0, x))
}

/** Gem level / quality: minimum floor only, relaxed by roll offset % */
function gemMinFloor(value, offsetPct) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const p = clampPct(offsetPct) / 100
  return Math.floor(n * (1 - p))
}

function parseGemLevel(item) {
  const fromProp = item.properties?.find((p) => /^level$/i.test(String(p.name || '').trim()))
  const raw = fromProp?.values?.[0]?.[0]
  const num = parseInt(String(raw).replace(/\D/g, ''), 10)
  return Number.isFinite(num) ? num : null
}

function gemQuality(item) {
  const q = item.quality
  if (q != null && Number.isFinite(Number(q)) && Number(q) > 0) return Number(q)
  const fromProp = item.properties?.find((p) => /^quality$/i.test(String(p.name || '').trim()))
  const raw = fromProp?.values?.[0]?.[0]
  const num = parseInt(String(raw).replace(/\D/g, ''), 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

/**
 * @returns {Promise<{ query: object, sort: object }>}
 */
async function buildTradeSearchBody(item, tradeOffsetPct, options = {}) {
  const off = clampPct(tradeOffsetPct)
  const query = {
    status: { option: 'available' },
    stats: EMPTY_STATS
  }
  const rarity = item.rarity

  if (rarity === 'currency') {
    query.type = item.typeLine || item.baseType || item.name
    return { query, sort: { price: 'asc' } }
  }

  if (rarity === 'divination') {
    query.type = item.typeLine || item.baseType || item.name
    return { query, sort: { price: 'asc' } }
  }

  if (rarity === 'gem') {
    query.type = item.typeLine || item.baseType || item.name
    const misc = {}
    const gl = parseGemLevel(item)
    if (gl != null) {
      const lo = gemMinFloor(gl, off)
      if (lo != null) misc.gem_level = { min: Math.max(1, lo) }
    }
    const qual = gemQuality(item)
    if (qual != null) {
      const lo = gemMinFloor(qual, off)
      if (lo != null) misc.quality = { min: Math.max(0, lo) }
    }
    if (item.corrupted) misc.corrupted = { option: 'true' }
    if (Object.keys(misc).length) query.filters = { misc_filters: { filters: misc } }
    return { query, sort: { price: 'asc' } }
  }

  if (rarity === 'unique' || rarity === 'foil') {
    query.filters = {
      type_filters: { filters: { rarity: { option: 'unique' } } }
    }
    return { query, sort: { price: 'asc' } }
  }

  if (rarity === 'rare' || rarity === 'magic') {
    const rarityOpt = rarity === 'magic' ? 'magic' : 'rare'
    const filters = {
      type_filters: { filters: { rarity: { option: rarityOpt } } }
    }
    const misc = {}
    if (item.corrupted) misc.corrupted = { option: 'true' }
    if (item.identified === false) misc.identified = { option: 'false' }
    if (Object.keys(misc).length) filters.misc_filters = { filters: misc }
    if (item.sockets?.maxLink >= 5) {
      filters.socket_filters = { filters: { links: { min: item.sockets.maxLink } } }
    }
    query.filters = filters

    if (options.statsCacheDir) {
      try {
        const matchers = await ensureTradeStats(options.statsCacheDir, TRADE_UA)
        const statFilters = buildTradeStatFilters(item, off, matchers)
        if (statFilters.length) {
          query.stats = [{ type: 'and', filters: statFilters }]
        }
      } catch (err) {
        console.warn('[trade-search] stat filters skipped:', err.message)
      }
    }

    return { query, sort: { price: 'asc' } }
  }

  if (rarity === 'normal') {
    const tl = item.typeLine || ''
    const bt = item.baseType || ''
    if (/\bmap\b/i.test(tl) || /\bmap\b/i.test(bt)) {
      query.type = tl || bt
      return { query, sort: { price: 'asc' } }
    }
  }

  query.type = item.baseType || item.typeLine || 'Item'
  return { query, sort: { price: 'asc' } }
}

async function createTradeSearchUrl(league, item, tradeOffsetPct, options = {}) {
  const leagueStr = String(league || 'Standard').trim() || 'Standard'
  const leagueEnc = encodeURIComponent(leagueStr)
  const body = await buildTradeSearchBody(item, tradeOffsetPct, options)
  const apiUrl = `${TRADE_API}/${leagueEnc}`

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': TRADE_UA
    },
    body: JSON.stringify(body)
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Trade API returned non-JSON (${res.status})`)
  }

  if (!res.ok || data.error) {
    const msg = data?.error?.message || data?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  if (!data.id) throw new Error('Trade API did not return search id')

  return `${TRADE_WEB}/${leagueEnc}/${data.id}`
}

module.exports = {
  buildTradeSearchBody,
  createTradeSearchUrl,
  clampPct
}
