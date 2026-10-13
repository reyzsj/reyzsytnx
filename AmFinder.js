// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 13 Oktober 2026
// 🍂 Function : Julz Preset Finder Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://julzpreset-finder.vercel.app/api/find'
const TIMEOUT = 20_000

/**
 * Mencari dan mengekstrak link preset dari video TikTok
 * @param {string} tiktokUrl - Link video TikTok target
 */
export async function findPreset(tiktokUrl) {
  if (!tiktokUrl || typeof tiktokUrl !== 'string' || !tiktokUrl.trim()) {
    throw new Error('Link TikTok tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const url = `${BASE_URL}?url=${encodeURIComponent(tiktokUrl.trim())}`
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
  findPreset
}
