// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 11 November 2026
// 🍂 Function : Pixiv Artwork & HD Downloader Base Module (ESM)
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

const PIXIV_BASE = 'https://www.pixiv.net'
const PXIMG_MIRROR = 'https://i.pixiv.re'
const OBFS_API = 'https://api.obfs.dev/api/pixiv'
const CACHE_FILE = path.join(os.tmpdir(), '.pixiv_silent_session.json')
const TIMEOUT = 35_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8,ja;q=0.7',
  'Referer': `${PIXIV_BASE}/`,
  'Origin': PIXIV_BASE,
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

/**
 * Mengonversi URL gambar i.pximg.net menjadi i.pixiv.re agar bebas dari blokir hotlink HTTP 403
 * @param {string} pximgUrl - URL asli dari i.pximg.net
 */
export function toPixivBypassUrl(pximgUrl = '') {
  if (!pximgUrl || typeof pximgUrl !== 'string') return null
  return pximgUrl.replace(/^https?:\/\/i\.pximg\.net/i, PXIMG_MIRROR)
}

function stripHtml(str = '') {
  return String(str)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

async function ensureSilentSession(signal) {
  loadSilentCache()
  if (silentVault.cookie && Date.now() - (silentVault.updatedAt || 0) < 20 * 60 * 1000) {
    return
  }

  try {
    const res = await fetch(`${PIXIV_BASE}/`, {
      method: 'GET',
      headers: {
        ...BROWSER_HEADERS,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal
    })
    const c = extractSetCookies(res.headers)
    if (c) silentVault.cookie = c
    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

async function fetchPixivJson(url, signal) {
  await ensureSilentSession(signal)
  const headers = { ...BROWSER_HEADERS }
  if (silentVault.cookie) headers['Cookie'] = silentVault.cookie

  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal
  })

  const newCookie = extractSetCookies(res.headers)
  if (newCookie) {
    silentVault.cookie = newCookie
    saveSilentCache()
  }

  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch (_) {}

  if (!res.ok || !data) {
    throw new Error(`API Error HTTP ${res.status}: Gagal memuat data dari Pixiv`)
  }
  return data
}

/**
 * Mencari karya ilustrasi atau manga di Pixiv berdasarkan kata kunci / tag
 * @param {string} keyword - Kata kunci pencarian
 * @param {number} [page=1] - Nomor halaman
 */
export async function searchPixiv(keyword, page = 1) {
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    throw new Error('Kata kunci pencarian tidak boleh kosong!')
  }

  const cleanWord = keyword.trim()
  const cleanPage = Number(page) || 1
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    try {
      const ajaxUrl = `${PIXIV_BASE}/ajax/search/artworks/${encodeURIComponent(cleanWord)}?word=${encodeURIComponent(cleanWord)}&order=date_d&mode=all&p=${cleanPage}&s_mode=s_tag&type=all&lang=en`
      const json = await fetchPixivJson(ajaxUrl, controller.signal)
      const illustManga = json?.body?.illustManga

      if (illustManga && Array.isArray(illustManga.data)) {
        const results = illustManga.data
          .filter((item) => item && item.id)
          .map((item) => ({
            id: String(item.id),
            title: item.title || '-',
            author: item.userName || '-',
            author_id: item.userId || '-',
            page_count: item.pageCount || 1,
            width: item.width || 0,
            height: item.height || 0,
            tags: item.tags || [],
            create_date: item.createDate || '-',
            thumbnail_original: item.url || null,
            thumbnail_bypass: toPixivBypassUrl(item.url),
            artwork_url: `${PIXIV_BASE}/en/artworks/${item.id}`
          }))

        return {
          status: true,
          query: cleanWord,
          page: cleanPage,
          total: illustManga.total || results.length,
          results
        }
      }
    } catch (_) {}

    const fallbackRes = await fetch(`${OBFS_API}/search?word=${encodeURIComponent(cleanWord)}&page=${cleanPage}`, {
      method: 'GET',
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      signal: controller.signal
    })
    const fbJson = await fallbackRes.json().catch(() => null)
    const illusts = fbJson?.illusts || []

    const results = illusts.map((item) => {
      const origUrl = item.meta_single_page?.original_image_url || item.image_urls?.large || item.image_urls?.medium
      return {
        id: String(item.id),
        title: item.title || '-',
        author: item.user?.name || '-',
        author_id: item.user?.id || '-',
        page_count: item.page_count || 1,
        width: item.width || 0,
        height: item.height || 0,
        tags: (item.tags || []).map((t) => t.name),
        create_date: item.create_date || '-',
        thumbnail_original: origUrl || null,
        thumbnail_bypass: toPixivBypassUrl(origUrl),
        artwork_url: `${PIXIV_BASE}/en/artworks/${item.id}`
      }
    })

    return {
      status: true,
      query: cleanWord,
      page: cleanPage,
      total: results.length,
      results
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengambil detail lengkap artwork Pixiv beserta seluruh halaman gambar resolusi asli (HD)
 * @param {string|number} illustId - ID Artwork Pixiv
 */
export async function getPixivIllust(illustId) {
  const cleanId = String(illustId || '').trim().replace(/\D/g, '')
  if (!cleanId) {
    throw new Error('ID Artwork Pixiv wajib diisi dengan angka!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    try {
      const [detailJson, pagesJson] = await Promise.all([
        fetchPixivJson(`${PIXIV_BASE}/ajax/illust/${cleanId}?lang=en`, controller.signal),
        fetchPixivJson(`${PIXIV_BASE}/ajax/illust/${cleanId}/pages?lang=en`, controller.signal).catch(() => null)
      ])

      const b = detailJson?.body
      if (b && b.illustId) {
        const rawPages = Array.isArray(pagesJson?.body) && pagesJson.body.length > 0
          ? pagesJson.body
          : [{ urls: b.urls, width: b.width, height: b.height }]

        const images = rawPages.map((p, idx) => {
          const orig = p.urls?.original || b.urls?.original
          const regular = p.urls?.regular || b.urls?.regular
          return {
            page: idx + 1,
            width: p.width || b.width,
            height: p.height || b.height,
            original_pximg: orig,
            original_bypass: toPixivBypassUrl(orig),
            regular_bypass: toPixivBypassUrl(regular)
          }
        })

        return {
          status: true,
          id: String(b.illustId),
          title: b.illustTitle || b.title || '-',
          description: stripHtml(b.illustComment || b.description || '-'),
          author: b.userName || '-',
          author_id: String(b.userId || '-'),
          create_date: b.createDate || '-',
          page_count: b.pageCount || images.length,
          views: b.viewCount ?? 0,
          bookmarks: b.bookmarkCount ?? 0,
          likes: b.likeCount ?? 0,
          tags: (b.tags?.tags || []).map((t) => t.tag),
          artwork_url: `${PIXIV_BASE}/en/artworks/${b.illustId}`,
          images
        }
      }
    } catch (_) {}

    const fbRes = await fetch(`${OBFS_API}/member_illust?id=${cleanId}`, {
      method: 'GET',
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      signal: controller.signal
    })
    const fbData = await fbRes.json().catch(() => null)
    const item = fbData?.illust
    if (!item) {
      throw new Error(`Artwork dengan ID ${cleanId} tidak ditemukan.`)
    }

    const images = []
    if (item.meta_pages && item.meta_pages.length > 0) {
      item.meta_pages.forEach((p, idx) => {
        const orig = p.image_urls?.original || p.image_urls?.large
        images.push({
          page: idx + 1,
          width: item.width,
          height: item.height,
          original_pximg: orig,
          original_bypass: toPixivBypassUrl(orig)
        })
      })
    } else {
      const orig = item.meta_single_page?.original_image_url || item.image_urls?.large
      images.push({
        page: 1,
        width: item.width,
        height: item.height,
        original_pximg: orig,
        original_bypass: toPixivBypassUrl(orig)
      })
    }

    return {
      status: true,
      id: String(item.id),
      title: item.title || '-',
      description: stripHtml(item.caption || '-'),
      author: item.user?.name || '-',
      author_id: String(item.user?.id || '-'),
      create_date: item.create_date || '-',
      page_count: item.page_count || images.length,
      views: item.total_view ?? 0,
      bookmarks: item.total_bookmarks ?? 0,
      tags: (item.tags || []).map((t) => t.name),
      artwork_url: `${PIXIV_BASE}/en/artworks/${item.id}`,
      images
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengambil daftar peringkat (Ranking) ilustrasi terpopuler di Pixiv
 * @param {string} [mode='daily'] - Mode ranking ('daily' | 'weekly' | 'monthly' | 'rookie' | 'original' | 'male' | 'female')
 * @param {number} [page=1] - Nomor halaman
 */
export async function getPixivRanking(mode = 'daily', page = 1) {
  const validModes = ['daily', 'weekly', 'monthly', 'rookie', 'original', 'male', 'female']
  const cleanMode = validModes.includes(String(mode).toLowerCase()) ? String(mode).toLowerCase() : 'daily'
  const cleanPage = Number(page) || 1

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const rankUrl = `${PIXIV_BASE}/ranking.php?mode=${cleanMode}&content=illust&p=${cleanPage}&format=json`
    const data = await fetchPixivJson(rankUrl, controller.signal)
    const contents = data?.contents || []

    const results = contents.map((c) => ({
      rank: c.rank,
      id: String(c.illust_id),
      title: c.title || '-',
      author: c.user_name || '-',
      author_id: String(c.user_id || '-'),
      page_count: Number(c.illust_page_count) || 1,
      views: c.view_count ?? 0,
      rating_count: c.rating_count ?? 0,
      tags: c.tags || [],
      date: c.date || '-',
      thumbnail_original: c.url || null,
      thumbnail_bypass: toPixivBypassUrl(c.url),
      artwork_url: `${PIXIV_BASE}/en/artworks/${c.illust_id}`
    }))

    return {
      status: true,
      mode: cleanMode,
      date: data?.date || '-',
      page: cleanPage,
      total_returned: results.length,
      results
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengunduh gambar asli Pixiv (i.pximg.net) ke penyimpanan lokal dengan Referer Spoofing
 * @param {string} imageUrl - URL gambar Pixiv
 * @param {string} outputPath - Path file lokal tujuan
 */
export async function downloadPixivImage(imageUrl, outputPath) {
  if (!imageUrl || !String(imageUrl).trim()) {
    throw new Error('URL gambar Pixiv wajib diisi!')
  }

  const cleanUrl = String(imageUrl).trim()
  const bypassUrl = toPixivBypassUrl(cleanUrl)
  const routes = [
    { url: cleanUrl, headers: { ...BROWSER_HEADERS, Referer: `${PIXIV_BASE}/` } },
    { url: bypassUrl, headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } }
  ]

  for (const route of routes) {
    try {
      const res = await fetch(route.url, {
        method: 'GET',
        headers: route.headers,
        redirect: 'follow'
      })

      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 500) continue

      const resolvedPath = path.resolve(outputPath)
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
      fs.writeFileSync(resolvedPath, buf)
      return {
        status: true,
        saved_path: resolvedPath,
        size_kb: `${(buf.length / 1024).toFixed(2)} KB`
      }
    } catch (_) {}
  }

  throw new Error('Gagal mengunduh gambar dari server Pixiv.')
}

export default {
  toPixivBypassUrl,
  searchPixiv,
  getPixivIllust,
  getPixivRanking,
  downloadPixivImage
}
