// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 28 November 2026
// 🍂 Function : Apple Music Scraper Base Module (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch (Zero NPM Dependency, Node.js v18+).
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const TIMEOUT = 25_000
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'

export function formatArtwork(url = '', size = 1000) {
  if (!url) return null
  return String(url)
    .replace(/(?:%7B|\{)w(?:%7D|\})/gi, String(size))
    .replace(/(?:%7B|\{)h(?:%7D|\})/gi, String(size))
    .replace(/(?:%7B|\{)c(?:%7D|\})/gi, 'bb')
    .replace(/(?:%7B|\{)f(?:%7D|\})/gi, 'jpg')
    .replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, `/${size}x${size}bb.jpg`)
}

function formatDuration(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const s = Math.round(input / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  const iso = String(input || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i)
  if (!iso) return null
  const h = Number(iso[1] || 0), m = Number(iso[2] || 0), s = Number(iso[3] || 0)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

function decodeHtml(str = '') {
  return String(str)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
}

function parseAppleUrl(rawUrl) {
  const str = String(rawUrl || '').trim()
  if (/^\d+$/.test(str)) {
    return { url: null, country: 'id', type: 'id', id: str, songId: null }
  }
  let u
  try { u = new URL(str) } catch { throw new Error('URL Apple Music tidak valid!') }
  if (!/music\.apple\.com$/i.test(u.hostname)) {
    throw new Error('Domain harus music.apple.com!')
  }
  const parts = u.pathname.split('/').filter(Boolean)
  const hasCountry = parts[0] && /^[a-z]{2}$/i.test(parts[0])
  const country = hasCountry ? parts[0].toLowerCase() : 'us'
  const offset = hasCountry ? 1 : 0
  return {
    url: u.toString(),
    country,
    type: (parts[offset] || '').toLowerCase(),
    id: parts[parts.length - 1] || '',
    songId: u.searchParams.get('i') || null
  }
}

function extractJsonLd(html = '') {
  const list = []
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { list.push(JSON.parse(m[1].trim())) } catch {}
  }
  return list
}

function extractMeta(html = '') {
  const get = (key) => {
    const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i')
    const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
    return decodeHtml(html.match(a)?.[1] || html.match(b)?.[1] || '').trim()
  }
  return {
    title: get('og:title') || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim(),
    description: get('og:description') || get('description'),
    image: formatArtwork(get('og:image'), 1000)
  }
}

/**
 * Cari lagu / album / artis di Apple Music
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.country='id']
 * @param {'song'|'album'|'musicArtist'|'musicVideo'} [opts.entity='song']
 * @param {number} [opts.limit=10]
 */
export async function searchAppleMusic(query, { country = 'id', entity = 'song', limit = 10 } = {}) {
  const term = String(query || '').trim()
  if (!term) throw new Error('Kata kunci pencarian wajib diisi!')

  const params = new URLSearchParams({
    term,
    country: String(country || 'id').toLowerCase(),
    media: 'music',
    entity,
    limit: String(Math.max(1, Math.min(50, Number(limit) || 10)))
  })

  const res = await fetch(`https://itunes.apple.com/search?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} dari Apple Search API`)
  const data = await res.json()

  const results = (data.results || []).map((r) => ({
    id: String(r.trackId || r.collectionId || r.artistId || ''),
    type: r.kind || r.wrapperType || entity,
    title: r.trackName || r.collectionName || r.artistName || '',
    artist: r.artistName || '',
    album: r.collectionName || null,
    genre: r.primaryGenreName || null,
    release_date: r.releaseDate ? r.releaseDate.slice(0, 10) : null,
    duration: formatDuration(r.trackTimeMillis),
    explicit: r.trackExplicitness === 'explicit' || r.collectionExplicitness === 'explicit',
    artwork: formatArtwork(r.artworkUrl100 || r.artworkUrl60, 1000),
    preview_url: r.previewUrl || null,
    url: r.trackViewUrl || r.collectionViewUrl || r.artistLinkUrl || null
  }))

  return { success: true, query: term, country, entity, total: results.length, results }
}

/**
 * Ambil detail lengkap dari URL music.apple.com (Song / Album / Playlist / Artist) atau ID
 * @param {string} urlOrId
 */
export async function getAppleMusicDetail(urlOrId) {
  const info = parseAppleUrl(urlOrId)
  const lookupId = info.songId || (/^\d+$/.test(info.id) ? info.id : null)

  if (lookupId) {
    const entity = info.type === 'album' && !info.songId ? 'song' : (info.type === 'artist' ? 'album' : 'song')
    const lRes = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(lookupId)}&country=${info.country}&entity=${entity}&limit=50`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) }
    ).catch(() => null)
    const lData = lRes?.ok ? await lRes.json().catch(() => null) : null

    if (lData?.results?.length) {
      const main = lData.results[0]
      const tracks = lData.results
        .filter((x) => x.wrapperType === 'track')
        .map((t, i) => ({
          number: t.trackNumber || i + 1,
          id: String(t.trackId),
          title: t.trackName,
          artist: t.artistName,
          album: t.collectionName,
          duration: formatDuration(t.trackTimeMillis),
          preview_url: t.previewUrl || null,
          url: t.trackViewUrl || null
        }))

      return {
        success: true,
        source: 'itunes_lookup',
        type: main.kind || main.collectionType || main.wrapperType || info.type,
        id: String(main.trackId || main.collectionId || main.artistId || lookupId),
        title: main.trackName || main.collectionName || main.artistName,
        artist: main.artistName || null,
        album: main.collectionName || null,
        genre: main.primaryGenreName || null,
        release_date: main.releaseDate ? main.releaseDate.slice(0, 10) : null,
        track_count: main.trackCount || tracks.length,
        copyright: main.copyright || null,
        artwork: formatArtwork(main.artworkUrl100 || main.artworkUrl60, 1000),
        preview_url: main.previewUrl || tracks[0]?.preview_url || null,
        url: info.url || main.trackViewUrl || main.collectionViewUrl || main.artistLinkUrl,
        tracks
      }
    }
  }

  if (!info.url) throw new Error('Data ID tidak ditemukan di Apple Music.')
  const res = await fetch(info.url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`Gagal membuka halaman Apple Music (HTTP ${res.status})`)
  const html = await res.text()

  const meta = extractMeta(html)
  const musicSchema = extractJsonLd(html).find((s) =>
    /MusicAlbum|MusicPlaylist|MusicRecording|MusicGroup/i.test(String(s['@type'] || ''))
  ) || null

  const rawTracks = Array.isArray(musicSchema?.track)
    ? musicSchema.track
    : (Array.isArray(musicSchema?.tracks) ? musicSchema.tracks : [])

  const tracks = rawTracks.map((t, i) => ({
    number: i + 1,
    title: t.name || '',
    artist: Array.isArray(t.byArtist) ? t.byArtist.map((a) => a.name).join(', ') : (t.byArtist?.name || null),
    album: t.inAlbum?.name || null,
    duration: formatDuration(t.duration),
    url: t.url || null
  }))

  return {
    success: true,
    source: 'apple_music_ssr',
    type: musicSchema?.['@type'] || info.type || 'page',
    id: info.id,
    title: musicSchema?.name || meta.title,
    artist: Array.isArray(musicSchema?.byArtist)
      ? musicSchema.byArtist.map((a) => a.name).join(', ')
      : (musicSchema?.byArtist?.name || musicSchema?.author?.name || null),
    description: musicSchema?.description || meta.description || null,
    release_date: musicSchema?.datePublished || null,
    artwork: formatArtwork(musicSchema?.image || meta.image, 1000),
    url: res.url,
    track_count: musicSchema?.numTracks || tracks.length,
    tracks
  }
}

/**
 * Ambil rilis album, playlist, dan artis terbaru dari halaman /<country>/new
 * @param {string} [country='id']
 * @param {number} [limit=30]
 */
export async function getAppleMusicNew(country = 'id', limit = 30) {
  const cc = String(country || 'id').toLowerCase()
  const res = await fetch(`https://music.apple.com/${cc}/new`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`Gagal membuka music.apple.com/${cc}/new (HTTP ${res.status})`)
  const html = await res.text()

  const seen = new Set()
  const albums = [], playlists = [], artists = []
  const re = /<a\b[^>]*href=["'](https:\/\/music\.apple\.com\/[a-z]{2}\/(album|playlist|artist)\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const m of html.matchAll(re)) {
    const url = m[1], kind = m[2].toLowerCase()
    const title = decodeHtml(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (!title || seen.has(url)) continue
    seen.add(url)
    const item = { title, id: url.split('/').pop(), url }
    if (kind === 'album' && albums.length < limit) albums.push(item)
    else if (kind === 'playlist' && playlists.length < limit) playlists.push(item)
    else if (kind === 'artist' && artists.length < limit) artists.push(item)
  }

  return {
    success: true,
    country: cc,
    url: res.url,
    counts: { albums: albums.length, playlists: playlists.length, artists: artists.length },
    albums,
    playlists,
    artists
  }
}

export default {
  searchAppleMusic,
  getAppleMusicDetail,
  getAppleMusicNew,
  formatArtwork
}
