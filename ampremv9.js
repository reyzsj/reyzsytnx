// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 31 Oktober 2026
// 🍂 Function : AM Izzxd Prem Handler Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const BASE_URL = 'https://am.izzxd.my.id'
const API_SEND = `${BASE_URL}/api/prem/send`
const API_VERIFY = `${BASE_URL}/api/prem/verify`
const API_BULK = `${BASE_URL}/api/prem/bulk`
const TIMEOUT = 120_000

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
}

/**
 * Mengirim permintaan Magic Link Alight Motion (/api/prem/send)
 * @param {string} email - Alamat email target
 */
export async function sendPremLink(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_SEND, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Memverifikasi Magic Link Alight Motion (/api/prem/verify)
 * @param {string} email - Alamat email terdaftar
 * @param {string} magicLink - URL Magic Link lengkap
 */
export async function verifyPremLink(email, magicLink) {
  if (!email || !magicLink || typeof magicLink !== 'string' || !magicLink.trim()) {
    throw new Error('Email dan Magic Link tidak boleh kosong!')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const cleanEmail = email.trim()
    const cleanLink = magicLink.trim()

    const res = await fetch(API_VERIFY, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        email: cleanEmail,
        magicLink: cleanLink,
        link: cleanLink
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

async function requestSingleBulk(countNum) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(API_BULK, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        count: countNum,
        amount: countNum,
        total: countNum,
        jumlah: countNum,
        limit: countNum
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error HTTP ${res.status}: ${data?.message || data?.error || rawText}`)
    return data || { result: rawText }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Membuat akun Alight Motion Premium secara otomatis sesuai jumlah yang diinginkan (/api/prem/bulk)
 * @param {number|string} [count=1] - Jumlah akun yang ingin dibuat
 */
export async function bulkPremCreate(count = 1) {
  const targetCount = parseInt(count, 10)
  if (isNaN(targetCount) || targetCount < 1) {
    throw new Error('Jumlah akun harus berupa angka minimal 1!')
  }

  const firstData = await requestSingleBulk(targetCount)

  if (!Array.isArray(firstData?.results) || firstData.results.length >= targetCount) {
    return firstData
  }

  const allResults = [...firstData.results]
  let successCount = Number(firstData.success || firstData.results.length)
  let failedCount = Number(firstData.failed || 0)

  while (allResults.length < targetCount) {
    try {
      const nextData = await requestSingleBulk(1)
      if (Array.isArray(nextData?.results) && nextData.results.length > 0) {
        allResults.push(...nextData.results)
        successCount += Number(nextData.success || nextData.results.length)
        failedCount += Number(nextData.failed || 0)
      } else {
        failedCount++
        break
      }
    } catch (err) {
      failedCount++
      allResults.push({ status: false, error: err.message })
    }
  }

  return {
    ...firstData,
    status: successCount > 0,
    total: allResults.slice(0, targetCount).length,
    success: successCount,
    failed: failedCount,
    results: allResults.slice(0, targetCount)
  }
}

export default {
  sendPremLink,
  verifyPremLink,
  bulkPremCreate
}
