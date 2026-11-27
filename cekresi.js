// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 27 November 2026
// 🍂 Function : CekResi.com Base Module (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch + node:crypto AES-128-CBC (Zero NPM Dependency, Node.js v18+).
// Error fix sendiri.
// ---------------------------------------------------------

import crypto from 'node:crypto'
import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE = 'https://cekresi.com'
const API_HOST = 'https://apa2.cekresi.com/cekresi/resi'
const TIMEOUT = 25_000
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const DEFAULT_KEY = '79540e250fdb16afac03e19c46dbdeb3'
const DEFAULT_IV = 'eb2bb9425e81ffa942522e4414e95bd0'
const DEFAULT_UI = '3c8837dc55f61bfffad3e4f18190d70b'

export const POPULAR_COURIERS = [
  'spx', 'jnt', 'jntcargo', 'jne', 'sicepat', 'anteraja',
  'lion', 'pos', 'tiki', 'ninja', 'idexpress', 'wahana', 'paxel', 'indah'
]

export function encryptTimers(noresi, keyHex = DEFAULT_KEY, ivHex = DEFAULT_IV) {
  const cipher = crypto.createCipheriv(
    'aes-128-cbc',
    Buffer.from(keyHex, 'hex'),
    Buffer.from(ivHex, 'hex')
  )
  return cipher.update(noresi, 'utf8', 'base64') + cipher.final('base64')
}

function decodeHtml(str = '') {
  return String(str)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}

function stripTags(html = '') {
  return decodeHtml(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, ' | ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim()
}

function extractCourierOptions(html = '') {
  const map = new Map()
  for (const m of String(html).matchAll(/setExp\(['"]([^'"]+)['"]\)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)) {
    const code = m[1].trim()
    const name = stripTags(m[2]) || code.toUpperCase()
    if (code && !map.has(code)) map.set(code, { code, name })
  }
  return [...map.values()]
}

function parseTrackingHtml(html = '', noresi = '', courier = '') {
  const summary = {}
  const history = []

  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((c) => stripTags(c[1]))
      .filter(Boolean)

    if (cells.length === 2) {
      const [col1, col2] = cells
      if (/^tanggal|^waktu|^date/i.test(col1) && /keterangan|status|posisi/i.test(col2)) continue
      if (/\d{1,2}[-/\s](?:\d{1,2}|[a-zA-Z]{3,})[-/\s]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/.test(col1)) {
        history.push({ tanggal: col1, keterangan: col2 })
      } else {
        const key = col1.replace(/:$/, '').trim()
        if (key && key.length < 40) summary[key] = col2.replace(/^:\s*/, '').trim()
      }
    } else if (cells.length >= 3) {
      if (/^tanggal|^waktu|^no$/i.test(cells[0])) continue
      if (/\d{1,2}[-/\s](?:\d{1,2}|[a-zA-Z]{3,})|\d{2}:\d{2}/.test(cells[0])) {
        history.push({ tanggal: cells[0], keterangan: cells.slice(1).join(' — ') })
      } else {
        const key = cells[0].replace(/:$/, '').trim()
        if (key && key.length < 40) summary[key] = cells.slice(1).join(' ').replace(/^:\s*/, '').trim()
      }
    }
  }

  const rawText = decodeHtml(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()

  return {
    noresi,
    ekspedisi: summary['Ekspedisi'] || courier || null,
    status: summary['Status'] || summary['Status Pengiriman'] || history[0]?.keterangan || null,
    summary,
    history,
    raw_text: rawText
  }
}

async function getSession() {
  const res = await fetch(`${BASE}/`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`Gagal membuka cekresi.com (HTTP ${res.status})`)
  const html = await res.text()
  const rawCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=\s*[a-zA-Z0-9_.-]+=)/).filter(Boolean)

  const viewstate = html.match(/name=["']viewstate["'][^>]*value=["']([^"']+)["']/i)?.[1]
  const secretKey = html.match(/name=["']secret_key["'][^>]*value=["']([^"']+)["']/i)?.[1]
  if (!viewstate || !secretKey) throw new Error('Gagal mengambil token viewstate / secret_key.')

  const keys = [...html.matchAll(/ManualJS\.jun\.Des\.parse\(["']([0-9a-f]{32})["']\)/gi)].map((m) => m[1])
  const ui = html.match(/initialize\.php\?ui=([0-9a-f]+)/i)?.[1] || DEFAULT_UI

  return {
    cookie: rawCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; '),
    viewstate,
    secretKey,
    ui,
    aesKey: keys[0] || DEFAULT_KEY,
    aesIv: keys[1] || DEFAULT_IV
  }
}

/**
 * Lacak paket melalui cekresi.com
 * @param {string} rawResi           Nomor resi (opsional suffix -NOHP untuk JNE/ekspedisi tertentu)
 * @param {string} [courier='']      Kode ekspedisi (kosongkan untuk auto-detect)
 * @param {object} [opts]
 * @param {number} [opts.maxAutoPolls=15]
 */
export async function cekResi(rawResi, courier = '', { maxAutoPolls = 15 } = {}) {
  const noresi = String(rawResi || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!noresi) throw new Error('Nomor resi wajib diisi!')

  const sess = await getSession()
  const timers = encryptTimers(noresi, sess.aesKey, sess.aesIv)

  const post = async (url, expCode) => {
    const body = new URLSearchParams({
      viewstate: sess.viewstate,
      secret_key: sess.secretKey,
      e: expCode,
      noresi,
      timers
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Origin: BASE,
        Referer: `${BASE}/`,
        'X-Requested-With': 'XMLHttpRequest',
        ...(sess.cookie ? { Cookie: sess.cookie } : {})
      },
      body: body.toString(),
      signal: AbortSignal.timeout(TIMEOUT)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} dari server cekresi`)
    return res.text()
  }

  const randW = () => Math.random().toString(36).substring(7)
  let selectedExp = String(courier || '').trim().toLowerCase()
  let rawResp = await post(`${API_HOST}/initialize.php?ui=${sess.ui}&p=1&w=${randW()}`, selectedExp)

  let jsonResp = null
  try { jsonResp = JSON.parse(rawResp) } catch {}

  let detectedCouriers = []
  if (jsonResp?.content) {
    detectedCouriers = extractCourierOptions(jsonResp.content)
    if (!selectedExp && detectedCouriers.length > 0) {
      selectedExp = detectedCouriers[0].code
      rawResp = await post(`${API_HOST}/initialize.php?ui=${sess.ui}&p=1&w=${randW()}`, selectedExp)
    } else if (!detectedCouriers.length) {
      rawResp = jsonResp.content
    }
  }

  let cleo = rawResp.match(/doCheckAuto\(['"]([^'"]+)['"]\)/i)?.[1]
  if (cleo) {
    for (let i = 1; i <= maxAutoPolls; i++) {
      await sleep(2000)
      const pt = await post(
        `${API_HOST}/docheckAuto.php?cleo=${encodeURIComponent(cleo)}&ui=${sess.ui}&p=1&w=${randW()}`,
        selectedExp
      )
      let pj = null
      try { pj = JSON.parse(pt) } catch {}
      if (pj && typeof pj === 'object') {
        if (pj.errmsg && pj.errmsg !== '') { rawResp = pj.errmsg; break }
        if (pj.cleo) cleo = pj.cleo
      } else {
        rawResp = pt
        break
      }
    }
  }

  return {
    success: true,
    ...parseTrackingHtml(rawResp, noresi, selectedExp),
    detected_couriers: detectedCouriers
  }
}

export default {
  cekResi,
  encryptTimers,
  POPULAR_COURIERS
}
