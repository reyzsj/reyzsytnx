// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 27 November 2026
// 🍂 Function : Unwatermark AI Photo Editor Base Module (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch + FormData + Blob (Zero NPM Dependency, Node.js v18+).
// Default model: flux_kontext (stabil, ~8 detik, 10x free per serial).
// Error fix sendiri.
// ---------------------------------------------------------

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const API_BASE = 'https://api.unwatermark.ai/api'
const PRODUCT_CODE = '067003'
const TIMEOUT = 30_000
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CODE = {
  SUCCESS: 100000,
  TASK_CREATED: 300000,
  TASK_PROCESSING: 300006
}

export const PHOTO_EDITOR_MODELS = {
  flux_kontext: {
    create: '/web/v1/photo-editor-flux-kontext/create-job',
    get: '/web/v1/photo-editor-flux-kontext/get-job',
    supportsFusion: false
  },
  nano_banana: {
    create: '/web/v1/photo-editor-nano-banana/create-job',
    get: '/web/v1/photo-editor-nano-banana/get-job',
    supportsFusion: true
  },
  nano_banana_pro: {
    create: '/web/v1/photo-editor-nano-banana-pro/create-job',
    get: '/web/v1/photo-editor-nano-banana-pro/get-job',
    supportsFusion: true
  },
  seedream: {
    create: '/web/v1/photo-editor-seedream/create-job',
    get: '/web/v1/photo-editor-seedream/get-job',
    supportsFusion: true
  },
  flux_2_pro: {
    create: '/web/v1/photo-editor-flux-2-pro/create-job',
    get: '/web/v1/photo-editor-flux-2-pro/get-job',
    supportsFusion: true
  }
}

function guessMime(nameOrUrl = '') {
  const clean = String(nameOrUrl).split('?')[0].toLowerCase()
  if (clean.endsWith('.png')) return 'image/png'
  if (clean.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

async function toBlobEntry(source, idx = 0) {
  if (source instanceof Blob) {
    return { blob: source, filename: `blob_${idx}.jpg` }
  }
  if (Buffer.isBuffer(source) || source instanceof Uint8Array) {
    return { blob: new Blob([source], { type: 'image/jpeg' }), filename: `buffer_${idx}.jpg` }
  }

  const str = String(source || '').trim()
  if (/^https?:\/\//i.test(str)) {
    const res = await fetch(str, {
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT)
    })
    if (!res.ok) throw new Error(`Gagal unduh URL gambar (HTTP ${res.status}): ${str}`)
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const mime = ct.startsWith('image/') ? ct : guessMime(str)
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error('Gambar dari URL kosong!')
    return { blob: new Blob([buf], { type: mime }), filename: `url_${idx}.${ext}` }
  }

  if (!fs.existsSync(str)) throw new Error(`File tidak ditemukan: ${str}`)
  const buf = await fs.promises.readFile(str)
  return { blob: new Blob([buf], { type: guessMime(str) }), filename: path.basename(str) || `file_${idx}.jpg` }
}

function makeDownloadUrl(rawUrl) {
  try {
    const u = new URL(rawUrl)
    u.hostname = 'pbs0.tmpimgs.com'
    u.searchParams.set('action', 'download')
    return u.toString()
  } catch { return rawUrl }
}

function formatErr(data, fallback) {
  const m = data?.message
  if (typeof m === 'string' && m) return m
  if (m && typeof m === 'object') return m.id || m.en || m.zh || JSON.stringify(m)
  return fallback
}

/**
 * Edit foto menggunakan Unwatermark AI Photo Editor
 * @param {object} opts
 * @param {string|Buffer|Blob|Array<string|Buffer|Blob>} opts.images  URL gambar, Buffer, atau path file
 * @param {string} opts.prompt                                        Prompt instruksi edit
 * @param {string} [opts.ratio='match_input_image']                   1:1, 3:2, 2:3, 9:16, 16:9, 3:4, 4:3
 * @param {string} [opts.model='flux_kontext']                        Default flux_kontext (cepat & stabil)
 * @param {string} [opts.serial]                                      Product-Serial (otomatis acak)
 * @param {number} [opts.maxPolls=45]                                 Maksimal polling
 * @param {number} [opts.pollIntervalMs=2000]                         Jeda polling (ms)
 */
export async function aiPhotoEdit({
  images,
  prompt,
  ratio = 'match_input_image',
  model = 'flux_kontext',
  serial = crypto.randomBytes(16).toString('hex'),
  maxPolls = 45,
  pollIntervalMs = 2000
}) {
  const ep = PHOTO_EDITOR_MODELS[model]
  if (!ep) throw new Error(`Model tidak didukung: ${model}`)

  const items = (Array.isArray(images) ? images : [images]).filter(Boolean)
  if (!items.length) throw new Error('Minimal 1 gambar (URL/Buffer/Path) wajib disediakan.')
  if (items.length > 1 && !ep.supportsFusion) {
    throw new Error(`Model "${model}" hanya menerima 1 gambar. Gunakan model fusion (nano_banana / seedream).`)
  }
  if (items.length > 5) throw new Error('Maksimal 5 gambar dalam 1 request.')
  if (!String(prompt || '').trim()) throw new Error('Prompt wajib diisi.')

  const headers = {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://unwatermark.ai',
    Referer: 'https://unwatermark.ai/ai-photo-editor/',
    'Product-Code': PRODUCT_CODE,
    'Product-Serial': serial
  }

  const form = new FormData()
  for (let i = 0; i < items.length; i++) {
    const { blob, filename } = await toBlobEntry(items[i], i)
    form.append('target_images', blob, filename)
  }
  form.append('prompt', String(prompt).trim())
  form.append('ratio', ratio)

  const cRes = await fetch(`${API_BASE}${ep.create}`, {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(TIMEOUT)
  })
  const cJson = await cRes.json().catch(() => null)
  const jobId = cJson?.result?.job_id

  if (!cRes.ok || cJson?.code !== CODE.TASK_CREATED || !jobId) {
    throw new Error(`[Code ${cJson?.code ?? cRes.status}] ${formatErr(cJson, 'Gagal membuat job')}`)
  }

  for (let i = 1; i <= maxPolls; i++) {
    await sleep(pollIntervalMs)
    const gRes = await fetch(`${API_BASE}${ep.get}/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(TIMEOUT)
    })
    const gJson = await gRes.json().catch(() => null)
    const outputs = gJson?.result?.output_url

    if (gJson?.code === CODE.SUCCESS && Array.isArray(outputs) && outputs.length > 0) {
      return {
        success: true,
        model,
        ratio,
        job_id: jobId,
        serial,
        input_url: gJson.result.input_url || null,
        output_url: outputs[0],
        download_url: makeDownloadUrl(outputs[0]),
        all_outputs: outputs,
        remaining_free_times: gJson.result.remaining_free_times ?? null
      }
    }

    if (!gRes.ok || gJson?.code !== CODE.TASK_PROCESSING) {
      throw new Error(`[Code ${gJson?.code ?? gRes.status}] ${formatErr(gJson, 'Job gagal diproses')}`)
    }
  }

  throw new Error(`Timeout (${(maxPolls * pollIntervalMs) / 1000}s): worker "${model}" sedang sibuk.`)
}

export default {
  aiPhotoEdit,
  PHOTO_EDITOR_MODELS
}
