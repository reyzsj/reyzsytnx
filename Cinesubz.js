// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 23 Oktober 2026
// 🍂 Function : CineSubz Search Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://cinesubz.net/wp-json/zetaflix/search/'
const DEFAULT_NONCE = '11c13d6e10'
const TIMEOUT = 30_000

/**
 * Mencari film atau series di CineSubz berdasarkan kata kunci
 * @param {string} keyword - Judul film/series yang dicari
 * @param {string} [nonce] - Token nonce opsi (Default: 11c13d6e10)
 */
export async function requestApi(keyword, nonce = DEFAULT_NONCE) {
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    throw new Error('Kata kunci (keyword) tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const query = new URLSearchParams({
      keyword: keyword.trim(),
      nonce: (nonce || DEFAULT_NONCE).trim()
    })

    const endpoint = `${BASE_URL}?${query.toString()}`

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Referer': 'https://cinesubz.net/'
      },
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error: HTTP ${res.status}`)

    return {
      status: true,
      query: keyword.trim(),
      raw_data: data || { result: rawText }
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  requestApi
}
