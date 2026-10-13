// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 13 Oktober 2026
// 🍂 Function : Julzaexce Temp Mail Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://www.julzaexce.my.id/api/tempmail'
const TIMEOUT = 20_000

function getExpirationInfo() {
  const now = new Date()
  const expired = new Date(now.getTime() + 10 * 60000) 
  
  return {
    createdAt: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    estimatedExpiredAt: expired.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    note: 'Estimasi kedaluwarsa 10 menit (menyesuaikan standar server API).'
  }
}

/**
 * Membuat alamat email sementara
 * @param {string} name - Username/nama untuk alamat email
 */
export async function createTempMail(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Username email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ name: name.trim() }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    }

    const result = data || { result: rawText }
    result.expiration_info = getExpirationInfo()
    
    return result
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memeriksa kotak masuk (inbox) email sementara
 * @param {string} key - Secret key yang didapatkan saat pembuatan email
 */
export async function checkInbox(key) {
  if (!key || typeof key !== 'string' || !key.trim()) {
    throw new Error('Key tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const url = `${BASE_URL}/inbox?key=${encodeURIComponent(key.trim())}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
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
  createTempMail,
  checkInbox
}
