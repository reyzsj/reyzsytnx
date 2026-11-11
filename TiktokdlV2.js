// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 11 November 2026
// 🍂 Function : TTokDown Base Module (Native Fetch / ESM)
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

const BASE_URL = 'https://ttokdown.com'
const LOOKUP_URL = `${BASE_URL}/lookup`
const CACHE_FILE = path.join(os.tmpdir(), '.ttokdown_silent_session.json')
const TIMEOUT = 35_000

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

let silentVault = {
  cookie: '',
  token: '',
  toolType: '',
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

function formatSize(bytes) {
  const b = Number(bytes) || 0
  if (!b) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

async function ensureSilentSession(signal) {
  loadSilentCache()
  if (silentVault.cookie && silentVault.token && Date.now() - (silentVault.updatedAt || 0) < 15 * 60 * 1000) {
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

    const html = await res.text()
    const tokenMatch = html.match(/<input\s+type=["']hidden["']\s+name=["']_token["']\s+value=["']([^"']+)["']/i)
    const toolMatch = html.match(/<input\s+type=["']hidden["']\s+name=["']tool["']\s+value=["']([^"']*)["']/i)

    if (tokenMatch?.[1]) silentVault.token = tokenMatch[1]
    if (toolMatch?.[1]) silentVault.toolType = toolMatch[1]

    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

async function resolveCanonicalUrl(inputUrl, signal) {
  try {
    const res = await fetch(inputUrl, {
      method: 'GET',
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      redirect: 'follow',
      signal
    })
    let finalUrl = res.url || inputUrl
    const mTikTok = finalUrl.match(/m\.tiktok\.com\/v\/(\d+)\.html/i)
    if (mTikTok) return `https://www.tiktok.com/@tiktok/video/${mTikTok[1]}`
    return finalUrl
  } catch (_) {
    return inputUrl
  }
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
  let idx = 1

  if (Array.isArray(d.images) && d.images.length > 0) {
    d.images.forEach((imgUrl, i) => {
      medias.push({ no: idx++, quality: `Slide Photo ${i + 1}`, extension: 'jpg', size: '-', download_url: imgUrl })
    })
  } else {
    if (d.hdplay) medias.push({ no: idx++, quality: 'HD No Watermark', extension: 'mp4', size: formatSize(d.hd_size), download_url: toFullUrl(d.hdplay) })
    if (d.play) medias.push({ no: idx++, quality: 'SD No Watermark', extension: 'mp4', size: formatSize(d.size), download_url: toFullUrl(d.play) })
  }
  if (d.music) medias.push({ no: idx++, quality: 'Audio MP3', extension: 'mp3', size: '-', download_url: toFullUrl(d.music) })

  return {
    status: true,
    source: 'tiktok',
    title: d.title || 'TikTok Media',
    thumbnail: toFullUrl(d.cover),
    medias
  }
}

/**
 * Mengekstrak informasi dan direct link unduhan video, audio, & foto slide dari TikTok via TTokDown
 * @param {string} targetUrl - URL TikTok
 */
export async function ttokDownloader(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    throw new Error('URL TikTok wajib diisi!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const resolvedUrl = await resolveCanonicalUrl(targetUrl.trim(), controller.signal)
    await ensureSilentSession(controller.signal)

    try {
      const payload = new URLSearchParams({
        _token: silentVault.token || '',
        q: resolvedUrl,
        tool: silentVault.toolType || ''
      })

      const headers = {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      }
      if (silentVault.cookie) headers['Cookie'] = silentVault.cookie

      const res = await fetch(LOOKUP_URL, {
        method: 'POST',
        headers,
        body: payload.toString(),
        signal: controller.signal
      })

      const rawText = await res.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (res.ok && (data || rawText.includes('href'))) {
        const medias = []
        let titleMatch = rawText.match(/<p[^>]*class=["'][^"']*title[^"']*["'][^>]*>(.*?)<\/p>/i)
        let imgMatch = rawText.match(/<img[^>]+src=["']([^"']+)["']/i)
        
        const aRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
        let match
        let idx = 1
        while ((match = aRegex.exec(rawText)) !== null) {
          const url = match[1]
          const label = match[2].replace(/<[^>]+>/g, '').trim() || 'Download'
          if (!url.startsWith('http') || url.includes('ttokdown.com/blog')) continue
          
          let ext = 'mp4'
          if (label.toLowerCase().includes('mp3') || url.includes('mp3')) ext = 'mp3'
          if (label.toLowerCase().includes('photo') || url.includes('jpeg') || url.includes('jpg')) ext = 'jpg'

          if (!medias.some(m => m.download_url === url)) {
            medias.push({ no: idx++, quality: label, extension: ext, size: '-', download_url: url })
          }
        }

        if (medias.length > 0) {
          return {
            status: true,
            source: 'ttokdown',
            title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Media Download',
            thumbnail: imgMatch ? imgMatch[1] : null,
            medias
          }
        }
      }
    } catch (_) {}

    return await fetchTikTokFallback(resolvedUrl, controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

export default {
  ttokDownloader
}
