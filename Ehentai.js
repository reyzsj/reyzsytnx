// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 12 Oktober 2026
// 🍂 Function : E-Hentai Scraper Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://kadokunn.com/nsfw/ehentai'
const TIMEOUT = 25_000

/**
 * Mengambil data E-Hentai berdasarkan opsi parameter
 * @param {Object} options - Parameter request
 * @param {string} [options.url] - URL galeri (/g/...) atau viewer (/s/...)
 * @param {string} [options.query] - Kata kunci / tag pencarian (e.g. 'parody:naruto')
 * @param {number|string} [options.gid] - Gallery ID
 * @param {string} [options.token] - Gallery token
 * @param {number} [options.limit=10] - Jumlah galeri hasil pencarian (max 25)
 * @param {number} [options.max_images=5] - Jumlah gambar full-res yang di-resolve
 * @param {boolean} [options.download=false] - Return bytes gambar langsung jika true
 */
export async function getEhentai(options = {}) {
  const queryParams = new URLSearchParams()

  if (options.url) queryParams.append('url', options.url)
  if (options.query) queryParams.append('query', options.query)
  if (options.gid) queryParams.append('gid', options.gid)
  if (options.token) queryParams.append('token', options.token)
  if (options.limit) queryParams.append('limit', options.limit)
  if (options.max_images) queryParams.append('max_images', options.max_images)
  if (options.download !== undefined) queryParams.append('download', options.download)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const endpoint = `${BASE_URL}?${queryParams.toString()}`
    const res = await fetch(endpoint, {
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
  getEhentai
}
