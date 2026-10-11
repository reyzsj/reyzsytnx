// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Garena Free Fire Guest Creator Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

import crypto from 'node:crypto'

const APP_ID = 100067
const SECRET = '2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3'
const HOST = 'https://100067.connect.garena.com'
const UA = 'GarenaMSDK/4.0.42(NEO G12 ;Android 17;in;ID;app 1.130.1 2019121040;)'
const TIMEOUT = 20_000

async function post(path, body, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${HOST}${path}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json; charset=utf-8',
        ...headers
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    const text = await res.text()
    if (text.startsWith('<')) {
      throw new Error('Rate limit terdeteksi. Server mengalami cooling down...')
    }

    let data = null
    try { data = JSON.parse(text) } catch (_) {}
    if (!data) throw new Error('Respon server bukan JSON valid.')

    return data
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Buat 1 Akun Guest Garena Free Fire dan ambil token otentikasinya
 */
export async function createGuest() {
  const password = crypto.randomBytes(32).toString('hex').toUpperCase()
  const regBody = { app_id: APP_ID, client_type: 2, password, source: 2 }
  const sig = crypto.createHmac('sha256', SECRET).update(JSON.stringify(regBody)).digest('hex')

  const reg = await post('/api/v2/oauth/guest:register', regBody, { Authorization: `Signature ${sig}` })
  if (reg.code !== 0 || !reg.data?.uid) {
    throw new Error(reg.error || reg.message || 'Pendaftaran akun guest gagal.')
  }

  const uid = reg.data.uid
  const grant = await post('/api/v2/oauth/guest/token:grant', {
    client_id: APP_ID,
    client_secret: SECRET,
    client_type: 2,
    password,
    response_type: 'token',
    uid
  })

  if (grant.code !== 0 || !grant.data?.access_token) {
    throw new Error(grant.error || grant.message || 'Gagal mengambil access token.')
  }

  return {
    uid,
    password,
    open_id: grant.data.open_id,
    access_token: grant.data.access_token,
    created_at: new Date().toISOString()
  }
}

export default {
  createGuest
}
