/**
 * Map stash item mod lines → official trade API stat_filters using GGG /api/trade/data/stats.
 * Matcher prefers the correct bucket (implicit / explicit / fractured / crafted / enchant).
 */

const fs = require('fs').promises
const path = require('path')

const TRADE_STATS_URL = 'https://www.pathofexile.com/api/trade/data/stats'
const CACHE_FILENAME = 'trade-data-stats.json'
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24
const MAX_STAT_FILTERS = 18

const BUCKET_TO_GROUP = {
  implicit: 'implicit',
  explicit: 'explicit',
  fractured: 'fractured',
  crafted: 'crafted',
  enchant: 'enchant'
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeModLine(line) {
  return String(line || '')
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*\((?:crafted|fractured|implicit|enchanted|augmented)\)\s*$/gi, '')
    .trim()
}

function templateToRegex(template) {
  const t = String(template).replace(/\r\n/g, '\n')
  const parts = t.split('#')
  const num = '([+\\u2212\\-]?\\d+(?:\\.\\d+)?)'
  let body = ''
  for (let i = 0; i < parts.length; i++) {
    body += escapeRegex(parts[i])
    if (i < parts.length - 1) body += num
  }
  return new RegExp(`^${body}$`, 'i')
}

function clampPct(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 10
  return Math.min(80, Math.max(0, x))
}

/** Lower bound only: offset 0 → min = rolled value; offset 10 → min = floor(v × 0.9). No max cap. */
function minRollFloor(value, offsetPct) {
  const v = Number(value)
  if (!Number.isFinite(v)) return null
  const p = clampPct(offsetPct) / 100
  return Math.floor(v * (1 - p))
}

function compileMatchers(statsJson) {
  const allowed = new Set(Object.keys(BUCKET_TO_GROUP))
  const matchersByGroup = {}
  for (const g of statsJson.result || []) {
    if (!allowed.has(g.id)) continue
    const list = []
    for (const e of g.entries || []) {
      if (!e?.text || e.option) continue
      const hashCount = (e.text.match(/#/g) || []).length
      if (hashCount > 2) continue
      try {
        list.push({
          id: e.id,
          hashCount,
          regex: templateToRegex(e.text),
          textLen: e.text.length
        })
      } catch {
        /* skip broken template */
      }
    }
    list.sort((a, b) => b.textLen - a.textLen || b.hashCount - a.hashCount)
    matchersByGroup[g.id] = list
  }
  return matchersByGroup
}

let compiledForPath = ''

/** @type {Record<string, Array<{ id: string, hashCount: number, regex: RegExp, textLen: number }>> | null} */
let matchersByGroupCache = null

async function ensureTradeStats(cacheDir, userAgent) {
  if (!cacheDir) throw new Error('cacheDir required')
  const fp = path.join(cacheDir, CACHE_FILENAME)
  let rawText
  try {
    const st = await fs.stat(fp)
    if (Date.now() - st.mtimeMs < CACHE_MAX_AGE_MS) {
      rawText = await fs.readFile(fp, 'utf8')
    }
  } catch {
    /* fetch */
  }
  if (!rawText) {
    const res = await fetch(TRADE_STATS_URL, {
      headers: {
        'User-Agent': userAgent || 'PoE-Mega-Stash/1.0',
        Accept: 'application/json'
      }
    })
    if (!res.ok) throw new Error(`trade stats HTTP ${res.status}`)
    rawText = await res.text()
    await fs.mkdir(cacheDir, { recursive: true }).catch(() => {})
    await fs.writeFile(fp, rawText, 'utf8')
  }
  if (compiledForPath !== fp || !matchersByGroupCache) {
    matchersByGroupCache = compileMatchers(JSON.parse(rawText))
    compiledForPath = fp
  }
  return matchersByGroupCache
}

function matchModLine(modLine, tradeGroup, matchersByGroup, rollOffsetPct) {
  const normalized = normalizeModLine(modLine)
  if (!normalized) return null
  const matchers = matchersByGroup[tradeGroup]
  if (!matchers?.length) return null

  for (const m of matchers) {
    const match = normalized.match(m.regex)
    if (!match) continue

    if (m.hashCount === 0) {
      return { id: m.id }
    }

    const nums = []
    for (let i = 1; i <= m.hashCount; i++) {
      nums.push(parseFloat(match[i]))
    }
    if (nums.some((x) => !Number.isFinite(x))) continue

    if (m.hashCount === 1) {
      const lo = minRollFloor(nums[0], rollOffsetPct)
      if (lo == null) continue
      return { id: m.id, value: { min: lo } }
    }

    const lo = minRollFloor(nums[0], rollOffsetPct)
    if (lo == null) continue
    return { id: m.id, value: { min: lo } }
  }
  return null
}

/**
 * @param {object} item parsed stash item (mods buckets)
 * @param {number} rollOffsetPct relax minimum thresholds only (0–80)
 * @param {Record<string, any>} matchersByGroup from ensureTradeStats
 */
function buildTradeStatFilters(item, rollOffsetPct, matchersByGroup) {
  const mods = item.mods || {}
  const order = [
    ['implicit', mods.implicit],
    ['explicit', mods.explicit],
    ['fractured', mods.fractured],
    ['crafted', mods.crafted],
    ['enchant', mods.enchant]
  ]
  const seen = new Set()
  const filters = []

  for (const [bucket, lines] of order) {
    const group = BUCKET_TO_GROUP[bucket]
    if (!Array.isArray(lines)) continue
    for (const line of lines) {
      if (filters.length >= MAX_STAT_FILTERS) break
      const hit = matchModLine(line, group, matchersByGroup, rollOffsetPct)
      if (!hit || seen.has(hit.id)) continue
      seen.add(hit.id)
      const f = { id: hit.id, disabled: false }
      if (hit.value && (hit.value.min != null || hit.value.max != null)) {
        f.value = {}
        if (hit.value.min != null) f.value.min = hit.value.min
        if (hit.value.max != null) f.value.max = hit.value.max
      }
      filters.push(f)
    }
    if (filters.length >= MAX_STAT_FILTERS) break
  }

  return filters
}

module.exports = {
  ensureTradeStats,
  buildTradeStatFilters,
  MAX_STAT_FILTERS
}
