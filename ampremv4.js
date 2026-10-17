// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 17 Oktober 2026
// 🍂 Function : AM Premium Tools Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://ecinamprem.web.id/api'
const TIMEOUT = 20_000

/**
 * Fungsi untuk melakukan request Send Link (POST)
 * @param {string} email - Email target untuk dikirimkan link
 */
export async function sendLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}/send-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
 * Fungsi untuk melakukan request Verify Link (POST)
 * @param {string} email - Email target
 * @param {string} magicLink - Link verifikasi dari Firebase
 * @param {string} ownerMessage - Pesan dari owner
 * @param {string} deviceId - UUID Device
 */
export async function verifyLink(email, magicLink, ownerMessage, deviceId) {
  if (!email || !magicLink || !deviceId) {
    throw new Error('Data target (Email/MagicLink/DeviceID) tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}/verify-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        magicLink: magicLink.trim(), 
        ownerMessage: ownerMessage.trim(), 
        deviceId: deviceId.trim() 
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
