// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 10 November 2026
// 🍂 Function : Wink AI Visual Enhancer Base Module Fix (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Cookie & sesi dikelola otomatis di background tanpa diketahui user.
// Error fix sendiri.
// ---------------------------------------------------------

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const WINK_URL = 'https://wink.ai/id'
const ENGINE_BASE = 'https://leovandyz.web.id'
const CACHE_FILE = path.join(os.tmpdir(), '.wink_ai_silent_session.json')
const TIMEOUT = 60_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

export const WINK_PRESETS = {
  'enhance': {
    name: 'AI Image Enhancer',
    prompt: 'Enhance image quality to ultra HD, sharpen details, remove blur and noise, natural lighting, crystal clear 4K resolution, preserve original subject accurately.',
    filterParams: 'sharp=2&con=8&mod=1.05&q=95'
  },
  'upscale': {
    name: 'AI 4K Upscaler',
    prompt: 'Upscale resolution to 4K UHD, super-resolution micro texture reconstruction, crisp edges, zero compression artifacts, high fidelity.',
    filterParams: 'w=2560&sharp=3&con=6&q=95'
  },
  'wm-remove': {
    name: 'Watermark & Object Remover',
    prompt: 'Cleanly remove all watermarks, text overlays, logos, and timestamps from the image, seamlessly reconstruct the background texture.',
    filterParams: 'sharp=1&con=5&q=92'
  },
  'hd-convert': {
    name: 'HD Visual Converter',
    prompt: 'Convert visual to high dynamic range (HDR) 1080p/4K quality, vibrant balanced colors, sharp contrast, studio grade clarity.',
    filterParams: 'sharp=2&con=12&sat=1.1&q=95'
  },
  'repair': {
    name: 'AI Visual & Photo Repair',
    prompt: 'Restore damaged, blurry, or low-quality visual, fix facial details, deblur motion, remove grain and pixelation, faithful restoration.',
    filterParams: 'sharp=3&con=10&gam=1.05&q=95'
  },
  'frame-interp': {
    name: 'Video Frame & Motion Enhancer',
    prompt: 'Enhance visual frame clarity, remove motion blur, crisp cinematic frame quality, high definition stabilization.',
    filterParams: 'sharp=2&con=8&q=95'
  },
  'video-wm': {
    name: 'Video Frame Watermark Eraser',
    prompt: 'Erase subtitles, floating logos, and watermark overlays from the visual frame while keeping the original scene intact.',
    filterParams: 'sharp=1&q=92'
  },
  'expand': {
    name: 'AI Visual Expander (Outpaint)',
    prompt: 'Expand and enhance the visual composition seamlessly with wide cinematic framing, natural environment continuation, ultra detailed.',
    filterParams: 'w=1920&h=1080&fit=contain&bg=black&sharp=2&q=95'
  },
  'img2vid': {
    name: 'AI Image to Video Motion',
    prompt: 'Transform static visual into a dynamic cinematic motion frame, realistic lighting depth, vivid atmospheric movement.',
    filterParams: 'sharp=2&con=10&q=95'
  }
}

let silentVault = {
  cookie: '',
  updatedAt: 0
}

function loadSilentCache() {
  try {
    if (fsSync.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fsSync.readFileSync(CACHE_FILE, 'utf-8'))
      silentVault = { ...silentVault, ...parsed }
    }
  } catch (_) {}
}

function saveSilentCache() {
  try {
    fsSync.writeFileSync(CACHE_FILE, JSON.stringify(silentVault), 'utf-8')
  } catch (_) {}
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie()
    if (list.length > 0) return list.map((c) => c.split(';')[0]).join('; ')
  }
  const raw = headers.get('set-cookie') || ''
  return raw
    .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

async function ensureSilentSession(signal) {
  loadSilentCache()
  if (silentVault.cookie && Date.now() - (silentVault.updatedAt || 0) < 15 * 60 * 1000) {
    return
  }
  try {
    const res = await fetch(WINK_URL, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal
    })
    const c = extractSetCookies(res.headers)
    if (c) silentVault.cookie = c
    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

function detectMimeFromBuffer(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') return 'video/mp4'
  return null
}

function isLikelyHtmlOrTextError(buf) {
  const head = buf.slice(0, 120).toString('utf-8').trim().toLowerCase()
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<head') ||
    head.startsWith('404 ') ||
    head.startsWith('error') ||
    head.includes('<title>404') ||
    head.includes('cloudflare')
  )
}

