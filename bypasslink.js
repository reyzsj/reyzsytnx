// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : Bypass.city & Universal Link Bypasser Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Support: Linkvertise, Work.ink, LootLabs, Sub2Unlock, SubsUnlock, Rekonise,
//          Boost.ink, Bstlar, Cuty.io, AdFoc.us, Bit.ly, TinyURL, dll.
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

const BASE_URL = 'https://bypass.city'

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/html, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
}

export const SUPPORTED_SITES = {
  adLinks: [
    'linkvertise.com', 'link-center.net', 'link-hub.net', 'direct-link.net', 'link-to.net',
    'work.ink', 'workink.net', 'loot-link.com', 'loot-links.com', 'lootdest.org', 'lootdest.com',
    'lootlinks.co', 'adfoc.us', 'cuty.io', 'cutty.app', 'ouo.io', 'ouo.press',
    'shrinkme.io', 'exe.io', 'fc.lc', 'bc.vc', 'shrtfly.com', 'za.gl'
  ],
  socialAndSubUnlocks: [
    'sub2unlock.com', 'sub2unlock.net', 'sub2unlock.me', 'sub4unlock.com', 'sub4unlock.io',
    'subsunlock.com', 'social-unlock.com', 'socialwolvez.com', 'rekonise.com',
    'boost.ink', 'boostfusedgt.com', 'bstlar.com', 'mboost.me', 'letsboost.net',
    'lockr.so', 'ytsubme.com', 'subs4unlock.id'
  ],
  shortenersAndPastes: [
    'bit.ly', 'tinyurl.com', 't.co', 'rebrand.ly', 'is.gd', 'v.gd',
    's.id', 'cutt.ly', 'rb.gy', 'shorturl.at', 'pastebin.com', 'paste-drop.com'
  ]
}

/**
 * Mengecek apakah URL termasuk domain yang didukung
 * @param {string} targetUrl
 */
export function checkSupportedDomain(targetUrl) {
  try {
    const host = new URL(String(targetUrl).trim()).hostname.replace(/^www\./i, '').toLowerCase()
    const all = [
      ...SUPPORTED_SITES.adLinks,
      ...SUPPORTED_SITES.socialAndSubUnlocks,
      ...SUPPORTED_SITES.shortenersAndPastes
    ]
    const matched = all.find((domain) => host === domain || host.endsWith(`.${domain}`))
    return { supported: Boolean(matched), host, matchedDomain: matched || null }
  } catch (_) {
    return { supported: false, host: '', matchedDomain: null }
  }
}

/**
 * Mengambil daftar situs yang didukung secara live dari bypass.city/supported
 */
export async function getSupportedSitesLive() {
  try {
    const res = await fetch(`${BASE_URL}/supported`, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const domainRegex = /\b([a-z0-9-]+\.(?:com|net|org|io|me|ink|us|co|app|so|ly|gd|id|press|gl|vc|lc|to))\b/gi
    const ignore = new Set([
      'bypass.city', 'discord.com', 'github.com', 'google.com', 'cloudflare.com',
      'w3.org', 'typekit.net', 'trustpilot.com', 'schema.org', 'nextjs.org', 'vercel.com'
    ])

    const found = new Set()
    let m
    while ((m = domainRegex.exec(html)) !== null) {
      const d = m[1].toLowerCase()
      if (!ignore.has(d) && !d.startsWith('cdn.') && !d.endsWith('.js')) {
        found.add(d)
      }
    }

    const liveList = Array.from(found).sort()
    return {
      status: true,
      source: liveList.length > 0 ? `${BASE_URL}/supported` : 'fallback',
      total: liveList.length || Object.values(SUPPORTED_SITES).flat().length,
      liveDomains: liveList,
      categories: SUPPORTED_SITES
    }
  } catch (_) {
    return {
      status: true,
      source: 'fallback',
      total: Object.values(SUPPORTED_SITES).flat().length,
      liveDomains: Object.values(SUPPORTED_SITES).flat(),
      categories: SUPPORTED_SITES
    }
  }
}

async function tryBypassCityApi(targetUrl) {
  const endpoints = [
    `${BASE_URL}/api/bypass?url=${encodeURIComponent(targetUrl)}`,
    `https://api.bypass.city/bypass?url=${encodeURIComponent(targetUrl)}`
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'GET',
        headers: { ...BROWSER_HEADERS, Origin: BASE_URL, Referer: `${BASE_URL}/` },
        signal: AbortSignal.timeout(12_000)
      })
      if (!res.ok) continue
      const data = await res.json().catch(() => null)
      const resultUrl = data?.result || data?.destination || data?.url || data?.bypassed
      if (resultUrl && String(resultUrl).startsWith('http') && resultUrl !== targetUrl) {
        return { engine: 'bypass.city', destination: resultUrl, raw: data }
      }
    } catch (_) {}
  }
  throw new Error('bypass.city memerlukan verifikasi web')
}

