// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 28 November 2026
// 🍂 Function : NoTrack AI Chat Base Module (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch + SSE Stream (Zero NPM Dependency, Node.js v18+).
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE = 'https://notrack.ai'
const TIMEOUT = 60_000
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'

export const NOTRACK_PERSONAS = Object.freeze(['normal', 'concise', 'detailed', 'creative'])

/**
 * Buat cookie sesi anonim baru (`uid=...`) dari /chat
 */
export async function createSession() {
  const res = await fetch(`${BASE}/chat`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(20_000)
  })
  if (!res.ok) throw new Error(`Gagal membuka sesi /chat (HTTP ${res.status})`)
  const rawCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=\s*[a-zA-Z0-9_.-]+=)/).filter(Boolean)
  return rawCookies.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
}

/**
 * Kirim pesan ke NoTrack AI (mendukung single-shot maupun multi-turn)
 * @param {string} prompt
 * @param {object} [opts]
 * @param {'normal'|'concise'|'detailed'|'creative'} [opts.persona='normal']
 * @param {string} [opts.model='C']
 * @param {string} [opts.mode='usual']
 * @param {string|null} [opts.chatId=null]     Simpan & kirim ulang untuk lanjut percakapan
 * @param {string} [opts.cookie='']            Simpan & kirim ulang bersama chatId
 * @param {string} [opts.instructions='']      Custom instructions (maks 2000 karakter, chat baru)
 * @param {(chunk: string) => void} [opts.onDelta]
 */
export async function askNoTrack(prompt, {
  persona = 'normal',
  model = 'C',
  mode = 'usual',
  chatId = null,
  cookie = '',
  instructions = '',
  onDelta
} = {}) {
  const text = String(prompt || '').trim()
  if (!text) throw new Error('Prompt tidak boleh kosong!')

  const activePersona = NOTRACK_PERSONAS.includes(persona) ? persona : 'normal'
  const activeCookie = cookie || await createSession()

  const payload = {
    user_input: text,
    mode,
    model,
    persona: activePersona,
    max_turns: 1,
    chat_id: chatId || null,
    attachments: [],
    regenerate: false,
    edit: false,
    edit_mid: null,
    via: 'typed',
    ...(!chatId && instructions ? { instructions: String(instructions).slice(0, 2000) } : {})
  }

  const res = await fetch(`${BASE}/api/dispatch`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      Origin: BASE,
      Referer: `${BASE}/chat`,
      ...(activeCookie ? { Cookie: activeCookie } : {})
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT)
  })

  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (!res.ok && !ct.includes('text/event-stream')) {
    const errText = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200) || 'Permintaan ditolak'}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let streamed = ''
  let finalAnswer = ''
  let outChatId = chatId || null
  let userMsgId = null
  let answerMsgId = null
  let busyNotice = null

  const handleLine = (line) => {
    if (!line.startsWith('data: ')) return
    let evt
    try { evt = JSON.parse(line.slice(6)) } catch { return }

    if (evt.type === 'chat_meta' && evt.chat_id) {
      outChatId = evt.chat_id
    } else if (evt.type === 'user' && evt.message_id) {
      userMsgId = evt.message_id
    } else if (evt.type === 'busy' && evt.text) {
      busyNotice = evt.text
    } else if (evt.type === 'delta' && evt.chunk) {
      streamed += evt.chunk
      onDelta?.(evt.chunk)
    } else if (evt.type === 'message' || evt.type === 'consensus') {
      if (evt.content) finalAnswer = evt.content
      if (evt.message_id) answerMsgId = evt.message_id
    } else if (evt.type === 'instr_refused') {
      throw new Error(`Instruksi ditolak server (${evt.reason || 'refused'})`)
    } else if (evt.type === 'error') {
      throw new Error(evt.content || evt.code || 'Terjadi error dari stream server')
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() || ''
    for (const line of lines) handleLine(line)
  }
  if (buf.trim()) handleLine(buf.trim())

  return {
    success: true,
    chat_id: outChatId,
    cookie: activeCookie,
    model,
    persona: activePersona,
    user_message_id: userMsgId,
    message_id: answerMsgId,
    busy_notice: busyNotice,
    answer: finalAnswer || streamed
  }
}

export async function listChats(cookie) {
  if (!cookie) throw new Error('Cookie sesi wajib diisi!')
  const res = await fetch(`${BASE}/api/chats`, {
    headers: { 'User-Agent': UA, Accept: 'application/json', Referer: `${BASE}/chat`, Cookie: cookie },
    signal: AbortSignal.timeout(20_000)
  })
  if (!res.ok) throw new Error(`Gagal mengambil daftar chat (HTTP ${res.status})`)
  return res.json()
}

export async function deleteChat(chatId, cookie) {
  if (!chatId || !cookie) throw new Error('chatId dan cookie wajib diisi!')
  const res = await fetch(`${BASE}/api/chat?id=${encodeURIComponent(chatId)}`, {
    method: 'DELETE',
    headers: { 'User-Agent': UA, Origin: BASE, Referer: `${BASE}/chat`, Cookie: cookie },
    signal: AbortSignal.timeout(20_000)
  })
  if (!res.ok) throw new Error(`Gagal menghapus chat (HTTP ${res.status})`)
  return { success: true, deleted_chat_id: chatId }
}

export default {
  askNoTrack,
  createSession,
  listChats,
  deleteChat,
  NOTRACK_PERSONAS
}
