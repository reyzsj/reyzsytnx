// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : Modyolo Full Content & WP-API Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Mendukung WP REST API (/posts, /categories, /tip, /tip_cat, /pages) + Detail HTML + Dump All JSON.
// Error fix sendiri.
// ---------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE_URL = 'https://modyolo.com'
const WP_API = `${BASE_URL}/wp-json/wp/v2`
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/html, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function stripHtml(html = '') {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;|&#8217;/gi, "'")
    .replace(/&#8211;|&#8212;/gi, '-')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractImagesFromHtml(html = '') {
  const imgs = new Set()
  const rgx = /(?:src|data-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi
  let m
  while ((m = rgx.exec(String(html))) !== null) imgs.add(m[1])
  return Array.from(imgs)
}

async function wpFetch(endpoint, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const url = `${WP_API}${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT)
  })

  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch (_) {}

  if (!res.ok) {
    const msg = data?.message || rawText.slice(0, 150)
    throw new Error(`API Error HTTP ${res.status}: ${msg}`)
  }

  return {
    data,
    total: Number(res.headers.get('x-wp-total') || (Array.isArray(data) ? data.length : 1)),
    totalPages: Number(res.headers.get('x-wp-totalpages') || 1)
  }
}

function normalizeWpItem(item) {
  const contentHtml = item?.content?.rendered || ''
  return {
    id: item.id,
    type: item.type || 'post',
    slug: item.slug || '',
    date: item.date || '',
    modified: item.modified || '',
    title: stripHtml(item?.title?.rendered || ''),
    link: item.link || '',
    categories: item.categories || item.tip_cat || [],
    excerpt: stripHtml(item?.excerpt?.rendered || ''),
    contentText: stripHtml(contentHtml),
    images: extractImagesFromHtml(contentHtml)
  }
}

async function fetchPaginated(endpoint, maxPages = 3, perPage = 50, delayMs = 600, onLog = () => {}) {
  const all = []
  let page = 1
  let totalPages = 1

  while (page <= Math.min(maxPages, totalPages)) {
    const res = await wpFetch(endpoint, { page, per_page: perPage })
    totalPages = res.totalPages || 1
    const batch = Array.isArray(res.data) ? res.data : []
    all.push(...batch)
    onLog(`${endpoint} halaman ${page}/${Math.min(maxPages, totalPages)} (${all.length}/${res.total})`)
    if (batch.length < perPage || page >= totalPages) break
    page++
    await sleep(delayMs)
  }
  return all
}

/**
 * Mengambil semua tipe konten WordPress yang tersedia (/wp-json/wp/v2/types)
 */
export async function getWpTypes() {
  const { data } = await wpFetch('/types')
  const types = Object.entries(data || {}).map(([key, val]) => ({
    key,
    name: val.name,
    restBase: val.rest_base
  }))
  return { status: true, total: types.length, types }
}

/**
 * Mengambil daftar posts / aplikasi dari /wp-json/wp/v2/posts
 */
export async function getPosts({ page = 1, perPage = 20, search = '', category = '' } = {}) {
  const res = await wpFetch('/posts', { page, per_page: perPage, search, categories: category })
  return {
    status: true,
    page,
    total: res.total,
    totalPages: res.totalPages,
    items: (res.data || []).map(normalizeWpItem)
  }
}

/**
 * Mengambil daftar kategori utama dari /wp-json/wp/v2/categories
 */
export async function getCategories({ page = 1, perPage = 100 } = {}) {
  const res = await wpFetch('/categories', { page, per_page: perPage })
  return {
    status: true,
    page,
    total: res.total,
    totalPages: res.totalPages,
    items: (res.data || []).map((c) => ({
      id: c.id,
      name: stripHtml(c.name),
      slug: c.slug,
      count: c.count,
      link: c.link
    }))
  }
}

/**
 * Mengambil daftar artikel tips dari /wp-json/wp/v2/tip
 */
export async function getTips({ page = 1, perPage = 20, search = '', tipCat = '' } = {}) {
  const res = await wpFetch('/tip', { page, per_page: perPage, search, tip_cat: tipCat })
  return {
    status: true,
    page,
    total: res.total,
    totalPages: res.totalPages,
    items: (res.data || []).map(normalizeWpItem)
  }
}

/**
 * Mengambil daftar kategori tips dari /wp-json/wp/v2/tip_cat
 */
export async function getTipCategories({ page = 1, perPage = 100 } = {}) {
  const res = await wpFetch('/tip_cat', { page, per_page: perPage })
  return {
    status: true,
    page,
    total: res.total,
    totalPages: res.totalPages,
    items: (res.data || []).map((c) => ({
      id: c.id,
      name: stripHtml(c.name),
      slug: c.slug,
      count: c.count,
      link: c.link
    }))
  }
}

/**
 * Mengambil daftar halaman statis dari /wp-json/wp/v2/pages
 */
export async function getPages({ page = 1, perPage = 50 } = {}) {
  const res = await wpFetch('/pages', { page, per_page: perPage })
  return {
    status: true,
    page,
    total: res.total,
    totalPages: res.totalPages,
    items: (res.data || []).map(normalizeWpItem)
  }
}

/**
 * Mencari konten di Modyolo (WP REST API dengan fallback HTML GET /?s=)
 * @param {string} keyword
 * @param {number} [perPage=20]
 */
export async function searchModyolo(keyword, perPage = 20) {
  const clean = String(keyword || '').trim()
  if (!clean) throw new Error('Kata kunci pencarian tidak boleh kosong!')

  const [postRes, tipRes] = await Promise.all([
    getPosts({ search: clean, perPage }).catch(() => ({ items: [] })),
    getTips({ search: clean, perPage: 10 }).catch(() => ({ items: [] }))
  ])

  const combined = [...postRes.items, ...tipRes.items]
  if (combined.length > 0) {
    return { status: true, source: 'wp-json', keyword: clean, total: combined.length, items: combined }
  }

  const res = await fetch(`${BASE_URL}/?s=${encodeURIComponent(clean)}`, {
    headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`API Error HTTP ${res.status}: Gagal mencari konten.`)
  const html = await res.text()

  const items = []
  const seen = new Set()
  const rgx = /<a[^>]+href=["'](https?:\/\/modyolo\.com\/[^"']+\.html)["'][^>]*title=["']([^"']+)["']/gi
  let m
  while ((m = rgx.exec(html)) !== null) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    items.push({ title: stripHtml(m[2]), link: m[1] })
  }

  return { status: true, source: 'html-search', keyword: clean, total: items.length, items }
}

/**
 * Mengekstrak spesifikasi, deskripsi, gambar, dan tautan dari halaman detail Modyolo
 * @param {string} targetUrl - URL halaman (misal: https://modyolo.com/snaptube.html)
 */
export async function getDetailPage(targetUrl) {
  const cleanUrl = String(targetUrl || '').trim()
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('URL halaman Modyolo tidak valid!')
  }

  const res = await fetch(cleanUrl, {
    headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`API Error HTTP ${res.status}: Gagal memuat halaman detail.`)
  const html = await res.text()

  const title =
    stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '') ||
    stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')

  const specs = {}
  const rowRgx = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi
  let rm
  while ((rm = rowRgx.exec(html)) !== null) {
    const key = stripHtml(rm[1])
    const val = stripHtml(rm[2])
    if (key && val) specs[key] = val
  }

  const downloadLinks = []
  const dlSeen = new Set()
  const dlRgx = /href=["'](https?:\/\/modyolo\.com\/download\/[^"']+)["']/gi
  let dm
  while ((dm = dlRgx.exec(html)) !== null) {
    if (!dlSeen.has(dm[1])) {
      dlSeen.add(dm[1])
      downloadLinks.push(dm[1])
    }
  }

  const articleMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)

  const contentHtml = articleMatch?.[1] || ''
  return {
    status: true,
    url: cleanUrl,
    title,
    specs,
    downloadLinks,
    images: extractImagesFromHtml(contentHtml || html).slice(0, 20),
    description: stripHtml(contentHtml).slice(0, 2000)
  }
}

/**
 * Mengambil seluruh isi Modyolo (categories, tip_cat, pages, posts, tip) dan opsional simpan ke JSON
 * @param {object} [opts]
 * @param {number} [opts.maxPages=3] - Maksimal halaman untuk /posts & /tip
 * @param {number} [opts.perPage=50] - Jumlah item per halaman (maks 100)
 * @param {string} [opts.outputFile=''] - Path simpan JSON (kosongkan jika hanya return objek)
 * @param {function} [opts.onLog] - Callback log progres
 */
export async function fetchAllContents({
  maxPages = 3,
  perPage = 50,
  outputFile = '',
  onLog = () => {}
} = {}) {
  const rawCats = await fetchPaginated('/categories', 5, 100, 500, onLog)
  const rawTipCats = await fetchPaginated('/tip_cat', 5, 100, 500, onLog)
  const rawPages = await fetchPaginated('/pages', 3, 50, 500, onLog)
  const rawPosts = await fetchPaginated('/posts', maxPages, perPage, 700, onLog)
  const rawTips = await fetchPaginated('/tip', maxPages, perPage, 700, onLog)

  const dump = {
    source: BASE_URL,
    scrapedAt: new Date().toISOString(),
    summary: {
      categories: rawCats.length,
      tipCategories: rawTipCats.length,
      pages: rawPages.length,
      posts: rawPosts.length,
      tips: rawTips.length
    },
    categories: rawCats.map((c) => ({ id: c.id, name: stripHtml(c.name), slug: c.slug, count: c.count, link: c.link })),
    tipCategories: rawTipCats.map((c) => ({ id: c.id, name: stripHtml(c.name), slug: c.slug, count: c.count, link: c.link })),
    pages: rawPages.map(normalizeWpItem),
    posts: rawPosts.map(normalizeWpItem),
    tips: rawTips.map(normalizeWpItem)
  }

  let savedPath = null
  if (outputFile) {
    savedPath = path.resolve(outputFile)
    fs.writeFileSync(savedPath, JSON.stringify(dump, null, 2), 'utf-8')
  }

  return {
    status: true,
    outputFile: savedPath,
    summary: dump.summary,
    data: dump
  }
}

export default {
  getWpTypes,
  getPosts,
  getCategories,
  getTips,
  getTipCategories,
  getPages,
  searchModyolo,
  getDetailPage,
  fetchAllContents
}
