// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Gemini AI Unofficial Scraper Module (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

import crypto from 'node:crypto'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'
const HOME = 'https://gemini.google.com/app'
const ENDPOINT = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'
const TIMEOUT = 45_000

const hex = (n) => crypto.randomBytes(n).toString('hex')
const uuid = () => crypto.randomUUID().toUpperCase()
const reqid = () => Math.floor(Math.random() * 900000) + 100000
const pack = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
const unpack = (s) => {
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')) } catch { return null }
}

async function bootstrap() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(HOME, {
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    })

    const setc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    const cookie = setc.map((c) => c.split(';')[0]).join('; ')
    const html = await res.text()

    return {
      cookie,
      bl: (html.match(/"cfb2h":"(.*?)"/) || [])[1] || '',
      fsid: (html.match(/"FdrFJe":"(.*?)"/) || [])[1] || '',
      uid: uuid()
    }
  } finally {
    clearTimeout(timer)
  }
}

function buildBody(message, resume, uid) {
  const inner = [
    [message, 0, null, null, null, null, 0],
    ['en-US'],
    resume,
    '',
    hex(16),
    null,
    [1],
    1,
    null,
    null,
    1,
    0,
    null,
    null,
    null,
    null,
    null,
    [[0]],
    0,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    1,
    null,
    null,
    [4],
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [2],
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    0,
    null,
    null,
    null,
    null,
    null,
    uid,
    null,
    [],
    null,
    null,
    null,
    null,
    null,
    null,
    2,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    1
  ]
  return 'f.req=' + encodeURIComponent(JSON.stringify([null, JSON.stringify(inner)])) + '&'
}

function parseReply(raw) {
  const out = { text: '', conversationId: null, responseId: null, replyId: null }
  let best = ''

  for (const line of (raw || '').split('\n')) {
    const s = line.trim()
    if (!s.startsWith('[["wrb.fr"')) continue

    let outer
    try { outer = JSON.parse(s) } catch { continue }

    for (const row of outer) {
      if (!Array.isArray(row) || row[0] !== 'wrb.fr' || typeof row[2] !== 'string') continue

      let body
      try { body = JSON.parse(row[2]) } catch { continue }

      const ids = body[1]
      if (Array.isArray(ids)) {
        if (typeof ids[0] === 'string' && ids[0].startsWith('c_')) out.conversationId = ids[0]
        if (typeof ids[1] === 'string' && ids[1].startsWith('r_')) out.responseId = ids[1]
      }

      const seg = Array.isArray(body[4]) ? body[4][0] : null
      if (seg) {
        if (seg[0]) out.replyId = seg[0]
        if (Array.isArray(seg[1])) {
          const piece = seg[1].join('')
          if (piece.length > best.length) best = piece
        }
      }
    }
  }

  out.text = best.trim()
  return out
}

/**
 * Chat dengan Gemini AI
 * @param {string} message - Pesan atau prompt
 * @param {Object} [options={}]
 * @param {string|null} [options.sessionId=null] - Session ID base64 untuk percakapan berlanjut
 */
export async function geminiChat(message, options = {}) {
  const sess = options.sessionId ? unpack(options.sessionId) : null
  const ctx = sess && sess.cookie ? sess : await bootstrap()
  const resume = sess && sess.resume
    ? [sess.resume[0] || '', sess.resume[1] || '', sess.resume[2] || '', null, null, null, null, null, null, '']
    : ['', '', '', null, null, null, null, null, null, '']

  const url = `${ENDPOINT}?bl=${encodeURIComponent(ctx.bl)}&f.sid=${encodeURIComponent(ctx.fsid)}&hl=en-US&_reqid=${reqid()}&rt=c`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': UA,
        'origin': 'https://gemini.google.com',
        'referer': 'https://gemini.google.com/',
        'x-same-domain': '1',
        'x-goog-ext-525001261-jspb': JSON.stringify([1, null, null, null, hex(8), null, null, 0, [4, 6], null, null, 1, null, null, 1, null, uuid()]),
        'x-goog-ext-525005358-jspb': JSON.stringify([ctx.uid, 1]),
        'x-goog-ext-73010990-jspb': '[0,0,0]',
        'x-goog-ext-73010989-jspb': '[0]',
        'cookie': ctx.cookie
      },
      body: buildBody(String(message), resume, ctx.uid),
      signal: controller.signal
    })

    const raw = await res.text()
    const reply = parseReply(raw)
    const isOk = res.ok && Boolean(reply.text)

    return {
      status: res.status,
      response: reply.text || null,
      sessionId: isOk
        ? pack({
            cookie: ctx.cookie,
            bl: ctx.bl,
            fsid: ctx.fsid,
            uid: ctx.uid,
            resume: [reply.conversationId, reply.responseId, reply.replyId]
          })
        : (options.sessionId || null)
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  geminiChat
}
