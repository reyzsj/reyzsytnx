// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : Y2mate (v42.www-y2mate.com) Base Module Fix (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Fix Search: Innertube Search API + Desktop Balanced JSON Extractor.
// Multi-Node MP3/MP4 Converter + IPv4 Forcer (Termux Ready).
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

const BASE_URL = 'https://v42.www-y2mate.com'
const SEARCH_URL = `${BASE_URL}/search/`

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function extractJsonObject(text, startIdx) {
  let depth = 0
  let inString = false
  let escaped = false
  let begin = -1

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (begin === -1) {
      if (ch === '{') {
        begin = i
        depth = 1
      }
      continue
    }
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else {
      if (ch === '"') inString = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return text.slice(begin, i + 1)
      }
    }
  }
  return ''
}

function collectVideosFromYtJson(node, results = [], seen = new Set(), limit = 15) {
  if (!node || typeof node !== 'object' || results.length >= limit) return results

  if (Array.isArray(node)) {
    for (const item of node) {
      if (results.length >= limit) break
      collectVideosFromYtJson(item, results, seen, limit)
    }
    return results
  }

  const v = node.videoRenderer || node.compactVideoRenderer || node.videoWithContextRenderer
  if (v?.videoId && !seen.has(v.videoId)) {
    seen.add(v.videoId)
    const title =
      v.title?.runs?.map((r) => r.text).join('') ||
      v.title?.simpleText ||
      v.headline?.runs?.map((r) => r.text).join('') ||
      v.headline?.simpleText ||
      `Video ${v.videoId}`
    const channel =
      v.ownerText?.runs?.[0]?.text ||
      v.longBylineText?.runs?.[0]?.text ||
      v.shortBylineText?.runs?.[0]?.text ||
      '-'
    const duration =
      v.lengthText?.simpleText ||
      v.lengthText?.runs?.map((r) => r.text).join('') ||
      'LIVE'

    results.push({
      videoId: v.videoId,
      title,
      channel,
      duration,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
    })
  }

  for (const val of Object.values(node)) {
    if (results.length >= limit) break
    if (val && typeof val === 'object') {
      collectVideosFromYtJson(val, results, seen, limit)
    }
  }
  return results
}

/**
 * Mengekstrak 11 karakter Video ID dari berbagai format link YouTube
 * @param {string} input - URL YouTube / Shorts / youtu.be atau Video ID
 */
export function extractVideoId(input) {
  const str = String(input || '').trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str

  try {
    const u = new URL(str)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }
    const vParam = u.searchParams.get('v')
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam

    const pathMatch = u.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/)
    if (pathMatch?.[1]) return pathMatch[1]
  } catch (_) {}

  const rawMatch = str.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
  return rawMatch?.[1] || ''
}

async function fetchVideoMetadata(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': DESKTOP_UA },
      signal: AbortSignal.timeout(8_000)
    })
    if (res.ok) {
      const data = await res.json()
      return {
        title: data.title || `YouTube Video (${videoId})`,
        channel: data.author_name || '-',
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  } catch (_) {}
  return {
    title: `YouTube Video (${videoId})`,
    channel: '-',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }
}

async function submitY2mateForm(query) {
  let cookie = ''
  try {
    const initRes = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12_000)
    })
    cookie = extractSetCookies(initRes.headers)
  } catch (_) {}

  const form = new URLSearchParams()
  form.set('q', query)
  form.set('form_submit', '1')

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { 'Cookie': cookie } : {})
    },
    body: form.toString(),
    signal: AbortSignal.timeout(20_000)
  })

  const html = await res.text()
  return { ok: res.ok, status: res.status, html }
}

/**
 * Mencari video atau lagu YouTube via Innertube Search API (dengan fallback Desktop HTML)
 * @param {string} keyword - Kata kunci pencarian atau URL YouTube
 * @param {number} [limit=15] - Jumlah maksimal hasil
 */
