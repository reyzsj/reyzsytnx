// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 29 November 2026
// 🍂 Function : SoundCloud Base Module (Search, Resolve & Audio Buffer ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch (Zero NPM Dependency, Node.js v18+).
// Multi-transcoding fallback (fix 404 audio/mpegurl) + Parallel HLS Buffer tanpa ffmpeg.
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

export const CREDIT = Object.freeze({
  Author: 'Dhanz (t.me/ktzckmy)',
  Channel: 'https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l'
})

const API_V2 = 'https://api-v2.soundcloud.com'
const TIMEOUT = 25_000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const CACHE_FILE = path.resolve(process.cwd(), 'sc_client_cache.json')
const CACHE_TTL = 12 * 60 * 60 * 1000

let memClientId = null

const formatDuration = (ms) => {
  const s = Math.round(Number(ms || 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const hdArtwork = (url) => (url ? String(url).replace(/-large\.(jpg|png|webp)/i, '-t500x500.$1') : null)

/**
 * Ekstrak otomatis client_id segar dari bundle JS soundcloud.com (+ cache 12 jam)
 */
export async function getClientId(force = false) {
  if (!force && memClientId) return memClientId
  if (!force) {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const c = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
        if (c?.client_id && (Date.now() - (c.updatedAt || 0)) < CACHE_TTL) {
          memClientId = c.client_id
          return memClientId
        }
      }
    } catch (_) {}
  }

  const home = await fetch('https://soundcloud.com/', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!home.ok) throw new Error(`Gagal membuka soundcloud.com (HTTP ${home.status})`)
  const html = await home.text()
  const jsUrls = [...html.matchAll(/<script[^>]+src=["'](https:\/\/a-v2\.sndcdn\.com\/assets\/[^"']+\.js)["']/gi)].map((m) => m[1])

  for (const url of jsUrls.reverse()) {
    const code = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    const m = code.match(/client_id\s*:\s*["']([a-zA-Z0-9]{20,40})["']/) || code.match(/client_id=([a-zA-Z0-9]{20,40})/)
    if (m) {
      memClientId = m[1]
      try { fs.writeFileSync(CACHE_FILE, JSON.stringify({ updatedAt: Date.now(), client_id: memClientId }, null, 2)) } catch (_) {}
      return memClientId
    }
  }
  throw new Error('Gagal mengekstrak client_id SoundCloud.')
}

async function apiGet(endpoint, params = {}, retry = true) {
  const clientId = await getClientId(false)
  const u = new URL(endpoint.startsWith('http') ? endpoint : `${API_V2}${endpoint}`)
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, String(v))
  u.searchParams.set('client_id', clientId)

  const res = await fetch(u.toString(), {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      Origin: 'https://soundcloud.com',
      Referer: 'https://soundcloud.com/'
    },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if ((res.status === 401 || res.status === 403) && retry) {
    memClientId = null
    await getClientId(true)
    return apiGet(endpoint, params, false)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function sortTranscodings(track) {
  const list = (track?.media?.transcodings || []).filter(
    (t) => t?.url && !/encrypted/i.test(t?.format?.protocol || '') && !/encrypted/i.test(t.url)
  )
  const rank = (t) => {
    const proto = (t.format?.protocol || '').toLowerCase()
    const mime = (t.format?.mime_type || '').toLowerCase()
    if (proto === 'progressive' && /^audio\/mpeg\b/.test(mime)) return 1
    if (proto === 'progressive') return 2
    if (proto === 'hls' && /^audio\/mpeg\b/.test(mime)) return 3
    if (proto === 'hls' && /mp4|aac/.test(mime)) return 4
    if (proto === 'hls' && /ogg|opus/.test(mime)) return 5
    if (/mpegurl/.test(mime)) return 9
    return 6
  }
  return [...list].sort((a, b) => rank(a) - rank(b))
}

function formatTrack(t) {
  const transcodings = sortTranscodings(t)
  const best = transcodings[0] || null
  return {
    id: t.id,
    title: t.title || '',
    artist: t.user?.username || '',
    duration: formatDuration(t.duration),
    duration_ms: t.duration || 0,
    genre: t.genre || null,
    plays: t.playback_count || 0,
    likes: t.likes_count || 0,
    artwork: hdArtwork(t.artwork_url || t.user?.avatar_url),
    url: t.permalink_url || null,
    stream_protocol: best?.format?.protocol || null,
    stream_mime: best?.format?.mime_type || null,
    _transcodings: transcodings,
    _trackAuth: t.track_authorization || null
  }
}

function stripInternal(t) {
  const { _transcodings, _trackAuth, ...clean } = t
  return clean
}

async function resolveStreamFromTrack(trackObj, allowRefresh = true) {
  const list = trackObj?._transcodings || []
  const errors = []

  for (const tr of list) {
    try {
      const data = await apiGet(tr.url, trackObj._trackAuth ? { track_authorization: trackObj._trackAuth } : {})
      if (data?.url) {
        const mime = tr.format?.mime_type || ''
        const isMp4 = /mp4|aac|m4a/i.test(mime) || /aac_|m4a|mp4/i.test(data.url)
        const isOgg = /ogg|opus/i.test(mime) || /opus_/i.test(data.url)
        return {
          url: data.url,
          protocol: tr.format?.protocol || 'hls',
          mime,
          preset: tr.preset || null,
          ext: isMp4 ? '.m4a' : (isOgg ? '.ogg' : '.mp3')
        }
      }
    } catch (e) {
      errors.push(`${tr.format?.protocol}/${tr.format?.mime_type}: ${e.message}`)
    }
  }

  if (allowRefresh && trackObj?.id) {
    const fresh = await apiGet(`/tracks/${trackObj.id}`).catch(() => null)
    if (fresh?.media?.transcodings?.length) {
      return resolveStreamFromTrack(formatTrack(fresh), false)
    }
  }

  throw new Error(errors.length ? `Semua stream gagal (${errors.join(' | ')})` : 'Track ini tidak menyediakan stream publik.')
}

async function expandShortUrl(rawUrl) {
  const u = String(rawUrl || '').trim()
  if (!/^https?:\/\/on\.soundcloud\.com\//i.test(u)) return u
  const res = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) })
  return res.url || u
}

/**
 * Cari lagu di SoundCloud
 * @param {string} query
 * @param {number} [limit=10]
 */
export async function searchSoundCloud(query, limit = 10) {
  const q = String(query || '').trim()
  if (!q) throw new Error('Query pencarian wajib diisi!')
  const data = await apiGet('/search/tracks', { q, limit: Math.max(1, Math.min(30, Number(limit) || 10)) })
  const results = (data.collection || []).map((t) => stripInternal(formatTrack(t)))
  return { success: true, query: q, total: results.length, results }
}

/**
 * Resolve URL track atau playlist SoundCloud (mendukung on.soundcloud.com)
 * @param {string} url
 */
export async function resolveSoundCloud(url) {
  const target = await expandShortUrl(url)
  const data = await apiGet('/resolve', { url: target })

  if (data.kind === 'track') {
    const track = formatTrack(data)
    const stream = await resolveStreamFromTrack(track).catch(() => null)
    return { success: true, kind: 'track', ...stripInternal(track), stream }
  }

  if (data.kind === 'playlist') {
    const rawTracks = data.tracks || []
    const stubIds = rawTracks.filter((x) => !x.title && x.id).map((x) => x.id).slice(0, 50)
    const hydrated = new Map()
    if (stubIds.length) {
      const batch = await apiGet('/tracks', { ids: stubIds.join(',') }).catch(() => [])
      for (const b of (Array.isArray(batch) ? batch : [])) hydrated.set(b.id, b)
    }
    const tracks = rawTracks.map((x) => (x.title ? x : hydrated.get(x.id))).filter(Boolean).map((t) => stripInternal(formatTrack(t)))
    return {
      success: true,
      kind: 'playlist',
      id: data.id,
      title: data.title,
      creator: data.user?.username || '',
      artwork: hdArtwork(data.artwork_url || tracks[0]?.artwork),
      url: data.permalink_url,
      track_count: tracks.length,
      tracks
    }
  }

  return { success: true, kind: data.kind || 'unknown', data }
}

/**
 * Unduh audio track SoundCloud sebagai Buffer (cocok untuk bot WhatsApp / Telegram)
 * @param {string} trackUrl
 * @param {object} [opts]
 * @param {number} [opts.concurrency=4]
 */
export async function downloadSoundCloudBuffer(trackUrl, { concurrency = 4 } = {}) {
  const target = await expandShortUrl(trackUrl)
  const data = await apiGet('/resolve', { url: target })
  if (data.kind !== 'track') {
    throw new Error(`URL bukan single track (kind: ${data.kind || 'unknown'}).`)
  }

  const track = formatTrack(data)
  const stream = await resolveStreamFromTrack(track)
  const mime = stream.ext === '.m4a' ? 'audio/mp4' : (stream.ext === '.ogg' ? 'audio/ogg' : 'audio/mpeg')

  if (stream.protocol === 'progressive') {
    const r = await fetch(stream.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) })
    if (!r.ok) throw new Error(`Gagal unduh audio (HTTP ${r.status})`)
    return {
      success: true,
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      artwork: track.artwork,
      ext: stream.ext,
      mime,
      protocol: stream.protocol,
      buffer: Buffer.from(await r.arrayBuffer())
    }
  }

  let m3u8Url = stream.url
  let m3u8Res = await fetch(m3u8Url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) })
  if (!m3u8Res.ok) throw new Error(`Playlist HLS gagal (HTTP ${m3u8Res.status})`)
  let m3u8 = await m3u8Res.text()

  if (/#EXT-X-STREAM-INF/i.test(m3u8)) {
    const v = m3u8.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#'))
    if (v) {
      m3u8Url = new URL(v.trim(), m3u8Url).toString()
      m3u8Res = await fetch(m3u8Url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) })
      if (!m3u8Res.ok) throw new Error(`Sub-playlist HLS gagal (HTTP ${m3u8Res.status})`)
      m3u8 = await m3u8Res.text()
    }
  }

  const segs = []
  const mapMatch = m3u8.match(/#EXT-X-MAP:[^\n]*URI=["']([^"']+)["']/i)
  if (mapMatch) segs.push(new URL(mapMatch[1], m3u8Url).toString())
  for (const line of m3u8.split(/\r?\n/)) {
    const s = line.trim()
    if (s && !s.startsWith('#')) segs.push(new URL(s, m3u8Url).toString())
  }
  if (!segs.length) throw new Error('Segmen HLS kosong.')

  const parts = new Array(segs.length)
  const step = Math.max(1, Math.min(8, Number(concurrency) || 4))

  for (let i = 0; i < segs.length; i += step) {
    const batch = segs.slice(i, i + step)
    await Promise.all(batch.map(async (segUrl, idx) => {
      const sr = await fetch(segUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) })
      if (!sr.ok) throw new Error(`Segmen HLS #${i + idx + 1} gagal (HTTP ${sr.status})`)
      parts[i + idx] = Buffer.from(await sr.arrayBuffer())
    }))
  }

  return {
    success: true,
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    artwork: track.artwork,
    ext: stream.ext,
    mime,
    protocol: stream.protocol,
    segments: segs.length,
    buffer: Buffer.concat(parts)
  }
}

export async function downloadSoundCloudFile(trackUrl, outPath, opts = {}) {
  const res = await downloadSoundCloudBuffer(trackUrl, opts)
  const targetPath = outPath || path.resolve(process.cwd(), `soundcloud_${res.id}_${Date.now()}${res.ext}`)
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, res.buffer)
  return { ...res, path: targetPath, bytes: res.buffer.length }
}

export default {
  CREDIT,
  getClientId,
  searchSoundCloud,
  resolveSoundCloud,
  downloadSoundCloudBuffer,
  downloadSoundCloudFile
}
