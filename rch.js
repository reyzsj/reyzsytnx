// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 27 November 2026
// 🍂 Function : WhatsApp Channel Reaction Base Module (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native Fetch (Zero NPM Dependency, Node.js v18+).
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

export const CREDIT = Object.freeze({
  Author: 'Dhanz (t.me/ktzckmy)',
  Channel: 'https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l'
})

const BASE_URL = 'https://reaction-whatsaap.vercel.app'
const API_ENDPOINT = 'https://api-cloud.my.id/tools/rchv2'
const TIMEOUT = 30_000

export const QUICK_EMOJIS = [
  '🔥', '😎', '❤️', '😂', '👍', '🙏',
  '😍', '🎉', '💯', '👏', '🤩', '✨',
  '💪', '🥳', '😮', '😢', '🤣', '😘',
  '🥰', '💕', '🤯', '😱', '💥', '⚡'
]

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  Referer: `${BASE_URL}/`,
  Origin: BASE_URL,
  Accept: 'application/json'
}

export function extractEmojis(text) {
  if (!text) return []
  try {
    const regex = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*/gu
    return [...new Set(String(text).match(regex) || [])]
  } catch {
    return [...new Set(Array.from(String(text)).filter((char) => {
      const code = char.codePointAt(0)
      return (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2600 && code <= 0x27BF)
    }))]
  }
}

export function normalizeChannelLink(link) {
  const raw = String(link || '').trim()
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

/**
 * Kirim reaksi ke postingan channel WhatsApp
 * @param {string} link
 * @param {string|string[]} [emojiInput='🔥']
 */
export async function sendReaction(link, emojiInput = '🔥') {
  const cleanLink = normalizeChannelLink(link)
  if (!cleanLink) throw new Error('Link channel WhatsApp wajib diisi!')
  if (!/whatsapp\.com\/channel\/[a-zA-Z0-9_-]+\/\d+/.test(cleanLink)) {
    throw new Error('Format link channel WhatsApp tidak valid. Contoh: https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l/1')
  }

  let emojiList = Array.isArray(emojiInput)
    ? emojiInput.flatMap(extractEmojis)
    : extractEmojis(emojiInput)
  if (!emojiList.length) emojiList = ['🔥']

  const maxEmojis = emojiList.slice(0, 15)
  const targetUrl = `${API_ENDPOINT}?link=${encodeURIComponent(cleanLink)}&emoji=${encodeURIComponent(maxEmojis.join(''))}`

  const res = await fetch(targetUrl, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT)
  })

  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch {}

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
  }
  if (!data) throw new Error('Tidak ada respons dari server provider!')
  if (data.status === false) {
    throw new Error(data.error || data.message || 'Gagal mengirim reaksi!')
  }

  return {
    target: cleanLink,
    emojis: maxEmojis,
    totalEmojis: maxEmojis.length,
    providerResult: data.result || null,
    quota: data.quota || null
  }
}

export async function react(link, emojiInput = '🔥') {
  const t0 = Date.now()
  try {
    const result = await sendReaction(link, emojiInput)
    return { ...CREDIT, time: `${Date.now() - t0}ms`, status: true, result }
  } catch (err) {
    return { ...CREDIT, time: `${Date.now() - t0}ms`, status: false, error: err.message }
  }
}

export async function listEmojis() {
  const t0 = Date.now()
  return {
    ...CREDIT,
    time: `${Date.now() - t0}ms`,
    status: true,
    result: { quickEmojis: QUICK_EMOJIS, maxEmojis: 15 }
  }
}

export const extract = react

export default {
  CREDIT,
  QUICK_EMOJIS,
  extractEmojis,
  normalizeChannelLink,
  sendReaction,
  react,
  listEmojis,
  extract
}
