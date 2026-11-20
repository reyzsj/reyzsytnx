// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : AbeeCloud AM Premium + TempMail Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Auto-Detect JSON Keys /api/verify-link + Multi-Alias Payload + Konfirmasi Email.
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'
import crypto from 'node:crypto'

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE_URL = 'https://abeecloud.vercel.app'
const CATCHMAIL_API = 'https://api.catchmail.io/api/v1'
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let cachedVerifyKeys = null

function sanitizeUsername(name = '') {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32)
}

function normalizeMailText(raw = '') {
  let text = String(raw || '')
  if (/=3D/i.test(text)) {
    text = text
      .replace(/=\r?\n/g, '')
      .replace(/=3D/gi, '=')
      .replace(/=26/gi, '&')
  }
  return text
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
}

function cleanExtractedUrl(url = '') {
  return normalizeMailText(url)
    .replace(/[.,;)'"<>\\\s]+$/, '')
    .trim()
}

function collectStrings(value, out = []) {
  if (!value) return out
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
  } else if (typeof value === 'object') {
    const priorityKeys = ['html', 'text', 'body', 'content', 'message', 'data']
    for (const k of priorityKeys) {
      if (k in value) collectStrings(value[k], out)
    }
    for (const [k, v] of Object.entries(value)) {
      if (!priorityKeys.includes(k)) collectStrings(v, out)
    }
  }
  return out
}

