// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 23 Oktober 2026
// 🍂 Function : VIU Premium Account Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

import { randomBytes, createHash } from 'node:crypto'

const BASE_URL = 'https://viu.interflazz.my.id/?action=account'
const TIMEOUT = 30_000

/**
 * Membuat Device ID acak atau berbasis seed
 * @param {string|null} seed
 */
export function generateDeviceId(seed = null) {
  if (seed) return createHash('md5').update(String(seed)).digest('hex')
  return randomBytes(16).toString('hex')
}

/**
 * Mengambil credential akun VIU Premium dari endpoint
 * @param {string} [deviceId] - Device ID kustom (Opsional)
 */
export async function requestApi(deviceId = null) {
  const devId = typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : generateDeviceId()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://viu.interflazz.my.id',
        'Referer': 'https://viu.interflazz.my.id/'
      },
      body: JSON.stringify({ device_id: devId }),
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null; try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error(`API Error: HTTP ${res.status}`)
    if (!data?.success) throw new Error(data?.message || 'Gagal mengambil akun VIU')

    return {
      status: true,
      message: data.message,
      is_new: data.is_new,
      device_id: data.device_id || devId,
      account: {
        email: data.account?.email ?? null,
        password: data.account?.password ?? null
      },
      fetched_at: new Date().toISOString(),
      raw_data: data
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  generateDeviceId,
  requestApi
}
