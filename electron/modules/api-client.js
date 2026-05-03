const API_BASE = 'https://api.pathofexile.com'
/** Public league list (same ids as stash/trade). No OAuth. Cached in-process. */
const TRADE_LEAGUES_URL = 'https://www.pathofexile.com/api/trade/data/leagues'
const TRADE_LEAGUES_TTL_MS = 60 * 60 * 1000

let tradeLeaguesCache = { at: 0, list: null }

// Rate limiting: max ~30 requests per minute
const REQUEST_DELAY_MS = 2100 // ~28 requests/minute to be safe

class ApiClient {
  constructor(oauth, storage) {
    this.oauth = oauth
    this.storage = storage
    this.lastRequestTime = 0
  }

  async request(endpoint, options = {}, isLegacy = false) {
    const settings = this.storage.getSettings()
    const useSessId = !!settings.poeSessId

    let url
    let headers = { ...options.headers }

    if (useSessId) {
      if (!isLegacy) throw new Error("Endpoint not supported in legacy mode")
      url = `https://www.pathofexile.com${endpoint}`
      headers['Cookie'] = `POESESSID=${settings.poeSessId}`
      headers['User-Agent'] = `PoE-Item-Finder/1.0.0 (contact: ${settings.contactEmail || 'unknown'})`
    } else {
      if (isLegacy) throw new Error("Endpoint not supported in OAuth mode")
      const token = await this.oauth.ensureValidToken()
      url = `https://api.pathofexile.com${endpoint}`
      headers['Authorization'] = `Bearer ${token}`
      headers['User-Agent'] = `OAuth ${settings.clientId || 'poe-item-finder'}/1.0.0 (contact: ${settings.contactEmail || 'unknown'})`
    }

    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
      await this.sleep(REQUEST_DELAY_MS - timeSinceLastRequest)
    }
    this.lastRequestTime = Date.now()

    const response = await fetch(url, { ...options, headers })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000
      console.log(`Rate limited. Waiting ${waitMs}ms...`)
      await this.sleep(waitMs)
      return this.request(endpoint, options, isLegacy)
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API Error ${response.status}: ${text}`)
    }

    return await response.json()
  }

  async getStashList(league) {
    const settings = this.storage.getSettings()
    if (settings.poeSessId) {
      if (!settings.accountName) throw new Error("Account Name required for POESESSID mode")
      const data = await this.request(`/character-window/get-stash-items?league=${encodeURIComponent(league)}&tabs=1&tabIndex=0&accountName=${encodeURIComponent(settings.accountName)}`, {}, true)
      return data.tabs || []
    } else {
      const data = await this.request(`/stash/${encodeURIComponent(league)}`)
      return data.stashes || data.tabs || data || []
    }
  }

  async getStashTab(league, tabIdOrIndex) {
    const settings = this.storage.getSettings()
    if (settings.poeSessId) {
      // In legacy mode, tabId is actually the tabIndex
      const data = await this.request(`/character-window/get-stash-items?league=${encodeURIComponent(league)}&tabs=0&tabIndex=${tabIdOrIndex}&accountName=${encodeURIComponent(settings.accountName)}`, {}, true)
      return data
    } else {
      return await this.request(`/stash/${encodeURIComponent(league)}/${encodeURIComponent(tabIdOrIndex)}`)
    }
  }

  async getCharacters() {
    const settings = this.storage.getSettings()
    if (settings.poeSessId) {
      return await this.request('/character-window/get-characters', {}, true)
    } else {
      const data = await this.request('/character')
      return data.characters || data || []
    }
  }

  async getCharacterItems(characterName) {
    const settings = this.storage.getSettings()
    if (settings.poeSessId) {
      const data = await this.request(`/character-window/get-items?character=${encodeURIComponent(characterName)}&accountName=${encodeURIComponent(settings.accountName)}`, {}, true)
      return data
    } else {
      return await this.request(`/character/${encodeURIComponent(characterName)}`)
    }
  }

  /**
   * PC realm leagues from official trade data endpoint (`result[].id` matches stash `league` param).
   */
  async getLeaguesTradePc() {
    if (tradeLeaguesCache.list && Date.now() - tradeLeaguesCache.at < TRADE_LEAGUES_TTL_MS) {
      return tradeLeaguesCache.list
    }
    const settings = this.storage.getSettings()
    const ua = settings.poeSessId
      ? `PoE-Item-Finder/1.0.0 (contact: ${settings.contactEmail || 'unknown'})`
      : `OAuth ${settings.clientId || 'poe-item-finder'}/1.0.0 (contact: ${settings.contactEmail || 'unknown'})`
    const response = await fetch(TRADE_LEAGUES_URL, {
      headers: { 'User-Agent': ua }
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Leagues ${response.status}: ${text.slice(0, 200)}`)
    }
    const json = await response.json()
    const rows = json.result || []
    const seen = new Set()
    const pc = []
    for (const r of rows) {
      if (r.realm !== 'pc' || !r.id || seen.has(r.id)) continue
      seen.add(r.id)
      pc.push({ id: r.id, text: r.text || r.id })
    }
    tradeLeaguesCache = { at: Date.now(), list: pc }
    return pc
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = { ApiClient }