async function tryBypassVipApi(targetUrl) {
  const res = await fetch(`https://api.bypass.vip/bypass?url=${encodeURIComponent(targetUrl)}`, {
    method: 'GET',
    headers: { ...BROWSER_HEADERS, Origin: 'https://bypass.vip', Referer: 'https://bypass.vip/' },
    signal: AbortSignal.timeout(18_000)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.status === 'error') {
    throw new Error(data?.message || `bypass.vip HTTP ${res.status}`)
  }
  const resultUrl = data?.result || data?.destination || data?.url
  if (resultUrl && String(resultUrl).startsWith('http')) {
    return { engine: 'api.bypass.vip', destination: resultUrl, raw: data }
  }
  throw new Error('bypass.vip tidak mengembalikan tujuan')
}

async function tryBypassPmApi(targetUrl) {
  const res = await fetch(`https://bypass.pm/bypass2?url=${encodeURIComponent(targetUrl)}`, {
    method: 'GET',
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15_000)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.success === false) {
    throw new Error(data?.msg || `bypass.pm HTTP ${res.status}`)
  }
  const resultUrl = data?.destination || data?.result || data?.url
  if (resultUrl && String(resultUrl).startsWith('http')) {
    return { engine: 'bypass.pm', destination: resultUrl, raw: data }
  }
  throw new Error('bypass.pm gagal')
}

async function tryNativeRedirectFollow(targetUrl) {
  let current = targetUrl
  const hops = [current]

  for (let i = 0; i < 6; i++) {
    const res = await fetch(current, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    const loc = res.headers.get('location')
    if (loc) {
      const nextUrl = new URL(loc, current).href
      if (nextUrl === current) break
      current = nextUrl
      hops.push(current)
      continue
    }
    const html = await res.text().catch(() => '')
    const metaMatch = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s>]+)/i)
    if (metaMatch?.[1]) {
      const nextUrl = new URL(metaMatch[1].replace(/^['"]|['"]$/g, ''), current).href
      if (nextUrl !== current) {
        current = nextUrl
        hops.push(current)
        continue
      }
    }
    break
  }

  if (current !== targetUrl) {
    return { engine: 'native-redirect', destination: current, hops }
  }
  throw new Error('Tidak ada redirect langsung')
}

/**
 * Mem-bypass URL shortener / ad-link / sub-unlock menjadi URL tujuan asli
 * @param {string} targetUrl - URL lengkap yang ingin di-bypass
 */
export async function bypassUrl(targetUrl) {
  const cleanUrl = String(targetUrl || '').trim()
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('URL tidak valid! Harus diawali http:// atau https://')
  }

  const info = checkSupportedDomain(cleanUrl)
  const engines = [
    () => tryBypassCityApi(cleanUrl),
    () => tryBypassVipApi(cleanUrl),
    () => tryBypassPmApi(cleanUrl),
    () => tryNativeRedirectFollow(cleanUrl)
  ]

  const errors = []
  for (const run of engines) {
    try {
      const res = await run()
      if (res?.destination) {
        return {
          status: true,
          engine: res.engine,
          inputUrl: cleanUrl,
          domain: info.host,
          destination: res.destination,
          ...(res.hops ? { hops: res.hops } : {})
        }
      }
    } catch (err) {
      errors.push(err.message)
    }
  }

  throw new Error(`API Error: Gagal mem-bypass URL (${errors.join(' | ')}).`)
}

export default {
  SUPPORTED_SITES,
  checkSupportedDomain,
  getSupportedSitesLive,
  bypassUrl
}
