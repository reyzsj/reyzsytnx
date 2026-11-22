// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 22 November 2026
// 🍂 Function : YouTube Music Unlimited Search & Download Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Zero NPM Dependency (Node.js v18+ ESM). Default limit = 0 (Unlimited).
// Require: yt-dlp & ffmpeg.
// Error fix sendiri.
// ---------------------------------------------------------

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

function runYtDlp(args, timeout = 180_000) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 100, timeout }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === 'ENOENT') return reject(new Error('yt-dlp belum terpasang! Jalankan: pkg install yt-dlp ffmpeg'))
        return reject(new Error((stderr || err.message).trim().split('\n').pop()))
      }
      resolve(stdout)
    })
  })
}

function fmtDuration(sec) {
  const t = Math.round(sec || 0)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

function cleanArtist(name) {
  return String(name || '').replace(/\s*-\s*Topic$/i, '').trim()
}

function normalizeTrack(e) {
  const artist =
    cleanArtist(e.artist) ||
    cleanArtist(Array.isArray(e.artists) ? e.artists.join(', ') : '') ||
    cleanArtist(e.creator) ||
    cleanArtist(e.uploader) ||
    cleanArtist(e.channel) ||
    'Unknown Artist'

  const thumb =
    e.thumbnail ||
    (Array.isArray(e.thumbnails) && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1]?.url : null)

  const item = {
    id: e.id,
    title: e.track || e.title || 'Unknown Title',
    artist,
    album: e.album || null,
    duration: e.duration ? fmtDuration(e.duration) : null,
    duration_seconds: e.duration ? Math.round(e.duration) : null,
    views: e.view_count ?? null,
    thumbnail: thumb,
    url: `https://music.youtube.com/watch?v=${e.id}`
  }

  for (const k of Object.keys(item)) {
    if (item[k] === null || item[k] === undefined || item[k] === '') delete item[k]
  }
  return item
}

function idFromUrl(url) {
  const m =
    String(url).match(/[?&]v=([\w-]{11})/) ||
    String(url).match(/youtu\.be\/([\w-]{11})/) ||
    String(url).match(/\/shorts\/([\w-]{11})/)
  return m ? m[1] : null
}

async function pool(items, size, fn) {
  const res = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        try { res[idx] = await fn(items[idx]) } catch (_) { res[idx] = null }
      }
    })
  )
  return res.filter(Boolean)
}

async function searchEntries(query, limit = 0) {
  const isUnlimited = !limit || limit <= 0 || !Number.isFinite(limit)
  const target = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`
  let out
  try {
    const args = ['--flat-playlist', '-J']
    if (!isUnlimited) args.push('--playlist-end', String(limit * 3))
    args.push(target)
    out = await runYtDlp(args, 120_000)
  } catch (_) {
    out = await runYtDlp(['--flat-playlist', '-J', `ytsearch${isUnlimited ? 100 : limit * 3}:${query} audio`], 120_000)
  }
  const data = JSON.parse(out)
  const seen = new Set()
  const entries = (data.entries || []).filter((e) => {
    if (!e || !/^[\w-]{11}$/.test(e.id || '') || seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
  return isUnlimited ? entries : entries.slice(0, limit)
}

/**
 * Mengambil metadata lengkap 1 lagu YouTube Music berdasarkan Video ID
 * @param {string} id - Video ID 11 karakter
 */
export async function getTrackInfo(id) {
  const out = await runYtDlp(['--no-playlist', '--skip-download', '-J', `https://music.youtube.com/watch?v=${id}`], 90_000)
  return normalizeTrack(JSON.parse(out))
}

/**
 * Mengunduh audio dari URL YouTube / YouTube Music menggunakan yt-dlp + ffmpeg
 * @param {string|object} urlOrItem
 * @param {object} [opts]
 * @param {string} [opts.outDir='music']
 * @param {'mp3'|'m4a'|'opus'|'flac'|'wav'} [opts.format='mp3']
 */
export async function downloadTrack(urlOrItem, { outDir = 'music', format = 'mp3' } = {}) {
  const targetUrl = typeof urlOrItem === 'string' ? urlOrItem : urlOrItem?.url
  if (!targetUrl) throw new Error('URL lagu tidak valid!')
  fs.mkdirSync(outDir, { recursive: true })
  const out = await runYtDlp(
    [
      '--no-playlist',
      '-x', '--audio-format', format, '--audio-quality', '0',
      '-o', path.join(outDir, '%(title)s.%(ext)s'),
      '--print', 'after_move:filepath',
      targetUrl
    ],
    600_000
  )
  return out.trim().split('\n').pop()
}

/**
 * Mencari lagu di YouTube Music (limit = 0 untuk Unlimited) & opsional langsung unduh audio
 * @param {string} query - Judul lagu, nama artis, atau link YouTube / YouTube Music
 * @param {object} [opts]
 * @param {number} [opts.limit=0] - 0 = Unlimited (ambil semua hasil)
 * @param {boolean} [opts.download=false]
 * @param {string} [opts.outDir='music']
 * @param {'mp3'|'m4a'|'opus'|'flac'|'wav'} [opts.format='mp3']
 * @param {boolean} [opts.detailed=false] - true untuk ambil metadata album penuh per lagu
 */
export async function ytmusic(query, { limit = 0, download = false, outDir = 'music', format = 'mp3', detailed = false } = {}) {
  if (!query || !String(query).trim()) throw new Error('Query / link kosong!')
  const cleanQuery = String(query).trim()

  let result = []
  if (/^https?:\/\//i.test(cleanQuery)) {
    const id = idFromUrl(cleanQuery)
    if (!id) throw new Error('Link YouTube / YouTube Music tidak valid!')
    result = [await getTrackInfo(id)]
  } else {
    const entries = await searchEntries(cleanQuery, limit)
    if (!entries.length) throw new Error('Tidak ada hasil ditemukan.')
    result = detailed
      ? await pool(entries.map((e) => e.id), 3, getTrackInfo)
      : entries.map(normalizeTrack)
  }

  if (!result.length) throw new Error('Gagal mengambil detail lagu.')
  if (download) result[0].file = await downloadTrack(result[0], { outDir, format })

  return {
    status: true,
    query: cleanQuery,
    limit: !limit || limit <= 0 ? 'unlimited' : limit,
    total: result.length,
    result
  }
}

export default {
  ytmusic,
  getTrackInfo,
  downloadTrack
}
