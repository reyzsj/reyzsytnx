// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Uguu.se File & Media Uploader Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const UPLOAD_URL = 'https://uguu.se/upload.php'
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
    'Referer': 'https://uguu.se/',
    'User-Agent': USER_AGENTS[attemptIndex % USER_AGENTS.length]
  }
}

/**
 * Upload Buffer File/Gambar/Video ke Uguu.se
 * @param {Buffer} buffer - Buffer media
 * @param {string} [fileName='file.bin'] - Nama file beserta ekstensi
 * @param {string} [mimeType='application/octet-stream'] - Mime-type file
 */
export async function uploadFile(buffer, fileName = 'file.bin', mimeType = 'application/octet-stream') {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Buffer file kosong atau bukan Buffer valid.')
  }

  let lastError = null

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const form = new FormData()
      form.append('files[]', new Blob([buffer], { type: mimeType }), fileName)

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

      if (!response.ok || !data?.success || !data?.files?.[0]) {
        throw new Error(data?.error || `Upload gagal dengan status HTTP ${response.status}`)
      }

      return data.files[0]
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) await sleep(1500 * Math.pow(2, attempt))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('Gagal mengunggah file ke Uguu.se.')
}

export default {
  uploadFile
}
