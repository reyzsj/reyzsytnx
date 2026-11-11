// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 11 November 2026
// 🍂 Function : Z.ai Chat Stream Base Module Fix 404 (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Cookie & sesi dikelola otomatis di background tanpa diketahui user.
// ---------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE_URL = 'https://chat.z.ai'
const API_AUTHS = `${BASE_URL}/api/v1/auths/`
const API_MODELS = `${BASE_URL}/api/models`
const CHAT_ENDPOINTS = [
  `${BASE_URL}/api/chat`,
  `${BASE_URL}/api/v1/chat/completions`,
  'https://leovandyz.web.id/api/chat/stream'
]
const CACHE_FILE = path.join(os.tmpdir(), '.zai_chat_silent_session.json')
const TIMEOUT = 60_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

const DEFAULT_MODELS = [
  { id: 'gpt-4o', name: 'Z.ai GPT-4o' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Z.ai Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', name: 'Z.ai Gemini 1.5 Pro' }
]

let silentVault = {
  cookie: '',
  authToken: '',
  selectedModel: 'gpt-4o',
  history: [],
  updatedAt: 0
}

function loadSilentCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      silentVault = { ...silentVault, ...parsed }
    }
  } catch (_) {}
}

function saveSilentCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(silentVault), 'utf-8')
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
    const res = await fetch(`${BASE_URL}/`, {
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

/**
 * Mengambil daftar model AI yang tersedia di Z.ai (/api/models)
 */
export async function getZaiModels() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)
    const headers = { ...BROWSER_HEADERS }
    if (silentVault.cookie) headers['Cookie'] = silentVault.cookie
    if (silentVault.authToken) headers['Authorization'] = `Bearer ${silentVault.authToken}`

    const res = await fetch(API_MODELS, {
      method: 'GET',
      headers,
      signal: controller.signal
    })

    const rawText = await res.text()
    if (!res.ok) {
      return { status: true, is_fallback: true, data: DEFAULT_MODELS }
    }

    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}
    return { status: true, is_fallback: false, data: data?.data || data || DEFAULT_MODELS }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengirim prompt ke Z.ai Chat API dengan Endpoint Resolver Anti 404
 * @param {string} promptText - Pesan yang akan dikirim
 * @param {string} [modelId=''] - Opsional ID Model
 */
export async function sendZaiMessage(promptText, modelId = '') {
  if (!promptText || !String(promptText).trim()) {
    throw new Error('Prompt teks tidak boleh kosong!')
  }

  loadSilentCache()
  const targetModel = String(modelId).trim() || silentVault.selectedModel
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)

    const headers = {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    }
    if (silentVault.cookie) headers['Cookie'] = silentVault.cookie
    if (silentVault.authToken) headers['Authorization'] = `Bearer ${silentVault.authToken}`

    const payload = {
      model: targetModel,
      messages: [
        ...silentVault.history.slice(-6),
        { role: 'user', content: promptText.trim() }
      ],
      stream: true,
      temperature: 0.7
    }

    let res = null
    let rawText = ''
    let usedEndpoint = ''

    for (const ep of CHAT_ENDPOINTS) {
      try {
        const epHeaders = { ...headers }
        if (ep.includes('leovandyz')) {
          epHeaders['Origin'] = 'https://leovandyz.web.id'
          epHeaders['Referer'] = 'https://leovandyz.web.id/'
        }
        res = await fetch(ep, {
          method: 'POST',
          headers: epHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        rawText = await res.text()

        if (res.status === 404 || res.status === 405) continue
        usedEndpoint = ep
        break
      } catch (err) {
        if (err.name === 'AbortError') throw err
        continue
      }
    }

    if (!res || !res.ok) {
      throw new Error(`API Error HTTP ${res?.status || 500}: ${rawText.slice(0, 250) || 'Gagal tersambung ke engine chat.'}`)
    }

    let fullReply = ''
    for (const line of rawText.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const dataStr = trimmed.slice(6)
      if (dataStr === '[DONE]') break
      try {
        const parsed = JSON.parse(dataStr)
        if (parsed.choices?.[0]?.delta?.content) {
          fullReply += parsed.choices[0].delta.content
        } else if (parsed.content) {
          fullReply += parsed.content
        }
      } catch (_) {}
    }

    const finalAnswer = fullReply.trim() || rawText.trim()
    silentVault.selectedModel = targetModel
    silentVault.history.push(
      { role: 'user', content: promptText.trim() },
      { role: 'assistant', content: finalAnswer }
    )
    if (silentVault.history.length > 12) silentVault.history = silentVault.history.slice(-12)
    saveSilentCache()

    return {
      status: true,
      model: targetModel,
      endpoint: usedEndpoint,
      reply: finalAnswer
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengatur Bearer Auth Token agar bisa mengakses model premium di Z.ai
 * @param {string} token - Token autentikasi
 */
export async function setZaiAuthToken(token) {
  loadSilentCache()
  const cleanToken = String(token || '').trim()

  if (!cleanToken) {
    silentVault.authToken = ''
    saveSilentCache()
    return { status: true, message: 'Token dihapus.' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    await ensureSilentSession(controller.signal)
    const headers = {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${cleanToken}`
    }
    if (silentVault.cookie) headers['Cookie'] = silentVault.cookie

    const res = await fetch(API_AUTHS, {
      method: 'GET',
      headers,
      signal: controller.signal
    })

    const rawText = await res.text()
    let data = null
    try { data = JSON.parse(rawText) } catch (_) {}

    if (!res.ok) throw new Error('Token tidak valid atau kadaluarsa.')

    silentVault.authToken = cleanToken
    saveSilentCache()
    return { status: true, message: 'Token berhasil diatur.', auth_data: data }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Menghapus memory percakapan pada session Z.ai aktif
 */
export function clearZaiMemory() {
  loadSilentCache()
  silentVault.history = []
  saveSilentCache()
  return { status: true, message: 'Memory percakapan berhasil dibersihkan.' }
}

export default {
  getZaiModels,
  sendZaiMessage,
  setZaiAuthToken,
  clearZaiMemory
}
