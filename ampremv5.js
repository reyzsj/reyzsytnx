// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 17 Oktober 2026
// 🍂 Function : VinzCloud Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://vinzcloud.vercel.app/api'
const TIMEOUT = 20_000

const API_KEY_SEND = 'sk_send_prZL_53f3n1L3gJ1yGqoFpcE0j0b9Mo7'
const API_KEY_VERIFY = 'sk_verify_xlHC3q0pGmLXFgUv7ba3sndQRrQwaOvS'

/**
 * Melakukan request Send Link ke VinzCloud API
 * @param {string} email - Email tujuan untuk mengirim magic link
 */
export async function sendLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Data target (Email) tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}/send-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': API_KEY_SEND,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    }

    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Melakukan request Verify Link ke VinzCloud API
 * @param {string} email - Email yang digunakan
 * @param {string} magicLink - Link validasi yang diperoleh
 */
export async function verifyLink(email, magicLink) {
  if (!email || !magicLink) {
    throw new Error('Data target (Email / Magic Link) tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}/verify-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': API_KEY_VERIFY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        magicLink: magicLink.trim() 
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
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
