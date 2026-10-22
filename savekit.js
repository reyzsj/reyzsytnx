// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 22 Oktober 2026
// 🍂 Function : SaveKit.io TikTok Scraper Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://savekit.io/api/action/search'
const DEFAULT_TOKEN = '1792673976.e1f91ad67de9faded1d3e7cc21305aef.4FyPBwED-AyvsHX4SOsLuwxW-zD7UQs2oftSpKVJT7g'
const TIMEOUT = 30_000

/**
 * Mengekstrak media TikTok dari endpoint SaveKit.io
 * @param {string} tiktokUrl - URL Video TikTok yang valid
 * @param {string} [token] - Optional x-request-token
 */
export async function requestApi(tiktokUrl, token = DEFAULT_TOKEN) {
  if (!tiktokUrl || typeof tiktokUrl !== 'string' || !tiktokUrl.trim()) {
    throw new Error('URL TikTok tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const endpoint = `${BASE_URL}?url=${encodeURIComponent(tiktokUrl.trim())}`

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Referer': 'https://savekit.io/',
        'x-request-token': token.trim()
      },
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error: HTTP ${res.status}`)

    return {
      status: true,
      url: tiktokUrl.trim(),
      raw_data: data || { result: rawText }
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  requestApi
}
