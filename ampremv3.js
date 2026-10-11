// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Alight Motion Auto Verifier Base Module (Neonode API)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://am.neonode.my.id/api'
const AUTHOR_CREDIT = 'Dhanz (@ktzckmy)'
const TIMEOUT = 30_000
const RETRIES = 3
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504])

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getHeaders(attemptIndex) {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length]
  }
}

async function requestFetch(endpoint, bodyParams) {
  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(attempt),
        body: JSON.stringify(bodyParams),
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
        throw new Error(data?.message || data || `HTTP ${response.status}`)
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
 * 1. Kirim Link Verifikasi Alight Motion ke Email
 * @param {string} email - Email target Alight Motion
 */
export async function sendLink(email) {
  if (!email || typeof email !== 'string') {
    return { ok: false, message: 'Email wajib diisi!' }
  }

  try {
    const data = await requestFetch('/send-link', {
      email: email.trim()
    })

    return {
      ok: true,
      author: AUTHOR_CREDIT,
      data
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message
    }
  }
}

/**
 * 2. Verifikasi Magic Link Alight Motion
 * @param {string} email - Email terdaftar
 * @param {string} magicLink - Link verifikasi dari email (firebaseapp/alightcreative)
 */
export async function verifyLink(email, magicLink) {
  if (!email || typeof email !== 'string') {
    return { ok: false, message: 'Email wajib diisi!' }
  }
  if (!magicLink || typeof magicLink !== 'string') {
    return { ok: false, message: 'Magic link dari email wajib diisi!' }
  }

  try {
    const data = await requestFetch('/verify-link', {
      email: email.trim(),
      magicLink: magicLink.trim()
    })

    return {
      ok: true,
      author: AUTHOR_CREDIT,
      data
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message
    }
  }
}

export default {
  sendLink,
  verifyLink
}
