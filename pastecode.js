// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 12 Oktober 2026
// 🍂 Function : PasteCode.dev API Base Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://pastecode.dev/api/pastes'
const TIMEOUT = 20_000

function normalizeSyntax(raw) {
  const val = String(raw || '').trim().toLowerCase()
  if (!val || val === 'text' || val === 'txt' || val === 'plain') return 'plaintext'
  if (val === 'js') return 'javascript'
  if (val === 'ts') return 'typescript'
  if (val === 'py') return 'python'
  return val
}

async function requestApi(endpoint, apiKey, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(options.headers || {})
      },
      signal: controller.signal
    })

    const rawText = await response.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!response.ok) {
      const errMsg = data?.messages ? data.messages.join(', ') : (data?.message || rawText)
      throw new Error(`HTTP ${response.status}: ${errMsg}`)
    }

    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengambil semua paste dari akun PasteCode
 * @param {string} apiKey - Bearer API Token
 */
export async function listPastes(apiKey) {
  if (!apiKey) throw new Error('API Token wajib diisi!')
  return await requestApi(BASE_URL, apiKey, { method: 'GET' })
}

/**
 * Membuat paste baru
 * @param {string} apiKey - Bearer API Token
 * @param {Object} payload - Objek parameter paste
 * @param {string} [payload.title='Untitled'] - Judul paste
 * @param {string} [payload.exposure='public'] - 'public' | 'unlisted' | 'private'
 * @param {string} [payload.expiration='never'] - 'never' | '10m' | '1h' | '1d' | '1w' | '1m'
 * @param {Array<Object>} payload.pasteFiles - Array file [{ filename, syntax, code }]
 */
export async function createPaste(apiKey, payload = {}) {
  if (!apiKey) throw new Error('API Token wajib diisi!')
  if (!payload.pasteFiles || !Array.isArray(payload.pasteFiles) || payload.pasteFiles.length === 0) {
    throw new Error('payload.pasteFiles wajib diisi setidaknya 1 file!')
  }

  const sanitizedFiles = payload.pasteFiles.map(file => ({
    ...file,
    syntax: normalizeSyntax(file.syntax)
  }))

  return await requestApi(BASE_URL, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title || 'Untitled',
      exposure: payload.exposure || 'public',
      expiration: payload.expiration || 'never',
      pasteFiles: sanitizedFiles
    })
  })
}

/**
 * Mengambil detail paste berdasarkan UUID
 * @param {string} apiKey - Bearer API Token
 * @param {string} uuid - UUID unik paste
 * @param {string} [password=null] - Password jika paste diproteksi
 */
export async function getPaste(apiKey, uuid, password = null) {
  if (!apiKey) throw new Error('API Token wajib diisi!')
  if (!uuid) throw new Error('UUID paste wajib diisi!')

  let url = `${BASE_URL}/${uuid}`
  if (password) url += `?password=${encodeURIComponent(password)}`

  return await requestApi(url, apiKey, { method: 'GET' })
}

/**
 * Menghapus paste berdasarkan UUID
 * @param {string} apiKey - Bearer API Token
 * @param {string} uuid - UUID unik paste yang akan dihapus
 */
export async function deletePaste(apiKey, uuid) {
  if (!apiKey) throw new Error('API Token wajib diisi!')
  if (!uuid) throw new Error('UUID paste wajib diisi!')

  return await requestApi(`${BASE_URL}/${uuid}`, apiKey, { method: 'DELETE' })
}

export default {
  listPastes,
  createPaste,
  getPaste,
  deletePaste
}
