// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Tmpfiles.org File Uploader Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload'
const TIMEOUT = 60_000
const RETRIES = 3
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504])

const USER_AGENTS = [
  'Mozilla/5.0 (Android 14; Mobile; rv:157.0) Gecko/157.0 Firefox/157.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
]

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

function getHeaders(attemptIndex) {
  return {
    'Referer': 'https://tmpfiles.org/',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length]
  }
}

/**
 * Upload Buffer File/Gambar ke Tmpfiles.org (Maksimal 100MB)
 * @param {Buffer} buffer - Buffer file/gambar
 * @param {string} [fileName='file.bin'] - Nama file beserta ekstensi
 * @param {string} [mimeType='application/octet-stream'] - Mime-type file
 * @param {number|null} [expire=null] - Masa berlaku file dalam detik (60 - 172800)
 */
export async function uploadFile(buffer, fileName = 'file.bin', mimeType = 'application/octet-stream', expire = null) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Buffer file kosong atau bukan Buffer valid.')
  }

  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const form = new FormData()
      form.append('file', new Blob([buffer], { type: mimeType }), fileName)
      if (expire) {
        form.append('expire', String(expire))
      }

      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: getHeaders(attempt),
        body: form,
        signal: controller.signal
      })

      const rawText = await response.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      if (RETRYABLE_STATUSES.has(response.status) && attempt < RETRIES) {
        await sleep(1500 * Math.pow(2, attempt))
        continue
      }

      if (!response.ok || data?.status !== 'success' || !data?.data?.url) {
        throw new Error(data?.message || `Upload gagal dengan status HTTP ${response.status}`)
      }

      const pageUrl = data.data.url
      const directUrl = pageUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/')

      return {
        url: pageUrl,
        directUrl
      }
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(1500 * Math.pow(2, attempt))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('Gagal mengunggah file ke Tmpfiles.org.')
}

export default {
  uploadFile
}