function parseLinkTokens(cleanLink) {
  let oobCode = ''
  let apiKey = ''
  let innerLink = ''
  try {
    const outer = new URL(cleanLink)
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

async function fetchJson(fullUrl, { method = 'GET', body = null, headers = {} } = {}) {
  const finalHeaders = { ...BROWSER_HEADERS, ...headers }
  const options = {
    method,
    headers: finalHeaders,
    signal: AbortSignal.timeout(TIMEOUT)
  }
  if (body !== null) {
    finalHeaders['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const res = await fetch(fullUrl, options)
  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch (_) {}

  return { ok: res.ok, status: res.status, data, rawText }
}

async function detectVerifyPayloadKeys() {
  if (cachedVerifyKeys) return cachedVerifyKeys
  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) return []
    const html = await res.text()

    const idx = html.indexOf('/api/verify-link')
    if (idx === -1) return []

    const snippet = html.slice(idx, idx + 700)
    const bodyMatch = snippet.match(/JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/)
    if (!bodyMatch?.[1]) return []

    const keys = []
    for (const part of bodyMatch[1].split(',')) {
      const keyMatch = part.trim().match(/^["']?([a-zA-Z0-9_$]+)["']?(?:\s*:|$)/)
      if (keyMatch?.[1]) keys.push(keyMatch[1])
    }

    cachedVerifyKeys = keys
    return keys
  } catch (_) {
    return []
  }
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
    linkEmail: targetLink,
    email_link: targetLink,
    verify_link: targetLink,
    magic_link: targetLink,
    ...(oobCode ? { oobCode, code: oobCode } : {}),
    ...(apiKey ? { apiKey } : {})
  }

  for (const key of detectedKeys) {
    if (/oob/i.test(key) && oobCode) {
      payload[key] = oobCode
    } else if (/apikey/i.test(key) && apiKey) {
      payload[key] = apiKey
    } else if (/link|url|href|verif|magic|auth|sign|action/i.test(key)) {
      payload[key] = targetLink
    } else if (/mail|gmail|user|akun|account/i.test(key)) {
      payload[key] = cleanEmail
    }
  }

  return payload
}

function normalizeInboxList(rawData) {
  const list = Array.isArray(rawData)
    ? rawData
    : (rawData?.messages || rawData?.inbox || rawData?.emails || rawData?.data?.messages || rawData?.data || [])

  if (!Array.isArray(list)) return []
  return list.map((m) => ({
    id: String(m.id || m._id || m.messageId || m.uid || ''),
    from: typeof m.from === 'object' ? (m.from?.address || m.from?.text || JSON.stringify(m.from)) : String(m.from || m.sender || '-'),
    subject: String(m.subject || '(Tanpa Subjek)'),
    date: String(m.date || m.createdAt || m.created_at || m.receivedAt || '-'),
    raw: m
  })).filter((m) => m.id)
}

/**
 * Mengekstrak Magic Link Firebase (/__/auth/links?link=...) dari body email
 * @param {object|string} messageData
 */
export function extractMagicLink(messageData) {
  const candidates = collectStrings(messageData)
  const patterns = [
    /https?:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?[^\s"'<>\\]+/i,
    /https?:\/\/[a-zA-Z0-9._-]*firebaseapp\.com\/__\/auth\/[^\s"'<>\\]+/i,
    /href=["'](https?:\/\/[^"']+(?:alight-creative\.firebaseapp\.com|alightcreative\.com|alightmotion\.com|oobCode=)[^"']*)["']/i,
    /https?:\/\/[^\s"'<>\\]*oobCode=[^\s"'<>\\]+/i
  ]

  for (const rawBlock of candidates) {
    const text = normalizeMailText(rawBlock)
    for (const regex of patterns) {
      const match = text.match(regex)
      const hit = match?.[1] || match?.[0]
      if (hit && hit.startsWith('http')) {
        return cleanExtractedUrl(hit)
      }
    }
  }
  return ''
}

/**
 * Mengambil statistik server (/api/stats)
 */
export async function getStats() {
  const r = await fetchJson(`${BASE_URL}/api/stats`)
  if (!r.ok) throw new Error(`API Error HTTP ${r.status}: ${r.data?.error || r.rawText.slice(0, 120)}`)
  return r.data
}

/**
 * Membuat alamat TempMail baru (mendukung Custom Name & pilihan Domain)
 * @param {string} [customName='']
 * @param {string} [domain='']
 */
export async function generateTempMail(customName = '', domain = '') {
  const cleanName = sanitizeUsername(customName)
  const cleanDomain = String(domain || '').trim().replace(/^@/, '')

  const query = cleanDomain ? `?domain=${encodeURIComponent(cleanDomain)}` : ''
  const r = await fetchJson(`${BASE_URL}/api/tempmail/generate${query}`).catch(() => null)

  let availableDomains = []
  let generatedEmail = ''
  let selectedDomain = cleanDomain

  if (r?.ok && r.data) {
    if (Array.isArray(r.data.domains) && r.data.domains.length > 0) {
      availableDomains = r.data.domains
    }
    if (r.data.email && r.data.email.includes('@')) {
      generatedEmail = r.data.email
      if (!selectedDomain) selectedDomain = r.data.domain || r.data.email.split('@')[1]
    }
  }

  if (availableDomains.length === 0) {
    availableDomains = selectedDomain ? [selectedDomain] : ['catchmail.io']
  }
  if (!selectedDomain) selectedDomain = availableDomains[0]

  const finalEmail = cleanName
    ? `${cleanName}@${selectedDomain}`
    : (generatedEmail || `user${crypto.randomBytes(4).toString('hex')}@${selectedDomain}`)

  return {
    success: true,
    email: finalEmail,
    custom: Boolean(cleanName),
    username: finalEmail.split('@')[0],
    domain: selectedDomain,
    domains: availableDomains
  }
}

/**
 * Mengecek inbox TempMail via Dual-Engine (AbeeCloud + CatchMail v1)
 * @param {string} email
 */
export async function getTempMailInbox(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Alamat email TempMail wajib diisi!')
  }

  const attempts = [
    { source: 'abeecloud', url: `${BASE_URL}/api/tempmail/inbox?email=${encodeURIComponent(cleanEmail)}` },
    { source: 'catchmail-v1', url: `${CATCHMAIL_API}/mailbox?address=${encodeURIComponent(cleanEmail)}` }
  ]

  let lastErr = ''
  for (const att of attempts) {
    try {
      const r = await fetchJson(att.url, {
        headers: att.source === 'catchmail-v1'
          ? { Origin: 'https://catchmail.io', Referer: 'https://catchmail.io/' }
          : {}
      })

      if (r.status === 404 && /empty|not found|no message/i.test(r.rawText)) {
        return { success: true, source: att.source, email: cleanEmail, total: 0, messages: [] }
      }
      if (r.ok && r.data) {
        const messages = normalizeInboxList(r.data)
        return { success: true, source: att.source, email: cleanEmail, total: messages.length, messages }
      }
      lastErr = `${att.source} HTTP ${r.status}`
    } catch (err) {
      lastErr = `${att.source}: ${err.message}`
    }
  }

  throw new Error(`API Error: Gagal mengecek inbox (${lastErr})`)
}

/**
 * Membaca detail isi pesan TempMail & mengekstrak magicLink
 * @param {string} id
 * @param {string} [email='']
 */
export async function getTempMailMessage(id, email = '') {
  const cleanId = String(id || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanId) throw new Error('ID pesan TempMail wajib diisi!')

  const attempts = [
    ...(cleanEmail ? [{ source: 'abeecloud-email', url: `${BASE_URL}/api/tempmail/message?id=${encodeURIComponent(cleanId)}&email=${encodeURIComponent(cleanEmail)}` }] : []),
    { source: 'abeecloud-id', url: `${BASE_URL}/api/tempmail/message?id=${encodeURIComponent(cleanId)}` },
    ...(cleanEmail ? [{ source: 'catchmail-v1', url: `${CATCHMAIL_API}/message/${encodeURIComponent(cleanId)}?mailbox=${encodeURIComponent(cleanEmail)}` }] : [])
  ]

  let lastErr = ''
  for (const att of attempts) {
    try {
      const r = await fetchJson(att.url, {
        headers: att.source === 'catchmail-v1'
          ? { Origin: 'https://catchmail.io', Referer: 'https://catchmail.io/' }
          : {}
      })

      if (r.ok && (r.data || r.rawText)) {
        const payload = r.data || r.rawText
        return {
          success: true,
          source: att.source,
          id: cleanId,
          subject: r.data?.subject || r.data?.message?.subject || r.data?.data?.subject || '-',
          from: r.data?.from || r.data?.message?.from || r.data?.data?.from || '-',
          magicLink: extractMagicLink(payload),
          raw: payload
        }
      }
      lastErr = `${att.source} HTTP ${r.status}`
    } catch (err) {
      lastErr = `${att.source}: ${err.message}`
    }
  }

  throw new Error(`API Error: Gagal membaca isi pesan (${lastErr})`)
}

/**
 * Mengirim link aktivasi Alight Motion ke alamat email (/api/send-link)
 * @param {string} email
 */
export async function sendAmLink(email) {
  const cleanEmail = String(email || '').trim()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Alamat email tujuan tidak valid!')
  }
  const r = await fetchJson(`${BASE_URL}/api/send-link`, {
    method: 'POST',
    body: { email: cleanEmail }
  })
  if (!r.ok || r.data?.success === false) {
    throw new Error(`API Error HTTP ${r.status}: ${r.data?.message || r.data?.error || r.rawText.slice(0, 160)}`)
  }
  return r.data ?? r.rawText
}

/**
 * Memverifikasi magic link Firebase Alight Motion (/api/verify-link)
 * Otomatis mendeteksi nama field JSON frontend + mewajibkan konfirmasi email
 * @param {string} link - URL verifikasi dari inbox email
 * @param {string} email - Konfirmasi alamat Email/Gmail penerima link
 */
export async function verifyAmLink(link, email) {
  const cleanLink = cleanExtractedUrl(link)
  const cleanEmail = String(email || '').trim()
  if (!cleanLink || !cleanLink.startsWith('http')) {
    throw new Error('URL verifikasi Alight Motion tidak valid!')
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Konfirmasi Email/Gmail wajib diisi untuk verifikasi!')
  }

  const detectedKeys = await detectVerifyPayloadKeys()
  const { innerLink } = parseLinkTokens(cleanLink)
  const linkCandidates = innerLink ? [cleanLink, innerLink] : [cleanLink]

  let lastErr = ''
  for (const candidateUrl of linkCandidates) {
    const payload = buildVerifyPayload(candidateUrl, cleanEmail, detectedKeys)
    const r = await fetchJson(`${BASE_URL}/api/verify-link`, {
      method: 'POST',
      body: payload
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

/**
 * Otomasi penuh: Generate TempMail (Custom/Acak) -> Send Link -> Poll Inbox -> Verify Link
 * @param {object} [opts]
 * @param {string} [opts.customName='']
 * @param {string} [opts.domain='']
 * @param {string} [opts.confirmEmail=''] - Email konfirmasi opsional (default sama dengan TempMail)
 * @param {number} [opts.maxWaitMs=90000]
 * @param {number} [opts.intervalMs=4000]
 * @param {function} [opts.onLog]
 */
export async function autoActivateAm({ customName = '', domain = '', confirmEmail = '', maxWaitMs = 90_000, intervalMs = 4_000, onLog = () => {} } = {}) {
  onLog('Menyiapkan alamat TempMail...')
  const mailRes = await generateTempMail(customName, domain)
  const email = mailRes.email

  onLog(`Mengirim link aktivasi ke ${email}...`)
  const sendRes = await sendAmLink(email)

  onLog('Menunggu email verifikasi masuk ke inbox...')
  const deadline = Date.now() + maxWaitMs
  let magicLink = ''
  let subject = '-'

  while (Date.now() < deadline) {
    await sleep(intervalMs)
    try {
      const inbox = await getTempMailInbox(email)
      for (const msg of inbox.messages) {
        const quickLink = extractMagicLink(msg.raw)
        if (quickLink) {
          magicLink = quickLink
          subject = msg.subject
          break
        }
        const detail = await getTempMailMessage(msg.id, email)
        if (detail.magicLink) {
          magicLink = detail.magicLink
          subject = detail.subject || msg.subject
          break
        }
      }
      if (magicLink) break
    } catch (_) {}
  }

  if (!magicLink) {
    throw new Error(`Timeout menunggu email verifikasi masuk ke ${email}.`)
  }

  const finalEmail = String(confirmEmail || email).trim()
  onLog(`Link ditemukan! Memverifikasi premium untuk ${finalEmail}...`)
  const verifyRes = await verifyAmLink(magicLink, finalEmail)

  return {
    success: true,
    email: finalEmail,
    subject,
    magicLink,
    sendResponse: sendRes,
    verifyResponse: verifyRes
  }
}

export default {
  extractMagicLink,
  getStats,
  generateTempMail,
  getTempMailInbox,
  getTempMailMessage,
  sendAmLink,
  verifyAmLink,
  autoActivateAm
}
