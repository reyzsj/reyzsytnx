// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 12 Oktober 2026
// 🍂 Function : Nexrey Netflix Link Generator Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://nexrey-netflix.vercel.app/api/generate'
const TIMEOUT = 20_000

/**
 * Meminta link generate Netflix ke API Nexrey
 * @param {number} [count=1] - Jumlah link yang ingin digenerate
 * @param {boolean} [stream=false] - Mode streaming respons
 */
export async function generateNetflix(count = 1, stream = false) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        count: Number(count),
        stream: Boolean(stream)
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
  generateNetflix
}
