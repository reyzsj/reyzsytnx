// ---------------------------------------------------------
// 🔥 Author : Dhanz (https://t.me/ktzckmy)
// 🌸 Date : 11 Oktober 2026
// 🍂 Function : OMDown Multi-Platform Media Resolver Module (Native Fetch)
// 🌟 Channels :
// - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Module request menggunakan Native Fetch (Zero Dependency).
// Gunakan hanya pada akun yang kamu miliki atau berwenang
// untuk mengelolanya.
// Error fix sendiri.
// ---------------------------------------------------------

export const BASE = 'https://www.omdown.site'
const ACT_SESSION = '40010ff24080496480300f210c602eff421bbabc68'
const ACT_RESOLVE = '702804ccc82147179e70c99569473492d22dd96950'
const TIMEOUT = 45_000
const RETRIES = 3
const GAP = 1200

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

export const PATTERNS = [
  [/(?:^|\.)shortdrama\.tiktok\.com$/i, 'PineDrama'],
  [/(?:^|\.)tiktok\.com$/i, 'TikTok'],
  [/(?:^|\.)(?:douyin\.com|iesdouyin\.com)$/i, 'Douyin'],
  [/(?:^|\.)(?:kuaishou\.com|kwai\.com)$/i, 'Kuaishou'],
  [/(?:^|\.)(?:snackvideo\.com|sck\.io)$/i, 'SnackVideo'],
  [/(?:^|\.)(?:xiaohongshu\.com|rednote\.com|xhslink\.com)$/i, 'RedNote'],
  [/(?:^|\.)(?:youtu\.be|youtube\.com)$/i, 'YouTube'],
  [/(?:^|\.)(?:instagram\.com|instagr\.am|ig\.me)$/i, 'Instagram'],
  [/(?:^|\.)(?:twitter\.com|x\.com|t\.co)$/i, 'X'],
  [/(?:^|\.)(?:facebook\.com|fb\.watch|fb\.com)$/i, 'Facebook'],
  [/(?:^|\.)threads\.(?:net|com)$/i, 'Threads'],
  [/(?:^|\.)(?:bsky\.app|bsky\.social)$/i, 'Bluesky'],
  [/(?:^|\.)(?:reddit\.com|redd\.it)$/i, 'Reddit'],
  [/(?:^|\.)capcut\.com$/i, 'CapCut'],
  [/(?:^|\.)snapchat\.com$/i, 'Snapchat'],
  [/(?:^|\.)twitch\.tv$/i, 'Twitch'],
  [/(?:^|\.)(?:bilibili\.com|bilibili\.tv|b23\.tv|bili\.im)$/i, 'Bilibili'],
  [/(?:^|\.)(?:dailymotion\.com|dai\.ly)$/i, 'Dailymotion'],
  [/(?:^|\.)lahelu\.com$/i, 'Lahelu'],
  [/(?:^|\.)(?:spotify\.com|spoti\.fi)$/i, 'Spotify'],
  [/(?:^|\.)soundcloud\.com$/i, 'SoundCloud'],
  [/(?:^|\.)(?:music\.apple\.com|apple\.co)$/i, 'Apple Music'],
  [/(?:^|\.)(?:pinterest\.(?:com|co\.[a-z]{2}|[a-z]{2,3})|pin\.it)$/i, 'Pinterest'],
  [/(?:^|\.)deviantart\.com$/i, 'DeviantArt'],
  [/(?:^|\.)pixiv\.net$/i, 'Pixiv'],
  [/(?:^|\.)mangadex\.org$/i, 'MangaDex'],
  [/(?:^|\.)imgur\.com$/i, 'Imgur'],
]

const cookies = new Map()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function detectPlatform(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const hit = PATTERNS.find(([re]) => re.test(u.hostname))
    return hit ? hit[1] : null
  } catch {
    return null
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function absorbCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  for (const raw of setCookies) {
    const [pair] = raw.split(';')
    const i = pair.indexOf('=')
    if (i < 0) continue
    const name = pair.slice(0, i).trim()
    const value = pair.slice(i + 1).trim()
    if (!value || /Expires=Thu, 01 Jan 1970/i.test(raw)) cookies.delete(name)
    else cookies.set(name, value)
  }
}

function hashP(e) {
  let a = 0x811c9dc5, n = 0x9e3779b9, t = 0x7fffffff, o = 0x27d4eb2d
  for (let i = 0; i < e.length; i++) {
    const r = e.charCodeAt(i)
    a = Math.imul(a ^ r, 0x1000193)
    n = Math.imul(n ^ (r >>> 2), 0x85ebca6b)
    t = Math.imul((t ^ (r << 3)) & 255, 0xc2b2ae35)
    o = Math.imul(o ^ r, 0x165667b1)
  }
  const h = (x) => (x >>> 0).toString(16).padStart(8, '0')
  return h(a) + h(n) + h(t) + h(o) + h(a ^ t) + h(n ^ o) + h(a + n) + h(t + o)
}

function buildPayload(url, platform, locale, salt) {
  const t = Date.now()
  const n = Math.floor(1e9 * Math.random()).toString(36)
  const d = JSON.stringify({ u: url.trim(), p: platform || 'Media', l: locale || 'en', t, n })
  const key = Buffer.from(hashP(`${(23100 ^ t) >>> 0}:${salt}:${t % 997}`), 'hex')
  const plain = Buffer.from(d, 'utf8')
  const data = Buffer.from(plain.map((b, i) => b ^ key[i % key.length])).toString('base64url')
  return { data, t, h: hashP(`${data}:${t}:${salt}`) }
}

