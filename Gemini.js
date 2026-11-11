// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 11 November 2026
// 🍂 Function : Google Gemini AI Custom Model Base Module (ESM)
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

const GEMINI_WEB_URL = 'https://gemini.google.com'
const BARD_STREAM_URL = `${GEMINI_WEB_URL}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate`
const HYBRID_STREAM_URL = 'https://leovandyz.web.id/api/chat/stream'
const CACHE_FILE = path.join(os.tmpdir(), '.gemini_google_silent_session.json')
const TIMEOUT = 60_000

export const GEMINI_MODELS = {
  '1': {
    id: 'gemini-3.1-pro',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[null,null,null,null,"2525e3954d185b3c"]',
    name: 'Gemini 3.1 Pro (Advanced Reasoning & Coding)',
    systemPrefix: 'You are Google Gemini 3.1 Pro. Provide deep, accurate, and comprehensive responses.'
  },
  '2': {
    id: 'gemini-3.1-flash',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[1,null,null,null,"9ec249fc9ad08861"]',
    name: 'Gemini 3.1 Flash (Fast Multimodal)',
    systemPrefix: 'You are Google Gemini 3.1 Flash. Respond quickly, clearly, and accurately.'
  },
  '3': {
    id: 'gemini-3.1-flash-lite',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[1,null,null,null,"9ec249fc9ad08861"]',
    name: 'Gemini 3.1 Flash-Lite (Ultra Fast & Lightweight)',
    systemPrefix: 'You are Google Gemini 3.1 Flash-Lite. Deliver concise, direct, and fast answers.'
  },
  '4': {
    id: 'gemini-2.5-pro',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[null,null,null,null,"2525e3954d185b3c"]',
    name: 'Gemini 2.5 Pro (Complex Analysis)',
    systemPrefix: 'You are Google Gemini 2.5 Pro. Analyze problems thoroughly and systematically.'
  },
  '5': {
    id: 'gemini-2.5-flash',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[1,null,null,null,"9ec249fc9ad08861"]',
    name: 'Gemini 2.5 Flash (Balanced Speed & Intelligence)',
    systemPrefix: 'You are Google Gemini 2.5 Flash. Provide helpful and well-structured responses.'
  },
  '6': {
    id: 'gemini-2.0-flash-thinking',
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[null,null,null,null,"7ca48d02d802f20a"]',
    name: 'Gemini 2.0 Flash Thinking (Step-by-Step Reasoning)',
    systemPrefix: 'You are Google Gemini 2.0 Flash Thinking. First show your step-by-step reasoning inside [Thinking] ... [/Thinking] tags, then provide the final answer.'
  }
}

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': GEMINI_WEB_URL,
  'Referer': `${GEMINI_WEB_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

let silentVault = {
  cookie: '',
  atToken: '',
  blVersion: 'boq_assistant-bard-web-server_20261108.08_p0',
  sid: '',
  selectedModel: 'gemini-3.1-pro',
  systemInstruction: '',
  webSearch: false,
  history: [],
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

/**
 * Mengambil konfigurasi model berdasarkan nomor urut (1-6) atau ID model custom
 * @param {string} [modelInput='gemini-3.1-pro'] - Nomor preset atau nama model custom
 */
export function resolveModelConfig(modelInput = '') {
  const clean = String(modelInput || silentVault.selectedModel || 'gemini-3.1-pro').trim()
  if (GEMINI_MODELS[clean]) return GEMINI_MODELS[clean]

  const byId = Object.values(GEMINI_MODELS).find(
    (m) => m.id.toLowerCase() === clean.toLowerCase()
  )
  if (byId) return byId

  return {
    id: clean,
    apiModel: 'gemini-3.1-flash-lite',
    bardHeader: '[1,null,null,null,"9ec249fc9ad08861"]',
    name: `Custom Model (${clean})`,
    systemPrefix: `You are Google Gemini running on model ${clean}. Answer accurately and naturally.`
  }
}

/**
 * Mengubah model default aktif yang tersimpan di sesi
 * @param {string} modelInput - ID model atau nomor preset (1-6)
 */
export function setGeminiModel(modelInput) {
  loadSilentCache()
  const cfg = resolveModelConfig(modelInput)
  silentVault.selectedModel = cfg.id
  saveSilentCache()
  return { status: true, selected_model: cfg.id, name: cfg.name }
}

/**
 * Menghapus riwayat percakapan (reset memory)
 */
export function clearGeminiHistory() {
  loadSilentCache()
  silentVault.history = []
  saveSilentCache()
  return { status: true, message: 'History cleared' }
}

async function initSilentBardSession(signal) {
  loadSilentCache()
  if (silentVault.cookie && Date.now() - (silentVault.updatedAt || 0) < 15 * 60 * 1000) {
    return
  }

  try {
    const res = await fetch(`${GEMINI_WEB_URL}/app`, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal
    })

    const newCookie = extractSetCookies(res.headers)
    if (newCookie) silentVault.cookie = newCookie

    const html = await res.text()
    const atMatch = html.match(/"SNlM0e"\s*:\s*"([^"]+)"/)
    const blMatch = html.match(/"cfb2h"\s*:\s*"([^"]+)"/)
    const sidMatch = html.match(/"FdrFJe"\s*:\s*"([^"]+)"/)

    if (atMatch?.[1]) silentVault.atToken = atMatch[1]
    if (blMatch?.[1]) silentVault.blVersion = blMatch[1]
    if (sidMatch?.[1]) silentVault.sid = sidMatch[1]

    silentVault.updatedAt = Date.now()
    saveSilentCache()
  } catch (_) {}
}

async function resolveImageAttachment(imageInput, signal) {
  if (!imageInput || !String(imageInput).trim()) return []
  const clean = String(imageInput).trim()

  if (clean.startsWith('data:')) {
    const mime = clean.match(/^data:([^;]+);/)?.[1] || 'image/jpeg'
    return [{ type: 'image', url: clean, dataUri: clean, mimeType: mime }]
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const routes = [
      `https://wsrv.nl/?url=${encodeURIComponent(clean)}&output=jpg&q=90`,
      clean
    ]
    for (const rUrl of routes) {
      try {
        const res = await fetch(rUrl, {
          method: 'GET',
          headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
          signal
        })
        if (!res.ok) continue
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 100) continue
        const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
        if (mime.includes('text/html')) continue
        const dataUri = `data:${mime};base64,${buf.toString('base64')}`
        return [{ type: 'image', url: dataUri, dataUri, mimeType: mime }]
      } catch (_) {}
    }
    throw new Error('Gagal mengunduh gambar dari URL tersebut.')
  }

  try {
    const fullPath = path.resolve(clean)
    const buf = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpg'
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`
    return [{ type: 'image', url: dataUri, dataUri, mimeType: mime }]
  } catch (err) {
    throw new Error(`File gambar lokal tidak ditemukan: ${err.message}`)
  }
}

function parseBardEnvelope(rawText) {
  const lines = String(rawText || '').split(/\r?\n/)
  for (const line of lines) {
    if (!line.startsWith('[["wrb.fr"')) continue
    try {
      const outer = JSON.parse(line)
      const innerStr = outer?.[0]?.[2]
      if (!innerStr) continue
      const inner = JSON.parse(innerStr)
      const replyText = inner?.[4]?.[0]?.[1]?.[0] || inner?.[0]?.[0]
      if (replyText && typeof replyText === 'string') {
        return replyText.trim()
      }
    } catch (_) {}
  }
  return null
}

function parseHybridStream(rawText) {
  try {
    const j = JSON.parse(rawText)
    if (j.reply || j.content || j.message) return j.reply || j.content || j.message
  } catch (_) {}

  let fullReply = ''
  for (const line of String(rawText).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('data:')) {
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload)
        fullReply +=
          parsed.content ??
          parsed.text ??
          parsed.delta?.content ??
          parsed.choices?.[0]?.delta?.content ??
          parsed.candidates?.[0]?.content?.parts?.[0]?.text ??
          ''
      } catch (_) {
        fullReply += payload
      }
    } else {
      try {
        const parsed = JSON.parse(trimmed)
        fullReply += parsed.content ?? parsed.text ?? parsed.delta ?? ''
      } catch (_) {
        fullReply += (fullReply ? '\n' : '') + trimmed
      }
    }
  }
  return fullReply.trim() || rawText.trim()
}

/**
 * Mengirim prompt ke Google Gemini dengan dukungan Custom Model, Vision Image, & Web Search
 * @param {string} prompt - Teks pertanyaan atau perintah
 * @param {object} [options={}] - Opsi ({ model, image, webSearch, systemInstruction, useHistory })
 */
export async function askGemini(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt pertanyaan tidak boleh kosong!')
  }

  loadSilentCache()
  const modelCfg = resolveModelConfig(options.model || silentVault.selectedModel)
  const useWebSearch = options.webSearch !== undefined ? Boolean(options.webSearch) : Boolean(silentVault.webSearch)
  const customSys = options.systemInstruction !== undefined ? options.systemInstruction : silentVault.systemInstruction

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await initSilentBardSession(controller.signal)
    const attachments = options.image ? await resolveImageAttachment(options.image, controller.signal) : []

    if (silentVault.atToken && attachments.length === 0) {
      try {
        const reqId = Math.floor(100000 + Math.random() * 900000)
        const queryParams = new URLSearchParams({
          bl: silentVault.blVersion,
          _reqid: String(reqId),
          rt: 'c'
        })
        if (silentVault.sid) queryParams.set('f.sid', silentVault.sid)

        const innerReq = JSON.stringify([
          [prompt.trim(), 0, null, [], null, null, 0],
          ['id'],
          ['', '', '', null, null, null, null, null, null, '']
        ])
        const formBody = new URLSearchParams({
          'f.req': JSON.stringify([null, innerReq]),
          'at': silentVault.atToken
        })

        const bardRes = await fetch(`${BARD_STREAM_URL}?${queryParams.toString()}`, {
          method: 'POST',
          headers: {
            ...BROWSER_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'X-Same-Domain': '1',
            'x-goog-ext-525001261-jspb': modelCfg.bardHeader,
            ...(silentVault.cookie ? { Cookie: silentVault.cookie } : {})
          },
          body: formBody.toString(),
          signal: controller.signal
        })

        if (bardRes.ok) {
          const bardReply = parseBardEnvelope(await bardRes.text())
          if (bardReply) {
            silentVault.selectedModel = modelCfg.id
            silentVault.history.push(
              { role: 'user', content: prompt.trim() },
              { role: 'assistant', content: bardReply }
            )
            if (silentVault.history.length > 12) silentVault.history = silentVault.history.slice(-12)
            saveSilentCache()

            return {
              status: true,
              model_id: modelCfg.id,
              model_name: modelCfg.name,
              web_search: useWebSearch,
              reply: bardReply
            }
          }
        }
      } catch (_) {}
    }

    const finalSystemInstruction = [
      modelCfg.systemPrefix,
      customSys ? `Additional System Instruction: ${customSys}` : ''
    ].filter(Boolean).join('\n')

    const historyMessages = (options.useHistory !== false ? silentVault.history.slice(-6) : []).map((m) => ({
      role: m.role,
      content: m.content,
      attachments: []
    }))

    const messagesPayload = [
      ...historyMessages,
      {
        role: 'user',
        content: prompt.trim(),
        attachments
      }
    ]

    const res = await fetch(HYBRID_STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream, text/plain, */*',
        'Origin': 'https://leovandyz.web.id',
        'Referer': 'https://leovandyz.web.id/',
        'User-Agent': BROWSER_HEADERS['User-Agent']
      },
      body: JSON.stringify({
        messages: messagesPayload,
        model: modelCfg.apiModel,
        customModelId: modelCfg.id,
        systemInstruction: finalSystemInstruction,
        webSearch: useWebSearch
      }),
      signal: controller.signal
    })

    const rawText = await res.text()
    if (!res.ok) {
      throw new Error(`API Error HTTP ${res.status}: ${rawText.slice(0, 250)}`)
    }

    const reply = parseHybridStream(rawText)

    silentVault.selectedModel = modelCfg.id
    silentVault.history.push(
      { role: 'user', content: prompt.trim() },
      { role: 'assistant', content: reply }
    )
    if (silentVault.history.length > 12) silentVault.history = silentVault.history.slice(-12)
    saveSilentCache()

    return {
      status: true,
      model_id: modelCfg.id,
      model_name: modelCfg.name,
      web_search: useWebSearch,
      has_image: attachments.length > 0,
      reply
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  GEMINI_MODELS,
  resolveModelConfig,
  setGeminiModel,
  clearGeminiHistory,
  askGemini
}
