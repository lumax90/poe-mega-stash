const { BrowserWindow, shell } = require('electron')
const crypto = require('crypto')
const http = require('http')
const url = require('url')

const POE_OAUTH = {
  authorizeUrl: 'https://www.pathofexile.com/oauth/authorize',
  tokenUrl: 'https://www.pathofexile.com/oauth/token',
  scopes: 'account:stashes account:characters',
  redirectUri: 'http://localhost:8337/oauth/callback',
  callbackPort: 8337
}

class OAuthManager {
  constructor(storage) {
    this.storage = storage
    this.accessToken = storage.getToken()
    this.refreshToken = storage.getRefreshToken()
    this.expiresAt = storage.getTokenExpiry()
  }

  getStatus() {
    const loggedIn = !!this.accessToken && Date.now() < (this.expiresAt || 0)
    return {
      loggedIn,
      accountName: this.storage.getAccountName()
    }
  }

  getAccessToken() {
    return this.accessToken
  }

  async ensureValidToken() {
    if (!this.accessToken) {
      throw new Error('Not logged in')
    }
    if (Date.now() >= (this.expiresAt || 0) - 60000) {
      // Token expired or about to expire, try refresh
      if (this.refreshToken) {
        await this.refreshAccessToken()
      } else {
        throw new Error('Token expired, please login again')
      }
    }
    return this.accessToken
  }

  async startAuthFlow() {
    const clientId = this.storage.getSettings().clientId
    const clientSecret = this.storage.getSettings().clientSecret

    if (!clientId) {
      return { success: false, error: 'Client ID not configured. Go to Settings.' }
    }

    // Generate PKCE
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')

    const state = crypto.randomBytes(16).toString('hex')

    return new Promise((resolve) => {
      // Start local callback server
      const server = http.createServer(async (req, res) => {
        const parsed = url.parse(req.url, true)

        if (parsed.pathname === '/oauth/callback') {
          const { code, state: returnedState, error } = parsed.query

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h2>Login failed. You can close this window.</h2></body></html>')
            server.close()
            resolve({ success: false, error })
            return
          }

          if (returnedState !== state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h2>State mismatch. Please try again.</h2></body></html>')
            server.close()
            resolve({ success: false, error: 'State mismatch' })
            return
          }

          try {
            // Exchange code for token
            const tokenData = await this.exchangeCode(code, codeVerifier, clientId, clientSecret)
            this.setTokens(tokenData)

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body style="background:#1a1a1a;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>✅ Login successful! You can close this window.</h2></body></html>')
            server.close()
            resolve({ success: true })
          } catch (err) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`<html><body><h2>Error: ${err.message}</h2></body></html>`)
            server.close()
            resolve({ success: false, error: err.message })
          }
        }
      })

      server.listen(POE_OAUTH.callbackPort, () => {
        // Build authorize URL
        const params = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          scope: POE_OAUTH.scopes,
          state: state,
          redirect_uri: POE_OAUTH.redirectUri,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })

        const authUrl = `${POE_OAUTH.authorizeUrl}?${params.toString()}`
        shell.openExternal(authUrl)
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close()
        resolve({ success: false, error: 'Login timed out' })
      }, 5 * 60 * 1000)
    })
  }

  async exchangeCode(code, codeVerifier, clientId, clientSecret) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: POE_OAUTH.redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier
    })

    if (clientSecret) {
      body.append('client_secret', clientSecret)
    }

    const response = await fetch(POE_OAUTH.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${text}`)
    }

    return await response.json()
  }

  async refreshAccessToken() {
    const clientId = this.storage.getSettings().clientId
    const clientSecret = this.storage.getSettings().clientSecret

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: clientId
    })

    if (clientSecret) {
      body.append('client_secret', clientSecret)
    }

    const response = await fetch(POE_OAUTH.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!response.ok) {
      this.logout()
      throw new Error('Token refresh failed, please login again')
    }

    const data = await response.json()
    this.setTokens(data)
  }

  setTokens(data) {
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token || this.refreshToken
    this.expiresAt = Date.now() + (data.expires_in * 1000)

    this.storage.saveToken(this.accessToken)
    this.storage.saveRefreshToken(this.refreshToken)
    this.storage.saveTokenExpiry(this.expiresAt)

    if (data.username) {
      this.storage.saveAccountName(data.username)
    }
  }

  logout() {
    this.accessToken = null
    this.refreshToken = null
    this.expiresAt = null
    this.storage.clearAuth()
  }
}

module.exports = { OAuthManager }
