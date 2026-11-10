// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 10 November 2026
// 🍂 Function : DownVideo.me AIO Base Module Fix 500 (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Cookie & Token dikelola otomatis di background tanpa diketahui user.
// Error fix sendiri.
// ---------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE_URL = 'https://downvideo.me'
const HOME_URL = `${BASE_URL}/en/`
const API_URL = `${BASE_URL}/wp-json/aio-dl/video-data/`
const CACHE_FILE = path.join(os.tmpdir(), '.downvideo_silent_session.json')
const TIMEOUT = 35_000

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Cache-Control': 'no-cache',
  'Origin': BASE_URL,
  'Referer': HOME_URL,
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

let silentVault = {
  cookie: '',
  token: '',
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

function extractTokenFromHtml(html = '') {
  const patterns = [
    /<input[^>]+id=["']token["'][^>]+value=["']([^"']+)["']/i,
    /<input[^>]+name=["']token["'][^>]+value=["']([^"']+)["']/i,
    /<input[^>]+value=["']([^"']+)["'][^>]+(?:id|name)=["']token["']/i,
    /["']token["']\s*:\s*["']([a-fA-F0-9be64=_-]{16,})["']/i
  ]
  for (const reg of patterns) {
    const match = html.match(reg)
    if (match && match[1]) return match[1].trim()
  }
  return ''
}

function formatSize(bytes) {
  const b = Number(bytes) || 0
  if (!b) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function formatDuration(sec) {
  const s = Number(sec) || 0
  if (!s) return '-'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

async function resolveCanonicalUrl(inputUrl, signal) {
  try {
    const res = await fetch(inputUrl, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8'
      },
      redirect: 'follow',
      signal
    })

    let finalUrl = res.url || inputUrl
    const mTikTok = finalUrl.match(/m\.tiktok\.com\/v\/(\d+)\.html/i)
    if (mTikTok) {
      return `https://www.tiktok.com/@tiktok/video/${mTikTok[1]}`
    }

    if (finalUrl.includes('tiktok.com/')) {
      const parsed = new URL(finalUrl)
      if (/\/(?:video|photo)\/\d+/i.test(parsed.pathname)) {
        return `${parsed.origin}${parsed.pathname}`
      }
    }

    return finalUrl
  } catch (_) {
    return inputUrl
  }
}

async function refreshSilentSession(signal, force = false) {
  loadSilentCache()
  const isExpired = Date.now() - (silentVault.updatedAt || 0) > 10 * 60 * 1000
  if (!force && silentVault.token && silentVault.cookie && !isExpired) {
    return
  }

  try {
    const res = await fetch(HOME_URL, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal
    })

    const newCookie = extractSetCookies(res.headers)
    if (newCookie) silentVault.cookie = newCookie

    const html = await res.text()
    const token = extractTokenFromHtml(html)
    if (token) silentVault.token = token

    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

function generateHash(urlStr) {
  return Buffer.from(urlStr).toString('base64') + (urlStr.length + 1000) + Buffer.from('aio-dl').toString('base64')
}

async function fetchTikTokFallback(targetUrl, signal) {
  const form = new URLSearchParams({
    url: targetUrl,
    hd: '1'
  })

  const res = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': BROWSER_HEADERS['User-Agent']
    },
    body: form.toString(),
    signal
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || json?.code !== 0 || !json?.data) {
    throw new Error(json?.msg || 'Gagal mengekstrak video TikTok')
  }

  const d = json.data
  const toFullUrl = (u) => {
    if (!u) return null
    return u.startsWith('http') ? u : `https://www.tikwm.com${u}`
  }

  const medias = []
  let idx = 1

  if (Array.isArray(d.images) && d.images.length > 0) {
    d.images.forEach((imgUrl, i) => {
      medias.push({
        no: idx++,
        quality: `Slide Image ${i + 1} (HD)`,
        extension: 'jpg',
        size: '-',
        video_available: false,
        audio_available: false,
        download_url: imgUrl
      })
    })
  } else {
    if (d.hdplay) {
      medias.push({
        no: idx++,
        quality: 'HD No Watermark',
        extension: 'mp4',
        size: formatSize(d.hd_size),
        video_available: true,
        audio_available: true,
        download_url: toFullUrl(d.hdplay)
      })
    }
    if (d.play) {
      medias.push({
        no: idx++,
        quality: 'No Watermark (SD)',
        extension: 'mp4',
        size: formatSize(d.size),
        video_available: true,
        audio_available: true,
        download_url: toFullUrl(d.play)
      })
    }
    if (d.wmplay) {
      medias.push({
        no: idx++,
        quality: 'With Watermark',
        extension: 'mp4',
        size: formatSize(d.wm_size),
        video_available: true,
        audio_available: true,
        download_url: toFullUrl(d.wmplay)
      })
    }
  }

  if (d.music) {
    medias.push({
      no: idx++,
      quality: 'Audio / Original Sound (MP3)',
      extension: 'mp3',
      size: '-',
      video_available: false,
      audio_available: true,
      download_url: toFullUrl(d.music)
    })
  }

  return {
    status: true,
    source: 'tiktok',
    title: d.title || `TikTok Video by @${d.author?.unique_id || 'user'}`,
    duration: formatDuration(d.duration),
    thumbnail: toFullUrl(d.origin_cover || d.cover),
    total_medias: medias.length,
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
      if (vData?.url) {
        medias.push({
          no: medias.length + 1,
          quality: 'HD Video (No Watermark)',
          extension: 'mp4',
          size: '-',
          video_available: true,
          audio_available: true,
          download_url: vData.url
        })
      }
      if (aData?.url) {
        medias.push({
          no: medias.length + 1,
          quality: 'Original Audio (MP3)',
          extension: 'mp3',
          size: '-',
          video_available: false,
          audio_available: true,
          download_url: aData.url
        })
      }

      if (medias.length > 0) {
        const host = new URL(targetUrl).hostname.replace('www.', '').split('.')[0]
        return {
          status: true,
          source: host,
          title: vData?.filename || `Media from ${host}`,
          duration: '-',
          thumbnail: null,
          total_medias: medias.length,
          medias
        }
      }
    } catch (_) {}
  }

  throw new Error('Gagal mengekstrak media dari URL tersebut.')
}

/**
 * Mengekstrak informasi dan direct link unduhan video/audio dari berbagai sosial media
 * @param {string} targetUrl - URL publik (TikTok, vt.tiktok.com, IG, FB, X, YouTube, Douyin, dll)
 */
export async function downVideoAIO(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    throw new Error('URL video target tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const resolvedUrl = await resolveCanonicalUrl(targetUrl.trim(), controller.signal)
    await refreshSilentSession(controller.signal, false)

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const formBody = new URLSearchParams({
          url: resolvedUrl,
          token: silentVault.token || '',
          hash: generateHash(resolvedUrl)
        })

        const headers = {
          ...BROWSER_HEADERS,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }
        if (silentVault.cookie) headers['Cookie'] = silentVault.cookie

        const res = await fetch(API_URL, {
          method: 'POST',
          headers,
          body: formBody.toString(),
          signal: controller.signal
        })

        const rawText = await res.text()
        let data = null
        try { data = JSON.parse(rawText) } catch (_) {}

        if (res.ok && data && Array.isArray(data.medias) && data.medias.length > 0) {
          const medias = data.medias.map((m, idx) => ({
            no: idx + 1,
            quality: m.quality || '-',
            extension: m.extension || 'mp4',
            size: m.formattedSize || m.size || '-',
            video_available: Boolean(m.videoAvailable),
            audio_available: Boolean(m.audioAvailable),
            download_url: m.url
          }))

          return {
            status: true,
            source: data.source || 'auto',
            title: data.title || 'Media Download',
            duration: data.duration || '-',
            thumbnail: data.thumbnail || null,
            total_medias: medias.length,
            medias
          }
        }

        if (attempt === 1) {
          await refreshSilentSession(controller.signal, true)
        }
      } catch (_) {}
    }

    return await fetchUniversalFallback(resolvedUrl, controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

export default {
  downVideoAIO
}
