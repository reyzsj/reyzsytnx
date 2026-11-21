// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 21 November 2026
// 🍂 Function : AM Prem Verifier (am-premiumms.ai.studio) Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Murni endpoint asli: /api/stats, /api/send-link, /api/verify-link.
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE_URL = 'https://am-premiumms.ai.studio'
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
}

let cachedPayloadKeys = null

function cleanUrl(url = '') {
  return String(url || '')
    .replace(/&amp;/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/[.,;)'"<>\\\s]+$/, '')
    .trim()
}

function parseLinkTokens(cleanedLink) {
  let oobCode = ''
  let apiKey = ''
  let innerLink = ''
  try {
    const outer = new URL(cleanedLink)
    oobCode = outer.searchParams.get('oobCode') || ''
    apiKey = outer.searchParams.get('apiKey') || ''
    const nested = outer.searchParams.get('link')
    if (nested && nested.startsWith('http')) {
      innerLink = nested
      const inner = new URL(nested)
      if (!oobCode) oobCode = inner.searchParams.get('oobCode') || ''
      if (!apiKey) apiKey = inner.searchParams.get('apiKey') || ''
    }
  } catch (_) {}
  return { oobCode, apiKey, innerLink }
}

async function fetchJson(endpoint, { method = 'GET', body = null } = {}) {
  const headers = { ...BROWSER_HEADERS }
  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(TIMEOUT)
  }
  if (body !== null) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, options)
  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch (_) {}

  return { ok: res.ok, status: res.status, data, rawText }
}

