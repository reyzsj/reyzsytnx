// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 12 Oktober 2026
// 🍂 Function : TikTok Proxy Automation Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_PROXY = 'https://bmskyse.vercel.app/api/proxy'
const TIMEOUT = 30_000
const COOLDOWN_MS = 5 * 60 * 1000 // 5 Menit (300.000 ms)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchApi(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data?.message || data?.massage || data?.error || rawText}`)
    }

    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memvalidasi link TikTok via Proxy API
 * @param {string} tiktokUrl - Full URL video/profile TikTok
 */
export async function validateTikTok(tiktokUrl) {
  if (!tiktokUrl) throw new Error('Link TikTok wajib diisi!')
  return await fetchApi(`${BASE_PROXY}?p=validate&url=${encodeURIComponent(tiktokUrl)}`)
}

/**
 * Mengambil data Favorites TikTok via Proxy API
 * @param {string} tiktokUrl - Full URL video/profile TikTok
 */
export async function getFavorites(tiktokUrl) {
  if (!tiktokUrl) throw new Error('Link TikTok wajib diisi!')
  return await fetchApi(`${BASE_PROXY}?p=favorites&url=${encodeURIComponent(tiktokUrl)}`)
}

/**
 * Memeriksa status Sesi ID via Proxy API
 * @param {string} sesiId - Sesi ID yang ingin dicek
 */
export async function checkSesiId(sesiId) {
  if (!sesiId) throw new Error('Sesi ID wajib diisi!')
  return await fetchApi(`${BASE_PROXY}?p=checkid&sesi-id=${encodeURIComponent(sesiId)}`)
}

/**
 * Otomatisasi: Validate Link TikTok -> Wait 5 Min Cooldown -> Get Favorites TikTok
 * @param {string} tiktokUrl - Full URL video/profile TikTok
 * @param {Function} [onCooldown] - Callback opsional saat cooldown berlangsung
 */
export async function autoProcessTikTok(tiktokUrl, onCooldown = null) {
  if (!tiktokUrl) throw new Error('Link TikTok wajib diisi!')
  
  const validate = await validateTikTok(tiktokUrl)
  const targetUrl = validate.url || tiktokUrl

  if (typeof onCooldown === 'function') {
    await onCooldown(300)
  } else {
    await sleep(COOLDOWN_MS)
  }

  const favorites = await getFavorites(targetUrl)

  return {
    validate,
    favorites
  }
}

export default {
  validateTikTok,
  getFavorites,
  checkSesiId,
  autoProcessTikTok
}
