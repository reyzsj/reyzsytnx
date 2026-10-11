// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Remove Image Background via iLoveIMG API (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const PAGE_URL = 'https://www.iloveimg.com/remove-background'

const SERVERS = [
  'api1g', 'api2g', 'api3g', 'api8g', 'api9g', 'api10g',
  'api11g', 'api12g', 'api13g', 'api14g', 'api15g', 'api16g',
  'api17g', 'api18g', 'api19g', 'api20g', 'api21g', 'api22g',
  'api24g', 'api25g'
]

const TASK = 'r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1'
const HTTP_TIMEOUT_MS = 45_000
const GPU_TIMEOUT_MS = 180_000
const TOKEN_TTL_MS = 10 * 60_000
const MAX_RETRIES = 3

export const RM_BG_MAX_BYTES = 2 * 1024 * 1024
export const RM_BG_MAX_PIXELS = 4_403_200
export const RM_BG_MIME = 'image/jpeg,image/jpg,image/png'

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const sessionCache = new Map()

function parseConfig(text) {
  let token = null
  let cfg = null

  const cfgIdx = text.indexOf('ilovepdfConfig')
  if (cfgIdx !== -1) {
    const objStart = text.indexOf('{', cfgIdx)
    const objEnd = text.indexOf('};', objStart)
    if (objStart !== -1 && objEnd !== -1) {
      try {
        cfg = JSON.parse(text.slice(objStart, objEnd + 1))
        token = cfg?.token || null
      } catch {}
    }
  }

  const csrf = text.match(/<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i)?.[1] || null
  return {
    token,
    csrf,
    servers: Array.isArray(cfg?.servers) && cfg.servers.length ? cfg.servers : null
  }
}

export async function getTokenInfo(force = false) {
  const now = Date.now()
  const hit = sessionCache.get(PAGE_URL)

  if (!force && hit?.token && hit?.csrf && now - hit.ts < TOKEN_TTL_MS) {
    return { token: hit.token, csrf: hit.csrf, servers: hit.servers }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(PAGE_URL, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      signal: controller.signal
    })
    const html = await res.text()
    const { token, csrf, servers } = parseConfig(html)

    if (!token || !csrf) {
      throw new Error('Token/CSRF gagal diambil dari iloveimg.com')
    }

    sessionCache.set(PAGE_URL, { token, csrf, servers, ts: now })
    return { token, csrf, servers }
  } finally {
    clearTimeout(timer)
  }
}

export function inspectPng(buf) {
  if (!buf || buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function pickServer(pool = SERVERS, used = []) {
  const avail = pool.filter((s) => !used.includes(s))
  const src = avail.length ? avail : pool
  if (!src.length) return null
  return src[Math.floor(Math.random() * src.length)]
}

async function postToTool({ server, path, token, csrf, form, timeout }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`https://${server}.iloveimg.com/v1/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.iloveimg.com/',
        'Cookie': `_csrf=${csrf}`,
        'User-Agent': UA
      },
      body: form,
      signal: controller.signal
    })

    if (!res.ok) {
      const errText = await res.text()
      const e = new Error(`HTTP ${res.status} pada /v1/${path}: ${errText.slice(0, 200)}`)
      e.status = res.status
      throw e
    }

    return res
  } finally {
    clearTimeout(timer)
  }
}

async function uploadForRmBg({ server, token, csrf, buffer, fileName }) {
  const form = new FormData()
  form.append('name', fileName)
  form.append('chunk', '0')
  form.append('chunks', '1')
  form.append('task', TASK)
  form.append('preview', '1')
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), fileName)

  const res = await postToTool({ server, path: 'upload', token, csrf, form, timeout: HTTP_TIMEOUT_MS })
  const data = await res.json()
  const serverFilename = data?.server_filename
  if (!serverFilename) throw new Error('Upload gagal: server_filename tidak ditemukan')
  return serverFilename
}

async function requestRemoveBackground({ server, token, csrf, serverFilename }) {
  const form = new FormData()
  form.append('task', TASK)
  form.append('server_filename', serverFilename)

  const res = await postToTool({
    server,
    path: 'removebackground',
    token,
    csrf,
    form,
    timeout: GPU_TIMEOUT_MS
  })

  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

/**
 * Remove Background dari Buffer Gambar
 * @param {Buffer} buffer - Buffer file gambar
 * @param {Object} [opts={}]
 * @param {string} [opts.fileName='image.jpg']
 */
export async function removeBackgroundImage(buffer, opts = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Buffer gambar kosong / bukan Buffer')
  }

  if (buffer.length > RM_BG_MAX_BYTES) {
    throw new Error(`Ukuran ${(buffer.length / 1048576).toFixed(2)} MB melebihi batas 2 MB.`)
  }

  const fileName = String(opts.fileName || 'image.jpg').replace(/[^\w.\-]/g, '_') || 'image.jpg'
  let session = await getTokenInfo(false)
  const pool = (Array.isArray(session.servers) && session.servers.length ? session.servers : SERVERS).filter(Boolean)
  const used = []
  let lastErr = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const server = pickServer(pool, used)
    if (!server) break
    used.push(server)

    try {
      const serverFilename = await uploadForRmBg({ server, ...session, buffer, fileName })
      const out = await requestRemoveBackground({ server, ...session, serverFilename })

      if (!out.length) throw new Error('Hasil remove-background kosong dari server')

      const png = inspectPng(out)
      if (!png) throw new Error('Server membalas data yang bukan PNG valid')

      if (png.width * png.height > RM_BG_MAX_PIXELS) {
        throw new Error(`Hasil ${png.width}×${png.height} melebihi batas 4.4MP`)
      }

      return {
        ok: true,
        buffer: out,
        width: png.width,
        height: png.height,
        server,
        transparent: true
      }
    } catch (err) {
      lastErr = err
      if (err.status === 401 || err.status === 403) {
        try { session = await getTokenInfo(true) } catch {}
      }
    }
  }

  return {
    ok: false,
    message: lastErr?.message || 'Gagal remove background (semua server error)'
  }
}

export default {
  removeBackgroundImage,
  getTokenInfo,
  inspectPng,
  RM_BG_MAX_BYTES,
  RM_BG_MAX_PIXELS,
  RM_BG_MIME
}
