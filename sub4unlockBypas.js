// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 21 November 2026
// 🍂 Function : Sub4Unlock Bypasser Base Module (Inertia data-page / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const TIMEOUT = 25_000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function decodeHtml(str = '') {
  return String(str)
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
}

function tryBase64Url(b64 = '') {
  try {
    const clean = b64.trim().replace(/-/g, '+').replace(/_/g, '/')
    if (clean.length < 12) return ''
    const out = Buffer.from(clean, 'base64').toString('utf-8').trim()
    return /^https?:\/\/[^\s"'<>]+$/i.test(out) ? out : ''
  } catch (_) {
    return ''
  }
}

function extractFromInertia(html) {
  const raw = html.match(/data-page=(["'])([\s\S]*?)\1/i)?.[2]
  if (!raw) return null
  try {
    const linkObj = JSON.parse(decodeHtml(raw))?.props?.link
    if (!linkObj?.url) return null

    const actions = Array.isArray(linkObj.actions)
      ? linkObj.actions.map((a) => ({
          name: a?.action_type?.name || 'Action',
          url: a?.url || ''
        })).filter((a) => a.url)
      : []

    return {
      method: 'inertia:data-page',
      id: linkObj.id ?? null,
      alias: linkObj.alias ?? null,
      destination: String(linkObj.url).trim(),
      actions
    }
  } catch (_) {
    return null
  }
}

function extractFallback(html, pageHost) {
  const isOk = (u) => {
    try {
      const p = new URL(u)
      const h = p.hostname.replace(/^www\./i, '').toLowerCase()
      return /^https?:$/i.test(p.protocol) && h && h !== pageHost && !/googleapis|gstatic|cloudflare|w3\.org|schema\.org/i.test(h)
    } catch (_) {
      return false
    }
  }

  const idHit = html.match(/id=["'](?:theGetLink|getlink|thelink|unlock-?link)["'][^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, '').trim()
  if (idHit) {
    const u = /^https?:\/\//i.test(idHit) ? decodeHtml(idHit) : tryBase64Url(idHit)
    if (isOk(u)) return { method: 'html:id', destination: u, actions: [] }
  }

  const b64s = [
    ...[...html.matchAll(/atob\(\s*["']([A-Za-z0-9+/=_-]{16,})["']\s*\)/g)].map((m) => m[1]),
    ...[...html.matchAll(/\b(aHR0c[A-Za-z0-9+/=_-]{14,})\b/g)].map((m) => m[1])
  ]
  for (const b of b64s) {
    const dec = tryBase64Url(b)
    if (isOk(dec)) return { method: 'html:base64', destination: dec, actions: [] }
  }
  return null
}

/**
 * Memproses resolusi link untuk membypass halaman Sub4Unlock / Sub2Unlock.
 * @param {string} targetData - URL Sub4Unlock yang akan dipecahkan.
 */
export async function requestApi(targetData) {
  if (!targetData || typeof targetData !== 'string' || !targetData.trim()) {
    throw new Error('Data target URL tidak boleh kosong!')
  }

  const t0 = Date.now()
  const targetUrl = /^https?:\/\//i.test(targetData.trim()) ? targetData.trim() : `https://${targetData.trim()}`

  const res = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT)
  })

  const finalUrl = res.url || targetUrl
  const html = await res.text()
  if ((res.status === 403 || res.status === 503) && /just a moment|challenge-platform/i.test(html)) {
    throw new Error(`Terhalang Cloudflare Challenge (HTTP ${res.status})`)
  }

  const pageHost = new URL(finalUrl).hostname.replace(/^www\./i, '').toLowerCase()
  const hit = extractFromInertia(html) || extractFallback(html, pageHost)
  const elapsed = parseFloat(((Date.now() - t0) / 1000).toFixed(2))

  if (!hit?.destination) {
    return {
      status: 404,
      solved: false,
      method: 'none',
      destination: finalUrl,
      actions: [],
      hops: [targetUrl],
      elapsed_sec: elapsed
    }
  }

  return {
    status: 200,
    solved: true,
    method: hit.method,
    ...(hit.id !== undefined ? { id: hit.id, alias: hit.alias } : {}),
    destination: hit.destination,
    actions: hit.actions || [],
    hops: Array.from(new Set([targetUrl, finalUrl, hit.destination])),
    elapsed_sec: elapsed
  }
}

export default {
  requestApi
}