function extractKeysNearRoute(sourceCode, routePath) {
  const idx = sourceCode.indexOf(routePath)
  if (idx === -1) return []
  const snippet = sourceCode.slice(idx, idx + 700)
  const bodyMatch = snippet.match(/JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/)
  if (!bodyMatch?.[1]) return []

  const keys = []
  for (const part of bodyMatch[1].split(',')) {
    const keyMatch = part.trim().match(/^["']?([a-zA-Z0-9_$]+)["']?(?:\s*:|$)/)
    if (keyMatch?.[1]) keys.push(keyMatch[1])
  }
  return keys
}

/**
 * Memindai Next.js chunks untuk mendeteksi key JSON /api/send-link & /api/verify-link
 * @param {boolean} [force=false]
 */
export async function scanNextJsPayloadKeys(force = false) {
  if (cachedPayloadKeys && !force) return cachedPayloadKeys

  const result = { sendKeys: [], verifyKeys: [], scannedChunks: 0 }
  try {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) return result
    const html = await res.text()

    result.sendKeys = extractKeysNearRoute(html, '/api/send-link')
    result.verifyKeys = extractKeysNearRoute(html, '/api/verify-link')

    if (result.sendKeys.length === 0 || result.verifyKeys.length === 0) {
      const chunkSet = new Set()
      const chunkRgx = /\/_next\/static\/chunks\/[^"'\s<>)]+\.js/g
      let m
      while ((m = chunkRgx.exec(html)) !== null) chunkSet.add(`${BASE_URL}${m[0]}`)

      const chunks = Array.from(chunkSet).sort((a, b) => {
        const score = (u) => (/app\/page|pages\/index|page-/i.test(u) ? 0 : 1)
        return score(a) - score(b)
      }).slice(0, 12)

      for (const chunkUrl of chunks) {
        try {
          const cRes = await fetch(chunkUrl, {
            headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
            signal: AbortSignal.timeout(10_000)
          })
          if (!cRes.ok) continue
          const code = await cRes.text()
          result.scannedChunks++

          if (result.sendKeys.length === 0) result.sendKeys = extractKeysNearRoute(code, '/api/send-link')
          if (result.verifyKeys.length === 0) result.verifyKeys = extractKeysNearRoute(code, '/api/verify-link')
          if (result.sendKeys.length > 0 && result.verifyKeys.length > 0) break
        } catch (_) {}
      }
    }
  } catch (_) {}

  cachedPayloadKeys = result
  return result
}

function buildVerifyPayload(targetLink, cleanEmail, detectedKeys = []) {
  const { oobCode, apiKey } = parseLinkTokens(targetLink)
  const payload = {
    email: cleanEmail,
    gmail: cleanEmail,
    link: targetLink,
    url: targetLink,
    emailLink: targetLink,
    verifyLink: targetLink,
    verificationLink: targetLink,
    magicLink: targetLink,
    signInLink: targetLink,
    authLink: targetLink,
    firebaseLink: targetLink,
    email_link: targetLink,
    verify_link: targetLink,
    ...(oobCode ? { oobCode, code: oobCode } : {}),
    ...(apiKey ? { apiKey } : {})
  }

  for (const key of detectedKeys) {
    if (/oob/i.test(key) && oobCode) payload[key] = oobCode
    else if (/apikey/i.test(key) && apiKey) payload[key] = apiKey
    else if (/link|url|href|verif|magic|auth|sign|action/i.test(key)) payload[key] = targetLink
    else if (/mail|gmail|user|akun|account/i.test(key)) payload[key] = cleanEmail
  }
  return payload
}

/**
 * Mengambil statistik verifikasi server (/api/stats)
 */
export async function getStats() {
  const r = await fetchJson('/api/stats')
  if (!r.ok) throw new Error(`API Error HTTP ${r.status}: ${r.data?.error || r.rawText.slice(0, 120)}`)
  return r.data
}

/**
 * Mengirim link verifikasi Alight Motion ke alamat email (/api/send-link)
 * @param {string} email - Alamat email / Gmail tujuan
 */
export async function sendAmLink(email) {
  const cleanEmail = String(email || '').trim()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Alamat email tujuan tidak valid!')
  }

  const { sendKeys } = await scanNextJsPayloadKeys()
  const body = { email: cleanEmail }
  for (const k of sendKeys) {
    if (/mail|gmail|user|akun|account/i.test(k)) body[k] = cleanEmail
  }

  const r = await fetchJson('/api/send-link', { method: 'POST', body })
  if (!r.ok || r.data?.success === false) {
    throw new Error(`API Error HTTP ${r.status}: ${r.data?.message || r.data?.error || r.rawText.slice(0, 160)}`)
  }
  return r.data ?? r.rawText
}

/**
 * Memverifikasi link Firebase Alight Motion (/api/verify-link)
 * @param {string} link - URL verifikasi dari inbox email
 * @param {string} email - Konfirmasi alamat Email/Gmail penerima link
 */
export async function verifyAmLink(link, email) {
  const cleanedLink = cleanUrl(link)
  const cleanEmail = String(email || '').trim()
  if (!cleanedLink || !cleanedLink.startsWith('http')) {
    throw new Error('URL verifikasi Alight Motion tidak valid!')
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Konfirmasi Email/Gmail wajib diisi untuk verifikasi!')
  }

  const { verifyKeys } = await scanNextJsPayloadKeys()
  const { innerLink } = parseLinkTokens(cleanedLink)
  const candidates = innerLink ? [cleanedLink, innerLink] : [cleanedLink]

  let lastErr = ''
  for (const candidateUrl of candidates) {
    const r = await fetchJson('/api/verify-link', {
      method: 'POST',
      body: buildVerifyPayload(candidateUrl, cleanEmail, verifyKeys)
    })

    if (r.ok && r.data?.success !== false) {
      return {
        ...(typeof r.data === 'object' ? r.data : { result: r.rawText }),
        confirmedEmail: cleanEmail
      }
    }
    lastErr = `API Error HTTP ${r.status}: ${r.data?.message || r.data?.error || r.rawText.slice(0, 160)}`
  }

  throw new Error(lastErr || 'Gagal memverifikasi tautan.')
}

export default {
  scanNextJsPayloadKeys,
  getStats,
  sendAmLink,
  verifyAmLink
}
