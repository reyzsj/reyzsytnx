// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 23 Oktober 2026
// 🍂 Function : AM Zervida Verifier Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const API_LINK = 'https://am.zervida.my.id/api/amprem/link'
const API_CLAIM = 'https://am.zervida.my.id/api/amprem/claim'
const TIMEOUT = 30_000

/**
 * Mengirim permintaan Magic Link ke email Alight Motion.
 * @param {string} email - Alamat email target
 */
export async function sendMagicLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_LINK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email: email.trim() }),
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
 * Mengklaim Magic Link untuk mengaktifkan status Premium.
 * @param {string} email - Alamat email terdaftar
 * @param {string} link - URL Magic Link lengkap
 */
export async function claimMagicLink(email, link) {
  if (!email || !link) {
    throw new Error('Email dan Magic Link tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_CLAIM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        link: link.trim()
      }),
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

export default {
  sendMagicLink,
  claimMagicLink
}
