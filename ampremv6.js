// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 19 Oktober 2026
// 🍂 Function : AM RedZone Verifier Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const API_SEND = 'https://adamnurs.my.id/api/send-link'
const API_VERIFY = 'https://adamnurs.my.id/api/verify-link'
const TIMEOUT = 30_000

/**
 * Mengirim permintaan Magic Link ke email yang dituju.
 * @param {string} email - Alamat email target
 */
export async function sendMagicLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_SEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal
    })

    const rawData = await res.text()
    let data = null; try { data = JSON.parse(rawData) } catch (_) {}
    
    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || rawData}`)
    return data || { result: rawData }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memverifikasi Magic Link untuk mengambil token otentikasi.
 * @param {string} email - Alamat email terdaftar
 * @param {string} magicLink - URL Magic Link lengkap dari inbox
 */
export async function verifyMagicLink(email, magicLink) {
  if (!email || !magicLink) {
    throw new Error('Email dan Magic Link tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: email.trim(), magicLink: magicLink.trim() }),
      signal: controller.signal
    })

    const rawData = await res.text()
    let data = null; try { data = JSON.parse(rawData) } catch (_) {}
    
    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || rawData}`)
    return data || { result: rawData }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  sendMagicLink,
  verifyMagicLink
}