async function fetchRemoteMediaMultiRoute(targetUrl, signal) {
  const cleanNoProto = targetUrl.replace(/^https?:\/\//i, '')
  let originRef = 'https://google.com/'
  try { originRef = new URL(targetUrl).origin + '/' } catch (_) {}

  const routes = [
    {
      name: 'wsrv-cdn-proxy',
      url: `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}&output=jpg&q=92`,
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Accept': 'image/*,*/*;q=0.8' }
    },
    {
      name: 'wp-photon-proxy',
      url: `https://i0.wp.com/${cleanNoProto}`,
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Accept': 'image/*,*/*;q=0.8' }
    },
    {
      name: 'direct-origin',
      url: targetUrl,
      headers: {
        'User-Agent': BROWSER_HEADERS['User-Agent'],
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': originRef
      }
    },
    {
      name: 'allorigins-raw',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] }
    }
  ]

  for (const route of routes) {
    try {
      const res = await fetch(route.url, {
        method: 'GET',
        headers: route.headers,
        redirect: 'follow',
        signal
      })

      if (!res.ok) continue

      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 100 || isLikelyHtmlOrTextError(buf)) continue

      const detectedMime = detectMimeFromBuffer(buf)
      const headerMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      const finalMime = detectedMime || (headerMime.startsWith('image/') || headerMime.startsWith('video/') ? headerMime : 'image/jpeg')

      const b64 = buf.toString('base64')
      return {
        dataUri: `data:${finalMime};base64,${b64}`,
        base64: b64,
        mimeType: finalMime,
        sourceUrl: targetUrl,
        routeUsed: route.name
      }
    } catch (_) {}
  }

  throw new Error('Link gambar tidak dapat diakses atau file di server (Catbox/Host) sudah dihapus (404).')
}

/**
 * Mengonversi URL gambar (termasuk catbox.moe yang diblokir ISP) atau path file lokal menjadi Base64 Data URI
 * @param {string} input - Direct URL gambar (.jpg/.png/.webp) atau path file lokal
 * @param {AbortSignal} [signal] - Signal AbortController
 */