function scanJson(text, start) {
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function findResult(text) {
  let from = 0
  for (;;) {
    const i = text.indexOf('{"success":', from)
    if (i < 0) return null
    from = i + 1
    const raw = scanJson(text, i)
    if (!raw) continue
    try {
      const v = JSON.parse(raw)
      if (v && typeof v === 'object' && typeof v.success === 'boolean') return v
    } catch {}
  }
}

function buildRefs(text) {
  const map = new Map()
  let pos = 0
  while (pos < text.length) {
    if (text[pos] === '\n') { pos++; continue }
    const m = /^([0-9a-f]+):/.exec(text.slice(pos, pos + 64))
    if (!m) {
      const nl = text.indexOf('\n', pos)
      if (nl < 0) break
      pos = nl + 1
      continue
    }
    const valAt = pos + m[0].length
    const tRow = /^T([0-9a-f]+),/.exec(text.slice(valAt, valAt + 20))
    if (tRow) {
      const len = parseInt(tRow[1], 16)
      const ds = valAt + tRow[0].length
      map.set(m[1], text.slice(ds, ds + len))
      pos = ds + len
      continue
    }
    let end = text.indexOf('\n', valAt)
    if (end < 0) end = text.length
    const raw = text.slice(valAt, end)
    if (raw[0] === '{' || raw[0] === '[') {
      const js = scanJson(text, valAt)
      if (js) {
        try { map.set(m[1], JSON.parse(js)) } catch {}
        pos = valAt + js.length
        continue
      }
    }
    try { map.set(m[1], JSON.parse(raw)) } catch { map.set(m[1], raw) }
    pos = end
  }
  return map
}

function deref(value, refs, depth = 0) {
  if (depth > 8 || value == null) return value
  if (typeof value === 'string') {
    if (value === '$undefined') return null
    const m = /^\$(?:@)?([0-9a-f]+)$/.exec(value)
    if (m && refs.has(m[1])) return deref(refs.get(m[1]), refs, depth + 1)
    return value
  }
  if (Array.isArray(value)) return value.map((v) => deref(v, refs, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = deref(v, refs, depth + 1)
    return out
  }
  return value
}

const absolutize = (v) => (typeof v === 'string' && v.startsWith('/') ? `${BASE}${v}` : v)

function shape(d) {
  const out = {}
  for (const [k, v] of Object.entries(d || {})) out[k] = absolutize(v)
  if (Array.isArray(d?.formats)) out.formats = d.formats.map((f) => {
    const o = { ...f }
    for (const key of ['downloadUrl', 'thumbnailUrl', 'previewUrl']) if (key in o) o[key] = absolutize(o[key])
    return o
  })
  if (Array.isArray(d?.slides)) out.slides = d.slides.map((s) => (s && typeof s === 'object' ? shape(s) : absolutize(s)))
  if (d?.thumbnailUrl) out.thumbnailUrl = absolutize(d.thumbnailUrl)
  return out
}

async function requestFetch(url, options = {}, attempt = 0) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const headers = {
      'User-Agent': USER_AGENTS[attempt % USER_AGENTS.length],
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Referer': `${BASE}/en`,
      'Cookie': cookieHeader(),
      ...options.headers
    }

    const res = await fetch(url, { ...options, headers, signal: controller.signal })
    absorbCookies(res)

    if (!res.ok && attempt < RETRIES) {
      await sleep(1000 * Math.pow(2, attempt))
      return requestFetch(url, options, attempt + 1)
    }

    const text = await res.text()
    return { status: res.status, text, res }
  } catch (err) {
    if (attempt < RETRIES) {
      await sleep(1000 * Math.pow(2, attempt))
      return requestFetch(url, options, attempt + 1)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function action(actionId, payloadBody, locale = 'en') {
  return requestFetch(`${BASE}/${locale}`, {
    method: 'POST',
    headers: {
      'Next-Action': actionId,
      'Content-Type': 'text/plain;charset=UTF-8',
      'Accept': 'text/x-component',
      'Origin': BASE,
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty'
    },
    body: payloadBody
  })
}

async function session(locale = 'en') {
  const body = JSON.stringify([{ trusted: true, clientTime: Date.now(), interactionType: 'resolve' }])
  for (let i = 0; i < 3; i++) {
    const res = await action(ACT_SESSION, body, locale)
    const r = findResult(res.text)
    if (r?.success && r.salt) return r.salt
    if (/terlalu cepat|tunggu/i.test(r?.error || '')) {
      await sleep(1600)
      continue
    }
    throw new Error(r?.error || `Session gagal HTTP ${res.status}`)
  }
  throw new Error('Session berkali-kali gagal.')
}

/**
 * Resolve link media untuk mendapatkan informasi & link download langsung
 * @param {string} rawUrl - Link media (TikTok, YouTube, IG, Spotify, dll)
 * @param {string} [locale='en'] - Bahasa respons ('en' / 'id')
 */
export async function resolveMedia(rawUrl, locale = 'en') {
  const url = String(rawUrl || '').trim()
  if (!/^https?:\/\//i.test(url)) throw new Error('Link harus berupa URL valid (http/https)')

  const platform = detectPlatform(url) || 'Media'
  await requestFetch(`${BASE}/${locale}`)
  await sleep(GAP)

  const salt = await session(locale)
  await sleep(GAP)

  const payload = buildPayload(url, platform, locale, salt)
  const res = await action(ACT_RESOLVE, JSON.stringify([payload, platform, locale]), locale)
  const r = findResult(res.text)

  if (!r) throw new Error(`Hasil resolve tidak ditemukan (HTTP ${res.status})`)
  if (!r.success) throw new Error(r.error || 'Resolve media gagal.')

  const derefedData = deref(r.data, buildRefs(res.text))
  const out = shape(derefedData)

  return {
    source: url,
    platform,
    ...out
  }
}

export default {
  resolveMedia,
  detectPlatform,
  PATTERNS
}
