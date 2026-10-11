// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Website Performance Rating Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://apiii-xrina.my.id/tools/rateweb'
const TIMEOUT = 60_000
const RETRIES = 3
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504])

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getHeaders(attemptIndex) {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length]
  }
}

/**
 * Audit performa/kecepatan website
 * @param {string} targetUrl - URL website target (misal: 'https://nftools.live')
 * @param {string} [strategy='mobile'] - Strategy audit ('mobile', 'desktop', 'both')
 */
export async function rateWeb(targetUrl, strategy = 'mobile') {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('URL website target wajib diisi!')
  }

  let validUrl = targetUrl.trim()
  if (!/^https?:\/\//i.test(validUrl)) {
    validUrl = `https://${validUrl}`
  }

  const validStrategies = new Set(['mobile', 'desktop', 'both'])
  const selectedStrategy = validStrategies.has(strategy.toLowerCase()) ? strategy.toLowerCase() : 'mobile'

  const url = new URL(BASE_URL)
  url.searchParams.set('url', validUrl)
  url.searchParams.set('strategy', selectedStrategy)

  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(attempt),
        signal: controller.signal
      })

      const rawText = await response.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (RETRYABLE_STATUSES.has(response.status) && attempt < RETRIES) {
        await sleep(1500 * Math.pow(2, attempt))
        continue
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${response.status}`)
      }

      return data || { result: rawText }
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(1500 * Math.pow(2, attempt))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('Request audit performa website gagal.')
}

export default {
  rateWeb
}