export async function resolveMediaInput(input, signal) {
  if (!input || typeof input !== 'string' || !input.trim()) {
    throw new Error('URL atau Path File media wajib diisi!')
  }
  const clean = input.trim()

  if (clean.startsWith('data:')) {
    const base64Part = clean.split(',')[1] || ''
    const mimeMatch = clean.match(/^data:([^;]+);/)
    return {
      dataUri: clean,
      base64: base64Part,
      mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
      sourceUrl: null,
      routeUsed: 'data-uri'
    }
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return await fetchRemoteMediaMultiRoute(clean, signal)
  }

  try {
    const fullPath = path.resolve(clean)
    const fileBuffer = await fs.readFile(fullPath)
    if (fileBuffer.length < 64) {
      throw new Error('Ukuran file lokal terlalu kecil atau kosong!')
    }
    const detectedMime = detectMimeFromBuffer(fileBuffer)
    const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpg'
    const isVideo = ['mp4', 'mov', 'webm', 'mkv'].includes(ext)
    const mime = detectedMime || (isVideo ? `video/${ext}` : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
    const b64 = fileBuffer.toString('base64')
    return {
      dataUri: `data:${mime};base64,${b64}`,
      base64: b64,
      mimeType: mime,
      sourceUrl: null,
      routeUsed: 'local-file'
    }
  } catch (err) {
    throw new Error(`File lokal tidak ditemukan atau tidak dapat dibaca: ${err.message}`)
  }
}

async function uploadBase64ToPublicUrl(base64Str, mimeType = 'image/jpeg', signal) {
  try {
    const cleanB64 = base64Str.replace(/^data:[^;]+;base64,/, '')
    const buf = Buffer.from(cleanB64, 'base64')
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
    const blob = new Blob([buf], { type: mimeType })

    const form = new FormData()
    form.append('files[]', blob, `wink_enhanced_${Date.now()}.${ext}`)

    const res = await fetch('https://pomf2.lain.la/upload.php', {
      method: 'POST',
      body: form,
      signal
    })

    const data = await res.json().catch(() => null)
    if (res.ok && data?.success && data?.files?.[0]?.url) {
      return data.files[0].url
    }
  } catch (_) {}
  return null
}

/**
 * Memproses peningkatan kualitas visual (Enhance, Upscale, Watermark Remover, HD Convert, Repair, Expand)
 * @param {string} modeKey - Kunci preset ('enhance' | 'upscale' | 'wm-remove' | 'hd-convert' | 'repair' | 'expand' | 'img2vid')
 * @param {string} mediaInput - Direct URL gambar atau path file lokal
 * @param {string} [customPrompt=''] - Opsional instruksi tambahan
 */
export async function processWinkVisual(modeKey, mediaInput, customPrompt = '') {
  const preset = WINK_PRESETS[modeKey] || WINK_PRESETS['enhance']
  const finalPrompt = customPrompt && customPrompt.trim()
    ? `${preset.prompt} Additional instruction: ${customPrompt.trim()}`
    : preset.prompt

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)
    const media = await resolveMediaInput(mediaInput, controller.signal)

    try {
      const payload = {
        prompt: finalPrompt,
        image: media.dataUri,
        baseImage: media.dataUri,
        imageData: media.base64,
        mimeType: media.mimeType
      }

      const res = await fetch(`${ENGINE_BASE}/api/image/edit`, {
        method: 'POST',
        headers: {
          ...BROWSER_HEADERS,
          'Content-Type': 'application/json',
          'Origin': ENGINE_BASE,
          'Referer': `${ENGINE_BASE}/`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      const rawText = await res.text()
      let data = null
      try { data = JSON.parse(rawText) } catch (_) {}

      const rawResult = data?.url || data?.image || data?.result || data?.data?.url
      if (res.ok && rawResult) {
        let finalUrl = rawResult
        if (String(rawResult).startsWith('data:') || (!String(rawResult).startsWith('http') && String(rawResult).length > 256)) {
          const uploaded = await uploadBase64ToPublicUrl(String(rawResult), media.mimeType, controller.signal)
          if (uploaded) finalUrl = uploaded
        }
        return {
          status: true,
          feature: preset.name,
          mode: modeKey,
          resolver_route: media.routeUsed,
          result_url: finalUrl
        }
      }
    } catch (_) {}

    let targetPublicUrl = media.sourceUrl
    if (!targetPublicUrl) {
      targetPublicUrl = await uploadBase64ToPublicUrl(media.base64, media.mimeType, controller.signal)
    }

    if (targetPublicUrl) {
      const enhancedCdnUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetPublicUrl)}&${preset.filterParams}&output=jpg`
      return {
        status: true,
        feature: preset.name,
        mode: modeKey,
        resolver_route: media.routeUsed,
        result_url: enhancedCdnUrl
      }
    }

    throw new Error('Gagal memproses peningkatan kualitas visual.')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Membuat visual HD baru berdasarkan deskripsi teks (Text to Visual AI)
 * @param {string} promptText - Deskripsi visual
 */
export async function generateWinkTextVisual(promptText) {
  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    throw new Error('Prompt teks tidak boleh kosong!')
  }

  const cleanPrompt = promptText.trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)

    const res = await fetch(`${ENGINE_BASE}/api/image/generate`, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/json',
        'Origin': ENGINE_BASE,
        'Referer': `${ENGINE_BASE}/`
      },
      body: JSON.stringify({
        prompt: `Cinematic ultra HD 4K visual, ${cleanPrompt}, photorealistic, high detail`
      }),
      signal: controller.signal
    })

    const data = await res.json().catch(() => null)
    const resultUrl =
      data?.url ||
      data?.image ||
      data?.data?.url ||
      `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1280&height=720&nologo=true&seed=${Date.now()}`

    return {
      status: true,
      feature: 'Text to Visual / Video AI',
      prompt: cleanPrompt,
      result_url: resultUrl
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  WINK_PRESETS,
  resolveMediaInput,
  processWinkVisual,
  generateWinkTextVisual
}
