// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 13 November 2026
// 🍂 Function : WA Channel Auto React Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Dilengkapi Auto Random Person Name Generator.
// Error fix sendiri.
// ---------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE_URL = 'https://www.leovan.my.id'
const CACHE_FILE = path.join(os.tmpdir(), '.leovan_react_session.json')
const TIMEOUT = 35_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

const FIRST_NAMES = [
  'Rizky', 'Dimas', 'Fajar', 'Bagas', 'Putra', 'Reza', 'Aldi', 'Ilham', 'Gilang', 'Kevin',
  'Nabila', 'Alya', 'Tiara', 'Siti', 'Putri', 'Anisa', 'Nadya', 'Citra', 'Dewi', 'Zahra'
]
const LAST_NAMES = [
  'Pratama', 'Saputra', 'Nugroho', 'Ramadhan', 'Hidayat', 'Wijaya', 'Santoso', 'Kusuma',
  'Maharani', 'Permata', 'Lestari', 'Pangestu', 'Setiawan', 'Firmansyah', 'Wardhani'
]

let silentVault = {
  cookie: '',
  autoName: '',
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

async function getAutoRandomName(forceNew = true) {
  loadSilentCache()
  if (!forceNew && silentVault.autoName) return silentVault.autoName

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch('https://randomuser.me/api/?inc=name&nat=us,gb,au', { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      const user = data?.results?.[0]?.name
      if (user?.first && user?.last) {
        silentVault.autoName = `${user.first} ${user.last}`
        saveSilentCache()
        return silentVault.autoName
      }
    }
  } catch (_) {}

  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  silentVault.autoName = `${fn} ${ln}`
  saveSilentCache()
  return silentVault.autoName
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
  if (!silentVault.autoName) await getAutoRandomName(true)
  if (silentVault.cookie && Date.now() - (silentVault.updatedAt || 0) < 15 * 60 * 1000) {
    return
  }

  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, 'Accept': 'text/html' },
      signal
    })
    const c = extractSetCookies(res.headers)
    if (c) silentVault.cookie = c
    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

/**
 * Mengirim reaction otomatis ke postingan saluran WhatsApp dengan nama acak otomatis
 * @param {string} postUrl - URL postingan saluran WhatsApp
 * @param {string} [emoji='🔥,❤️,👍'] - Daftar emoji dipisahkan koma
 */
export async function sendChannelReact(postUrl, emoji = '🔥,❤️,👍') {
  if (!postUrl || typeof postUrl !== 'string' || !postUrl.startsWith('http')) {
    throw new Error('URL postingan saluran WhatsApp wajib diisi!')
  }
  const cleanUrl = postUrl.trim()
  const cleanEmoji = String(emoji).trim()
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)
    const autoName = await getAutoRandomName(true)
    const nameCookie = `name=${encodeURIComponent(autoName)}; user_name=${encodeURIComponent(autoName)}`

    const headers = {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
      'X-User-Name': autoName,
      'Cookie': silentVault.cookie ? `${silentVault.cookie}; ${nameCookie}` : nameCookie
    }

    const payload = {
      name: autoName,
      nama: autoName,
      username: autoName,
      url: cleanUrl,
      link: cleanUrl,
      emoji: cleanEmoji,
      emojis: cleanEmoji,
      react: cleanEmoji
    }

    const res = await fetch(`${BASE_URL}/api/react`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    const newCookie = extractSetCookies(res.headers)
    if (newCookie) {
      silentVault.cookie = newCookie
      saveSilentCache()
    }

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      const errMsg = data?.message || data?.error || rawText.slice(0, 200)
      throw new Error(`API Error HTTP ${res.status}: ${errMsg}`)
    }

    return { status: true, used_name: autoName, url: cleanUrl, emoji: cleanEmoji, response: data || rawText }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  sendChannelReact
}
