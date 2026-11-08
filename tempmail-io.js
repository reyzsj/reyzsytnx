// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 8 November 2026
// 🍂 Function : Temp-Mail.io Base Module Fix 400 (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const WEB_URL = 'https://temp-mail.io'
const API_BASE = 'https://api.internal.temp-mail.io/api'
const TIMEOUT = 30_000

const BASE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Application-Name': 'web',
  'Application-Version': '4.0.0',
  'X-CORS-Header': 'iaWg3pchvFx48fY',
  'Origin': WEB_URL,
  'Referer': `${WEB_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

const JSON_HEADERS = {
  ...BASE_HEADERS,
  'Content-Type': 'application/json;charset=UTF-8'
}

function formatApiError(status, data, rawText) {
  if (data) {
    const detail =
      typeof data.error === 'object'
        ? JSON.stringify(data.error)
        : data.message || data.error || data.detail || JSON.stringify(data)
    return `API Error HTTP ${status}: ${detail}`
  }
  return `API Error HTTP ${status}: ${String(rawText || '').slice(0, 300)}`
}

/**
 * Mengambil daftar domain aktif dari Temp-Mail.io (/v4/domains)
 */
export async function getDomains() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${API_BASE}/v4/domains`, {
      method: 'GET',
      headers: BASE_HEADERS,
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(formatApiError(res.status, data, rawText))
    }

    return {
      status: true,
      domains: data?.domains || data || []
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Membuat alamat email sementara secara acak (POST /v3/email/new)
 * @param {number} [minLength=10] - Panjang minimal karakter nama email
 * @param {number} [maxLength=10] - Panjang maksimal karakter nama email
 */
export async function createRandomEmail(minLength = 10, maxLength = 10) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${API_BASE}/v3/email/new`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        min_name_length: Number(minLength) || 10,
        max_name_length: Number(maxLength) || 10
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(formatApiError(res.status, data, rawText))
    }

    return {
      status: true,
      email: data?.email || null,
      token: data?.token || null,
      raw_data: data
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Membuat alamat email sementara dengan nama & domain pilihan (POST /v3/email/new)
 * @param {string} name - Username email yang diinginkan
 * @param {string} domain - Nama domain dari daftar getDomains()
 */
export async function createCustomEmail(name, domain) {
  if (!name || !domain) {
    throw new Error('Parameter name dan domain tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${API_BASE}/v3/email/new`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: String(name).trim(),
        domain: String(domain).trim()
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(formatApiError(res.status, data, rawText))
    }

    return {
      status: true,
      email: data?.email || `${name}@${domain}`,
      token: data?.token || null,
      raw_data: data
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengambil daftar pesan masuk di inbox (GET /v3/email/{email}/messages)
 * @param {string} email - Alamat email Temp-Mail.io
 * @param {string} [token=''] - Opsional token email
 */
export async function getMessages(email, token = '') {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Alamat email tidak boleh kosong!')
  }

  const cleanEmail = email.trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const targetUrl = `${API_BASE}/v3/email/${cleanEmail}/messages`
    let res = await fetch(targetUrl, {
      method: 'GET',
      headers: BASE_HEADERS,
      signal: controller.signal
    })

    if (res.status === 400 && token) {
      res = await fetch(`${targetUrl}?token=${encodeURIComponent(token.trim())}`, {
        method: 'GET',
        headers: BASE_HEADERS,
        signal: controller.signal
      })
    }

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(formatApiError(res.status, data, rawText))
    }

    const messages = Array.isArray(data) ? data : data?.messages || []
    return {
      status: true,
      email: cleanEmail,
      total: messages.length,
      messages
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Menghapus alamat email sementara (DELETE /v3/email/{email})
 * @param {string} email - Alamat email Temp-Mail.io
 * @param {string} token - Token sesi email dari createRandomEmail/createCustomEmail
 */
export async function deleteEmail(email, token) {
  if (!email || !token) {
    throw new Error('Parameter email dan token wajib diisi!')
  }

  const cleanEmail = String(email).trim()
  const cleanToken = String(token).trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${API_BASE}/v3/email/${cleanEmail}`, {
      method: 'DELETE',
      headers: JSON_HEADERS,
      body: JSON.stringify({ token: cleanToken }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) {
      throw new Error(formatApiError(res.status, data, rawText))
    }

    return {
      status: true,
      deleted_email: cleanEmail,
      raw_data: data || { result: rawText || 'Deleted' }
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  getDomains,
  createRandomEmail,
  createCustomEmail,
  getMessages,
  deleteEmail
}
