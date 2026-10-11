// ---------------------------------------------------------
// 🔥 Author : Dhanz (https://t.me/ktzckmy)
// 🌸 Date : 10 Oktober 2026
// 🍂 Function : IGWatcher Scraper Base Module (Native Fetch)
// 🌟 Channels :
// - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Module request menggunakan Native Fetch (Zero Dependency).
// Gunakan hanya pada akun yang kamu miliki atau berwenang
// untuk mengelolanya.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://igwatcher.com/wp-json/igw/v1'
const TIMEOUT = 30_000
const RETRIES = 3
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504])

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
]

const DEFAULT_SIG = 'v=1;j=478;t=1791646579538;p=1.1791646558.1edfa7eb1c3ece55cc4a58e9c1ab4241;s=5ee55ca5140b2b15c968c1cc601b523efa475b03265ea948070a70dd0f82909e'
const DEFAULT_TS = '1.1791646570.f1c6d208adcead11.d95906880673353b53a4566d837c19d1'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getHeaders(attemptIndex, customSig = '', customTs = '') {
  return {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length],
    'X-IGW-Sig': customSig || DEFAULT_SIG,
    'X-IGW-TS': customTs || DEFAULT_TS
  }
}

async function requestWithRetry(endpoint, customSig = '', customTs = '') {
  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(attempt, customSig, customTs),
        signal: controller.signal
      })

      const rawText = await response.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (RETRYABLE_STATUSES.has(response.status) && attempt < RETRIES) {
        const retryAfter = Number(response.headers.get('retry-after'))
        const waitTime = retryAfter > 0 ? retryAfter * 1000 : Math.min(1500 * Math.pow(2, attempt), 10_000)
        await sleep(waitTime)
        continue
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${response.status}`)
      }

      return data || { raw: rawText }
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(1500 * Math.pow(2, attempt))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('Request gagal.')
}

/**
 * Cari profil Instagram via IGWatcher
 * @param {string} username 
 * @param {string} [customSig] 
 * @param {string} [customTs] 
 */
export async function searchProfile(username, customSig = '', customTs = '') {
  return requestWithRetry(`/search?username=${encodeURIComponent(username)}`, customSig, customTs)
}

/**
 * Ambil daftar postingan Instagram via IGWatcher
 * @param {string} username 
 * @param {number} [limit=24] 
 * @param {string} [customSig] 
 * @param {string} [customTs] 
 */
export async function getPosts(username, limit = 24, customSig = '', customTs = '') {
  return requestWithRetry(`/posts?username=${encodeURIComponent(username)}&limit=${limit}&lazy=1`, customSig, customTs)
}

export default {
  searchProfile,
  getPosts
}
