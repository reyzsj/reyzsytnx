// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 24 November 2026
// 🍂 Function : EmailQu Temporary Email & Link Extractor Base Module (ESM)
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

const BASE = 'https://emailqu.com'
const TIMEOUT = 15_000
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://emailqu.com/'
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data) throw new Error(`HTTP ${res.status} pada ${path}`)
  return data
}

/**
 * Ambil isi mentah pesan dari berbagai kemungkinan field API
 * @param {object} m
 */
export function extractBody(m = {}) {
  const raw =
    m.html || m.html_body || m.body_html || m.html_content || m.htmlContent ||
    m.text || m.text_body || m.body_text || m.text_content || m.textContent ||
    m.body || m.content || m.message || ''
  return String(raw)
}

/**
 * Ekstrak semua URL dari atribut HTML href maupun teks polos
 * @param {string} raw
 */
export function extractLinks(raw = '') {
  const urls = new Set()
  for (const m of raw.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    urls.add(m[1].replace(/&amp;/g, '&'))
  }
  for (const m of raw.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    urls.add(m[0].replace(/&amp;/g, '&'))
  }
  return [...urls]
}

/**
 * Bersihkan tag HTML menjadi teks biasa
 * @param {string} raw
 */
export function stripHtml(raw = '') {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ambil username acak dari EmailQu
 */
export async function getRandomUsername() {
  const data = await getJson('/api/random-username')
  if (!data.username) throw new Error('Gagal mengambil username acak.')
  return data.username
}

/**
 * Ambil daftar domain aktif dari EmailQu
 */
export async function getRandomDomains() {
  const data = await getJson('/api/domains/random')
  const list = Array.isArray(data.domains) ? data.domains : []
  if (!list.length) throw new Error('Daftar domain kosong.')
  return list.map((d) => (typeof d === 'string' ? d : d.domain || d.name)).filter(Boolean)
}

/**
 * Buat alamat email sementara baru (acak atau custom username)
 * @param {string} [customUser='']
 */
export async function createTempEmail(customUser = '') {
  const [username, domains] = await Promise.all([
    customUser ? Promise.resolve(customUser.trim()) : getRandomUsername(),
    getRandomDomains()
  ])
  const domain = domains[0]
  return {
    success: true,
    email: `${username}@${domain}`,
    username,
    domain,
    available_domains: domains
  }
}

/**
 * Ambil daftar pesan masuk sekaligus ekstrak teks bersih & link aktivasi
 * @param {string} email
 * @param {number} [limit=20]
 */
export async function getInbox(email, limit = 20) {
  const addr = String(email || '').trim().toLowerCase()
  if (!addr.includes('@')) throw new Error('Format email tidak valid!')
  const data = await getJson(`/api/public/emails/${encodeURIComponent(addr)}?limit=${limit}`)
  const emails = (data.emails || []).map((m) => {
    const raw = extractBody(m)
    return {
      ...m,
      clean_text: stripHtml(raw),
      links: extractLinks(raw)
    }
  })
  return {
    success: Boolean(data.success),
    address: data.address || addr,
    count: data.count ?? emails.length,
    emails
  }
}

export default {
  extractBody,
  extractLinks,
  stripHtml,
  getRandomUsername,
  getRandomDomains,
  createTempEmail,
  getInbox
}