export async function searchY2mate(keyword, limit = 15) {
  const cleanKeyword = String(keyword || '').trim()
  if (!cleanKeyword) throw new Error('Kata kunci atau URL YouTube wajib diisi!')

  const directId = extractVideoId(cleanKeyword)
  if (directId) {
    const meta = await fetchVideoMetadata(directId)
    return {
      status: true,
      source: 'direct-id',
      keyword: cleanKeyword,
      total: 1,
      results: [{
        videoId: directId,
        title: meta.title,
        channel: meta.channel,
        duration: '-',
        youtubeUrl: `https://www.youtube.com/watch?v=${directId}`,
        thumbnail: meta.thumbnail
      }]
    }
  }

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/',
        'User-Agent': DESKTOP_UA
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20250101.00.00',
            hl: 'id',
            gl: 'ID'
          }
        },
        query: cleanKeyword
      }),
      signal: AbortSignal.timeout(15_000)
    })

    if (res.ok) {
      const data = await res.json().catch(() => null)
      const results = collectVideosFromYtJson(data, [], new Set(), limit)
      if (results.length > 0) {
        return {
          status: true,
          source: 'youtube-innertube',
          keyword: cleanKeyword,
          total: results.length,
          results
        }
      }
    }
  } catch (_) {}

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanKeyword)}&hl=id&gl=ID`
  const res = await fetch(ytUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': 'SOCS=CAI',
      'User-Agent': DESKTOP_UA
    },
    signal: AbortSignal.timeout(20_000)
  })

  if (!res.ok) throw new Error(`API Error HTTP ${res.status}: Gagal mencari video.`)
  const html = await res.text()

  let results = []
  const markerIdx = html.search(/(?:var\s+ytInitialData|window\[["']ytInitialData["']\])\s*=\s*/)
  if (markerIdx !== -1) {
    const jsonStr = extractJsonObject(html, markerIdx)
    if (jsonStr) {
      try {
        results = collectVideosFromYtJson(JSON.parse(jsonStr), [], new Set(), limit)
      } catch (_) {}
    }
  }

  return {
    status: true,
    source: 'youtube-desktop-html',
    keyword: cleanKeyword,
    total: results.length,
    results
  }
}

async function tryY2mateDirectNode(youtubeUrl, cleanFormat, fallbackTitle) {
  const { ok, html } = await submitY2mateForm(youtubeUrl)
  if (!ok || !html) throw new Error('v42.www-y2mate.com gagal')

  const linkRegex = /href=["'](https?:\/\/[^"']+(?:\.(?:mp3|mp4)|download|googlevideo\.com|dl-api|matevid)[^"']*)["']/gi
  let m
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/gi, '&')
    if (/facebook\.svg|logo\.webp|terms-condition|privacy-policy|about-us/i.test(href)) continue
    const matchesFmt = cleanFormat === 'mp4'
      ? /\.mp4|video|itag=18|itag=22/i.test(href)
      : /\.mp3|audio|m4a/i.test(href)
    if (matchesFmt) {
      return {
        node: 'v42.www-y2mate.com',
        quality: cleanFormat === 'mp4' ? '720p' : '128kbps',
        downloadUrl: href,
        filename: `${fallbackTitle}.${cleanFormat}`
      }
    }
  }
  throw new Error('Link langsung tidak ditemukan di HTML y2mate')
}

async function tryYouTubeInnertubeNode(videoId, cleanFormat, fallbackTitle) {
  const clients = [
    {
      name: 'ANDROID_VR',
      ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
      clientId: '28',
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.60.19',
          deviceMake: 'Oculus',
          deviceModel: 'Quest 3',
          androidSdkVersion: 32,
          osName: 'Android',
          osVersion: '12L',
          hl: 'id',
          gl: 'ID'
        }
      }
    },
    {
      name: 'IOS',
      ua: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)',
      clientId: '5',
      context: {
        client: {
          clientName: 'IOS',
          clientVersion: '19.45.4',
          deviceMake: 'Apple',
          deviceModel: 'iPhone16,2',
          osName: 'iPhone',
          osVersion: '18.1.0.22B83',
          hl: 'id',
          gl: 'ID'
        }
      }
    }
  ]

  for (const c of clients) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': c.ua,
          'X-YouTube-Client-Name': c.clientId,
          'X-YouTube-Client-Version': c.context.client.clientVersion,
          'Origin': 'https://www.youtube.com'
        },
        body: JSON.stringify({
          context: c.context,
          videoId,
          contentCheckOk: true,
          racyCheckOk: true
        }),
        signal: AbortSignal.timeout(12_000)
      })
      if (!res.ok) continue
      const data = await res.json().catch(() => null)
      const sd = data?.streamingData
      if (!sd) continue

      const title = data?.videoDetails?.title || fallbackTitle
      if (cleanFormat === 'mp4') {
        const mp4List = (sd.formats || [])
          .filter((f) => f.url && String(f.mimeType).includes('video/mp4'))
          .sort((a, b) => (b.height || 0) - (a.height || 0))
        if (mp4List.length > 0) {
          return {
            node: `youtubei-${c.name.toLowerCase()}`,
            quality: mp4List[0].qualityLabel || `${mp4List[0].height || 360}p`,
            downloadUrl: mp4List[0].url,
            filename: `${title}.mp4`
          }
        }
      } else {
        const audioList = (sd.adaptiveFormats || [])
          .filter((f) => f.url && String(f.mimeType).startsWith('audio/'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
        if (audioList.length > 0) {
          return {
            node: `youtubei-${c.name.toLowerCase()}`,
            quality: `${Math.round((audioList[0].bitrate || 128000) / 1000)}kbps`,
            downloadUrl: audioList[0].url,
            filename: `${title}.mp3`
          }
        }
      }
    } catch (_) {}
  }
  throw new Error('Innertube stream terkunci')
}

async function tryLoaderMirrorNode(youtubeUrl, cleanFormat, title) {
  const fmtParam = cleanFormat === 'mp4' ? '720' : 'mp3'
  const mirrors = ['https://ab.cococococ.com', 'https://loader.to']

  for (const base of mirrors) {
    try {
      const initUrl = `${base}/ajax/download.php?copyright=0&format=${fmtParam}&url=${encodeURIComponent(youtubeUrl)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`
      const initRes = await fetch(initUrl, {
        headers: { 'User-Agent': DESKTOP_UA, Origin: base, Referer: `${base}/` },
        signal: AbortSignal.timeout(12_000)
      })
      if (!initRes.ok) continue
      const initData = await initRes.json().catch(() => null)
      const taskId = initData?.id
      if (!taskId) continue

      for (let i = 0; i < 10; i++) {
        await sleep(2000)
        const progRes = await fetch(`${base}/ajax/progress.php?id=${encodeURIComponent(taskId)}`, {
          headers: { 'User-Agent': DESKTOP_UA },
          signal: AbortSignal.timeout(10_000)
        })
        const progData = await progRes.json().catch(() => null)
        if (progData?.download_url && progData.download_url.startsWith('http')) {
          return {
            node: new URL(base).hostname,
            quality: cleanFormat === 'mp4' ? '720p' : '128kbps',
            downloadUrl: progData.download_url,
            filename: `${initData.title || title}.${cleanFormat}`
          }
        }
        if (progData?.text && /error|fail/i.test(progData.text)) break
      }
    } catch (_) {}
  }
  throw new Error('Loader mirror timeout')
}

/**
 * Mengonversi URL YouTube atau Video ID menjadi tautan unduhan MP3/MP4
 * @param {string} targetUrlOrId - URL YouTube / Shorts atau 11-karakter Video ID
 * @param {'mp3'|'mp4'} [format='mp3'] - Format output ('mp3' atau 'mp4')
 */
export async function downloadY2mate(targetUrlOrId, format = 'mp3') {
  const videoId = extractVideoId(targetUrlOrId)
  if (!videoId) {
    throw new Error('URL YouTube atau Video ID (11 karakter) tidak valid!')
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  const cleanFormat = String(format || 'mp3').toLowerCase() === 'mp4' ? 'mp4' : 'mp3'
  const meta = await fetchVideoMetadata(videoId)

  const engines = [
    () => tryY2mateDirectNode(youtubeUrl, cleanFormat, meta.title),
    () => tryYouTubeInnertubeNode(videoId, cleanFormat, meta.title),
    () => tryLoaderMirrorNode(youtubeUrl, cleanFormat, meta.title)
  ]

  const errors = []
  for (const runEngine of engines) {
    try {
      const res = await runEngine()
      if (res?.downloadUrl) {
        return {
          status: true,
          node: res.node,
          format: cleanFormat,
          quality: res.quality || '-',
          videoId,
          title: meta.title,
          channel: meta.channel,
          youtubeUrl,
          thumbnail: meta.thumbnail,
          filename: res.filename,
          downloadUrl: res.downloadUrl
        }
      }
    } catch (err) {
      errors.push(err.message)
    }
  }

  throw new Error(`API Error: Semua engine konversi gagal (${errors.join(' | ')}).`)
}

export default {
  extractVideoId,
  searchY2mate,
  downloadY2mate
}
