// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 28 Oktober 2026
// 🍂 Function : AM JZCloud Full Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://am.jzcloud.web.id'
const API_STATS = `${BASE_URL}/api/stats`
const API_SEND = `${BASE_URL}/api/send-link`
const API_VERIFY = `${BASE_URL}/api/verify-link`
const TIMEOUT = 30_000

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
}

/**
 * Mengambil statistik aktivasi server AM JZCloud.
 */
export async function getStats() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_STATS, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengirim permintaan Magic Link ke email Alight Motion.
 * @param {string} email - Alamat email target
 */
export async function sendLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_SEND, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memverifikasi Magic Link Alight Motion.
 * @param {string} email - Alamat email terdaftar
 * @param {string} magicLink - URL Magic Link lengkap
 */
export async function verifyLink(email, magicLink) {
  if (!email || !magicLink || typeof magicLink !== 'string' || !magicLink.trim()) {
    throw new Error('Email dan Magic Link tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_VERIFY, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        magicLink: magicLink.trim()
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  getStats,
  sendLink,
  verifyLink
}
