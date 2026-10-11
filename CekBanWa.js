// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : WhatsApp Ban Checker Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://apiii-xrina.my.id/tools/cekban-wa'
const TIMEOUT = 30_000
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
 * Cek status banned akun WhatsApp berdasarkan nomor telepon
 * @param {string} number - Nomor telepon WhatsApp (misal: '6283869892751')
 */
export async function checkBanWA(number) {
  if (!number || typeof number !== 'string') {
    throw new Error('Nomor telepon WhatsApp wajib diisi!')
  }

  const cleanNumber = number.trim().replace(/[^0-9]/g, '')
  if (!cleanNumber) throw new Error('Format nomor telepon tidak valid.')

  const url = new URL(BASE_URL)
  url.searchParams.set('number', cleanNumber)

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

  throw lastError || new Error('Request pengecekan status WhatsApp gagal.')
}

export default {
  checkBanWA
}
