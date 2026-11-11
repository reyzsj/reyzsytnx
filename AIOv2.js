// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 11 November 2026
// 🍂 Function : OmDown Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Cookie & sesi dikelola otomatis di background tanpa diketahui user.
// Error fix sendiri.
// ---------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE_URL = 'https://www.omdown.site'
const API_STREAM = `${BASE_URL}/api/media/stream`
const CACHE_FILE = path.join(os.tmpdir(), '.omdown_silent_session.json')
const TIMEOUT = 35_000

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

let silentVault = {
  cookie: '',
  updatedAt: 0
}

function loadSilentCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      silentVault = { ...silentVault, ...parsed }
    }
  } catch (_) {}
}

function saveSilentCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(silentVault), 'utf-8')
  } catch (_) {}
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie()
    if (list.length > 0) return list.map((c) => c.split(';')[0]).join('; ')
  }
  const raw = headers.get('set-cookie') || ''
  return raw
    .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

async function ensureSilentSession(signal) {
  loadSilentCache()
  if (silentVault.cookie && Date.now() - (silentVault.updatedAt || 0) < 15 * 60 * 1000) {
    return
  }

  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal
    })
    const c = extractSetCookies(res.headers)
    if (c) silentVault.cookie = c
    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

function formatSize(bytes) {
  const b = Number(bytes) || 0
  if (!b) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

async function fetchTikTokFallback(targetUrl, signal) {
  const res = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': BROWSER_HEADERS['User-Agent']
    },
    body: new URLSearchParams({ url: targetUrl, hd: '1' }).toString(),
    signal
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || json?.code !== 0 || !json?.data) {
    throw new Error(json?.msg || 'Gagal mengekstrak video TikTok')
  }

  const d = json.data
  const toFullUrl = (u) => (u ? (u.startsWith('http') ? u : `https://www.tikwm.com${u}`) : null)

  const medias = []
  if (d.hdplay) medias.push({ quality: 'HD No Watermark', extension: 'mp4', size: formatSize(d.hd_size), download_url: toFullUrl(d.hdplay) })
  if (d.play) medias.push({ quality: 'SD No Watermark', extension: 'mp4', size: formatSize(d.size), download_url: toFullUrl(d.play) })
  if (d.music) medias.push({ quality: 'Audio MP3', extension: 'mp3', size: '-', download_url: toFullUrl(d.music) })

  return {
    status: true,
    source: 'tiktok',
    title: d.title || 'TikTok Media',
    thumbnail: toFullUrl(d.cover),
    medias
  }
}

async function fetchUniversalFallback(targetUrl, signal) {
  if (/tiktok\.com|douyin\.com/i.test(targetUrl)) {
    return await fetchTikTokFallback(targetUrl, signal)
  }

  const cobaltNodes = ['https://api.cobalt.tools', 'https://co.wuk.sh']
  for (const node of cobaltNodes) {
    try {
      const [vRes, aRes] = await Promise.all([
        fetch(node, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, videoQuality: '1080' }),
          signal
        }),
        fetch(node, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, downloadMode: 'audio' }),
          signal
        })
      ])

      const vData = vRes.ok ? await vRes.json().catch(() => null) : null
      const aData = aRes.ok ? await aRes.json().catch(() => null) : null

      const medias = []
      if (vData?.url) medias.push({ quality: 'HD Video', extension: 'mp4', size: '-', download_url: vData.url })
      if (aData?.url) medias.push({ quality: 'Audio MP3', extension: 'mp3', size: '-', download_url: aData.url })

      if (medias.length > 0) {
        const host = new URL(targetUrl).hostname.replace('www.', '').split('.')[0]
        return {
          status: true,
          source: host,
          title: vData?.filename || `Media from ${host}`,
          thumbnail: null,
          medias
        }
      }
    } catch (_) {}
  }

  throw new Error('Gagal mengekstrak media dari URL tersebut.')
}

/**
 * Mengekstrak informasi dan direct link unduhan video, audio, & foto dari berbagai platform sosial media via OmDown
 * @param {string} targetUrl - URL publik video atau foto
 */
export async function omDownloader(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    throw new Error('URL video target wajib diisi!')
  }

  const cleanUrl = targetUrl.trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)

    try {
      const res = await fetch(`${API_STREAM}?url=${encodeURIComponent(cleanUrl)}`, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          'Accept': 'application/json, text/plain, */*',
          'Cookie': silentVault.cookie,
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal
      })

      const rawText = await res.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (res.ok && data && (data.medias || data.url || data.title)) {
        const medias = (data.medias || []).map((m, i) => ({
          no: i + 1,
          quality: m.quality || 'Default',
          extension: m.extension || 'mp4',
          size: m.size || '-',
          download_url: m.url
        }))

        return {
          status: true,
          source: data.source || 'omdown',
          title: data.title || 'Media Download',
          thumbnail: data.thumbnail || null,
          medias
        }
      }
    } catch (_) {}

    const fallbackRes = await fetchUniversalFallback(cleanUrl, controller.signal)
    return {
      status: true,
      source: fallbackRes.source,
      title: fallbackRes.title,
      thumbnail: fallbackRes.thumbnail,
      medias: fallbackRes.medias.map((m, i) => ({ no: i + 1, ...m }))
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  omDownloader
}
