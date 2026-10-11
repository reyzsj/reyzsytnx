// ---------------------------------------------------------
// 🔥 Author : Dhanz (https://t.me/ktzckmy)
// 🌸 Date : 10 Oktober 2026
// 🍂 Function : SMSKu Virtual Number & OTP Base Module (Native Fetch)
// 🌟 Channels :
// - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Module request menggunakan Native Fetch (Zero Dependency).
// Gunakan hanya pada akun yang kamu miliki atau berwenang
// untuk mengelolanya.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://smsku.zelapi.eu.cc/api'
const TIMEOUT = 30_000
const RETRIES = 3
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504])

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getHeaders(attemptIndex) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length]
  }
}

async function requestWithRetry(endpoint, method = 'GET', body = null) {
  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const options = {
        method,
        headers: getHeaders(attempt),
        signal: controller.signal
      }

      if (body) options.body = JSON.stringify(body)

      const response = await fetch(`${BASE_URL}${endpoint}`, options)
      const rawText = await response.text()

      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (RETRYABLE_STATUSES.has(response.status) && attempt < RETRIES) {
        const retryAfter = Number(response.headers.get('retry-after'))
        const waitTime = retryAfter > 0 ? retryAfter * 1000 : Math.min(1500 * Math.pow(2, attempt), 10_000)
        await sleep(waitTime)
        continue
      }

      if (!response.ok || (data && data.success === false)) {
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

export async function getServices() {
  return requestWithRetry('/services')
}

export async function getCountries(service) {
  return requestWithRetry(`/countries?service=${encodeURIComponent(service)}`)
}

export async function requestNumber(service, country) {
  return requestWithRetry('/request_number', 'POST', { service, country })
}

export async function getMyNumbers() {
  return requestWithRetry('/my_numbers')
}

export async function releaseNumber(number) {
  const cleanNumber = String(number).replace(/^\+/, '')
  return requestWithRetry('/release_number', 'POST', { number: cleanNumber })
}

export async function getLatestOtp(number) {
  const cleanNumber = String(number).replace(/^\+/, '')
  return requestWithRetry(`/latest_otp?number=${encodeURIComponent(cleanNumber)}`)
}

export async function getMyOtps(limit = 10) {
  return requestWithRetry(`/my_otps?limit=${limit}`)
}

export async function getLiveOtpFeed(count = 50) {
  return requestWithRetry(`/otp?count=${count}`)
}

export async function getStats(period = 'daily') {
  return requestWithRetry(`/stats/detailed?period=${encodeURIComponent(period)}`)
}

export default {
  getServices,
  getCountries,
  requestNumber,
  getMyNumbers,
  releaseNumber,
  getLatestOtp,
  getMyOtps,
  getLiveOtpFeed,
  getStats
}
