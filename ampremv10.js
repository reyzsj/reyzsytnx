// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 5 November 2026
// 🍂 Function : AM Noxxyrorr Verifier Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://am.noxxyrorr.biz.id'
const API_SEND = `${BASE_URL}/api/send-link`
const API_VERIFY = `${BASE_URL}/api/verify-link`
const TIMEOUT = 30_000

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

/**
 * Mengirim permintaan link verifikasi ke email (/api/send-link)
 * @param {string} email - Alamat email target (contoh: rrrgamal3@gmail.com)
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
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        email: email.trim()
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText.slice(0, 300)}`)
    }

    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memverifikasi tautan Magic Link beserta cookie sesi (/api/verify-link)
 * @param {string} email - Alamat email terdaftar
 * @param {string} magicLink - URL Magic Link lengkap dari inbox
 * @param {string} cookie - Cookie session (contoh: am_sess_...)
 */
export async function verifyLink(email, magicLink, cookie) {
  if (!email || !magicLink || !cookie) {
    throw new Error('Parameter email, magicLink, dan cookie tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const payload = {
      email: String(email).trim(),
      magicLink: String(magicLink).trim(),
      cookie: String(cookie).trim()
    }

    const res = await fetch(API_VERIFY, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText.slice(0, 300)}`)
    }

    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  sendLink,
  verifyLink
}
