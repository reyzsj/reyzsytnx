// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : AbeeCloud AM Premium CLI Menu Fix Verify (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Native Fetch (Zero Dependency, Node.js v18+).
// Fix HTTP 400 Verify: Auto-Detect JSON Keys Frontend + Konfirmasi Email/Gmail Ulang.
// Error fix sendiri.
// ---------------------------------------------------------

import readline from 'node:readline'
import dns from 'node:dns'
import net from 'node:net'
import crypto from 'node:crypto'

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const BASE_URL = 'https://abeecloud.vercel.app'
const CATCHMAIL_API = 'https://api.catchmail.io/api/v1'
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const ask = (query) => new Promise((resolve) => rl.question(query, resolve))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const state = {
  activeEmail: '',
  domains: [],
  stats: null,
  verifyKeys: null
}

async function pause() {
  await ask('\nTekan [Enter] untuk kembali ke menu...')
}

function formatNetError(err) {
  const causeMsg = err?.cause?.code || err?.cause?.message || ''
  return causeMsg ? `${err.message} (${causeMsg})` : (err?.message || 'Unknown error')
}

function sanitizeUsername(name = '') {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32)
}

function normalizeMailText(raw = '') {
  let text = String(raw || '')
  if (/=3D/i.test(text)) {
    text = text
      .replace(/=\r?\n/g, '')
      .replace(/=3D/gi, '=')
      .replace(/=26/gi, '&')
  }
  return text
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
}

function cleanExtractedUrl(url = '') {
  return normalizeMailText(url)
    .replace(/[.,;)'"<>\\\s]+$/, '')
    .trim()
}

function collectStrings(value, out = []) {
  if (!value) return out
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
  } else if (typeof value === 'object') {
    const priorityKeys = ['html', 'text', 'body', 'content', 'message', 'data']
    for (const k of priorityKeys) {
      if (k in value) collectStrings(value[k], out)
    }
    for (const [k, v] of Object.entries(value)) {
      if (!priorityKeys.includes(k)) collectStrings(v, out)
    }
  }
  return out
}

function extractMagicLink(messageData) {
  const candidates = collectStrings(messageData)
  const patterns = [
    /https?:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?[^\s"'<>\\]+/i,
    /https?:\/\/[a-zA-Z0-9._-]*firebaseapp\.com\/__\/auth\/[^\s"'<>\\]+/i,
    /href=["'](https?:\/\/[^"']+(?:alight-creative\.firebaseapp\.com|alightcreative\.com|alightmotion\.com|oobCode=)[^"']*)["']/i,
    /https?:\/\/[^\s"'<>\\]*oobCode=[^\s"'<>\\]+/i
  ]

  for (const rawBlock of candidates) {
    const text = normalizeMailText(rawBlock)
    for (const regex of patterns) {
      const match = text.match(regex)
      const hit = match?.[1] || match?.[0]
      if (hit && hit.startsWith('http')) {
        return cleanExtractedUrl(hit)
      }
    }
  }
  return ''
}

function parseLinkTokens(cleanLink) {
  let oobCode = ''
  let apiKey = ''
  let innerLink = ''
  try {
    const outer = new URL(cleanLink)
    oobCode = outer.searchParams.get('oobCode') || ''
    apiKey = outer.searchParams.get('apiKey') || ''
    const nested = outer.searchParams.get('link')
    if (nested && nested.startsWith('http')) {
      innerLink = nested
      const inner = new URL(nested)
      if (!oobCode) oobCode = inner.searchParams.get('oobCode') || ''
      if (!apiKey) apiKey = inner.searchParams.get('apiKey') || ''
    }
  } catch (_) {}
  return { oobCode, apiKey, innerLink }
}

async function fetchJson(fullUrl, { method = 'GET', body = null, headers = {} } = {}) {
  const finalHeaders = { ...BROWSER_HEADERS, ...headers }
  const options = {
    method,
    headers: finalHeaders,
    signal: AbortSignal.timeout(TIMEOUT)
  }
  if (body !== null) {
    finalHeaders['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const res = await fetch(fullUrl, options)
  const rawText = await res.text()
  let data = null
  try { data = JSON.parse(rawText) } catch (_) {}

  return { ok: res.ok, status: res.status, data, rawText }
}

async function detectVerifyPayloadKeys() {
  if (state.verifyKeys) return state.verifyKeys
  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) return []
    const html = await res.text()

    const idx = html.indexOf('/api/verify-link')
    if (idx === -1) return []

    const snippet = html.slice(idx, idx + 700)
    const bodyMatch = snippet.match(/JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/)
    if (!bodyMatch?.[1]) return []

    const keys = []
    for (const part of bodyMatch[1].split(',')) {
      const keyMatch = part.trim().match(/^["']?([a-zA-Z0-9_$]+)["']?(?:\s*:|$)/)
      if (keyMatch?.[1]) keys.push(keyMatch[1])
    }

    state.verifyKeys = keys
    return keys
  } catch (_) {
    return []
  }
}

function buildVerifyPayload(targetLink, cleanEmail, detectedKeys = []) {
  const { oobCode, apiKey } = parseLinkTokens(targetLink)

  const payload = {
    email: cleanEmail,
    gmail: cleanEmail,
    link: targetLink,
    url: targetLink,
    emailLink: targetLink,
    verifyLink: targetLink,
    verificationLink: targetLink,
    magicLink: targetLink,
    signInLink: targetLink,
    authLink: targetLink,
    firebaseLink: targetLink,
    linkEmail: targetLink,
    email_link: targetLink,
    verify_link: targetLink,
    magic_link: targetLink,
    ...(oobCode ? { oobCode, code: oobCode } : {}),
    ...(apiKey ? { apiKey } : {})
  }

  for (const key of detectedKeys) {
    if (/oob/i.test(key) && oobCode) {
      payload[key] = oobCode
    } else if (/apikey/i.test(key) && apiKey) {
      payload[key] = apiKey
    } else if (/link|url|href|verif|magic|auth|sign|action/i.test(key)) {
      payload[key] = targetLink
    } else if (/mail|gmail|user|akun|account/i.test(key)) {
      payload[key] = cleanEmail
    }
  }

  return payload
}

async function refreshStatsAndDomains() {
  try {
    const [st, dm] = await Promise.all([
      fetchJson(`${BASE_URL}/api/stats`).catch(() => null),
      fetchJson(`${BASE_URL}/api/tempmail/generate`).catch(() => null),
      detectVerifyPayloadKeys().catch(() => null)
    ])
    if (st?.ok && st.data) state.stats = st.data
    if (dm?.ok && dm.data) {
      const list = Array.isArray(dm.data.domains) && dm.data.domains.length > 0
        ? dm.data.domains
        : (dm.data.domain ? [dm.data.domain] : (dm.data.email ? [dm.data.email.split('@')[1]] : []))
      if (list.length > 0) state.domains = list
    }
  } catch (_) {}
}

async function generateTempMail(customName = '', domain = '') {
  const cleanName = sanitizeUsername(customName)
  const cleanDomain = String(domain || '').trim().replace(/^@/, '')

  const query = cleanDomain ? `?domain=${encodeURIComponent(cleanDomain)}` : ''
  const r = await fetchJson(`${BASE_URL}/api/tempmail/generate${query}`).catch(() => null)

  let availableDomains = [...state.domains]
  let generatedEmail = ''
  let selectedDomain = cleanDomain

  if (r?.ok && r.data) {
    if (Array.isArray(r.data.domains) && r.data.domains.length > 0) {
      availableDomains = r.data.domains
      state.domains = r.data.domains
    }
    if (r.data.email && r.data.email.includes('@')) {
      generatedEmail = r.data.email
      if (!selectedDomain) selectedDomain = r.data.domain || r.data.email.split('@')[1]
    }
  }

  if (availableDomains.length === 0) {
    availableDomains = selectedDomain ? [selectedDomain] : ['catchmail.io']
  }
  if (!selectedDomain) selectedDomain = availableDomains[0]

  const finalEmail = cleanName
    ? `${cleanName}@${selectedDomain}`
    : (generatedEmail || `user${crypto.randomBytes(4).toString('hex')}@${selectedDomain}`)

  state.activeEmail = finalEmail
  return {
    success: true,
    email: finalEmail,
    custom: Boolean(cleanName),
    domain: selectedDomain,
    domains: availableDomains
  }
}

function normalizeInboxList(rawData) {
  const list = Array.isArray(rawData)
    ? rawData
    : (rawData?.messages || rawData?.inbox || rawData?.emails || rawData?.data?.messages || rawData?.data || [])

  if (!Array.isArray(list)) return []
  return list.map((m) => ({
    id: String(m.id || m._id || m.messageId || m.uid || ''),
    from: typeof m.from === 'object' ? (m.from?.address || m.from?.text || JSON.stringify(m.from)) : String(m.from || m.sender || '-'),
    subject: String(m.subject || '(Tanpa Subjek)'),
    date: String(m.date || m.createdAt || m.created_at || m.receivedAt || '-'),
    raw: m
  })).filter((m) => m.id)
}

async function getTempMailInbox(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const attempts = [
    { source: 'abeecloud', url: `${BASE_URL}/api/tempmail/inbox?email=${encodeURIComponent(cleanEmail)}` },
    { source: 'catchmail-v1', url: `${CATCHMAIL_API}/mailbox?address=${encodeURIComponent(cleanEmail)}` }
  ]

  let lastErr = ''
  for (const att of attempts) {
    try {
      const r = await fetchJson(att.url, {
        headers: att.source === 'catchmail-v1'
          ? { Origin: 'https://catchmail.io', Referer: 'https://catchmail.io/' }
          : {}
      })

      if (r.status === 404 && /empty|not found|no message/i.test(r.rawText)) {
        return { success: true, source: att.source, email: cleanEmail, total: 0, messages: [] }
      }
      if (r.ok && r.data) {
        const messages = normalizeInboxList(r.data)
        return { success: true, source: att.source, email: cleanEmail, total: messages.length, messages }
      }
      lastErr = `${att.source} HTTP ${r.status}`
    } catch (err) {
      lastErr = `${att.source}: ${formatNetError(err)}`
    }
  }
  throw new Error(`Gagal cek inbox (${lastErr})`)
}

async function getTempMailMessage(id, email = '') {
  const cleanId = String(id || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()

  const attempts = [
    ...(cleanEmail ? [{ source: 'abeecloud-email', url: `${BASE_URL}/api/tempmail/message?id=${encodeURIComponent(cleanId)}&email=${encodeURIComponent(cleanEmail)}` }] : []),
    { source: 'abeecloud-id', url: `${BASE_URL}/api/tempmail/message?id=${encodeURIComponent(cleanId)}` },
    ...(cleanEmail ? [{ source: 'catchmail-v1', url: `${CATCHMAIL_API}/message/${encodeURIComponent(cleanId)}?mailbox=${encodeURIComponent(cleanEmail)}` }] : [])
  ]

  let lastErr = ''
  for (const att of attempts) {
    try {
      const r = await fetchJson(att.url, {
        headers: att.source === 'catchmail-v1'
          ? { Origin: 'https://catchmail.io', Referer: 'https://catchmail.io/' }
          : {}
      })

      if (r.ok && (r.data || r.rawText)) {
        const payload = r.data || r.rawText
        return {
          success: true,
          source: att.source,
          id: cleanId,
          subject: r.data?.subject || r.data?.message?.subject || r.data?.data?.subject || '-',
          from: r.data?.from || r.data?.message?.from || r.data?.data?.from || '-',
          magicLink: extractMagicLink(payload),
          raw: payload
        }
      }
      lastErr = `${att.source} HTTP ${r.status}`
    } catch (err) {
      lastErr = `${att.source}: ${formatNetError(err)}`
    }
  }
  throw new Error(`Gagal membaca isi pesan (${lastErr})`)
}

async function sendAmLink(email) {
  const r = await fetchJson(`${BASE_URL}/api/send-link`, {
    method: 'POST',
    body: { email }
  })
  if (!r.ok || r.data?.success === false) {
    throw new Error(`HTTP ${r.status}: ${r.data?.message || r.data?.error || r.rawText.slice(0, 150)}`)
  }
  return r.data ?? r.rawText
}

async function verifyAmLink(link, email) {
  const cleanLink = cleanExtractedUrl(link)
  const cleanEmail = String(email || '').trim()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Konfirmasi Email/Gmail wajib diisi!')
  }

  const detectedKeys = await detectVerifyPayloadKeys()
  const { innerLink } = parseLinkTokens(cleanLink)
  const linkCandidates = innerLink ? [cleanLink, innerLink] : [cleanLink]

  let lastErr = ''
  for (const candidateUrl of linkCandidates) {
    const payload = buildVerifyPayload(candidateUrl, cleanEmail, detectedKeys)
    const r = await fetchJson(`${BASE_URL}/api/verify-link`, {
      method: 'POST',
      body: payload
    })

    if (r.ok && r.data?.success !== false) {
      return r.data ?? r.rawText
    }
    lastErr = `HTTP ${r.status}: ${r.data?.message || r.data?.error || r.rawText.slice(0, 160)}`
  }

  throw new Error(lastErr || 'Gagal memverifikasi tautan.')
}

async function promptChooseDomain() {
  if (state.domains.length === 0) await refreshStatsAndDomains()
  if (state.domains.length === 0) return ''

  console.log('\n--- PILIH DOMAIN TEMPMAIL ---')
  state.domains.forEach((d, i) => console.log(`  [${i + 1}] @${d}`))
  const pick = (await ask(`Pilih nomor domain (1-${state.domains.length}) [Enter = 1]: `)).trim()
  const idx = parseInt(pick, 10)
  if (idx >= 1 && idx <= state.domains.length) return state.domains[idx - 1]
  return state.domains[0]
}

async function handleAutoActivation() {
  const customName = (await ask('\n[?] Custom Name Email [Enter = Acak otomatis]: ')).trim()
  const domain = await promptChooseDomain()

  console.log('\n[*] [1/4] Menyiapkan TempMail...')
  const mailRes = await generateTempMail(customName, domain)
  const email = mailRes.email
  console.log(`[+] TempMail aktif: ${email}`)

  console.log(`[*] [2/4] Mengirim link aktivasi ke ${email}...`)
  await sendAmLink(email)
  console.log('[+] Permintaan terkirim! Memantau inbox (maks 90 detik)...')

  const deadline = Date.now() + 90_000
  let magicLink = ''
  let attempts = 0

  while (Date.now() < deadline) {
    attempts++
    process.stdout.write(`\r[*] [3/4] Mengecek inbox (percobaan #${attempts})...`)
    await sleep(4000)

    try {
      const inbox = await getTempMailInbox(email)
      for (const msg of inbox.messages) {
        const quickLink = extractMagicLink(msg.raw)
        if (quickLink) {
          magicLink = quickLink
          break
        }
        const detail = await getTempMailMessage(msg.id, email)
        if (detail.magicLink) {
          magicLink = detail.magicLink
          break
        }
      }
      if (magicLink) break
    } catch (_) {}
  }

  console.log('')
  if (!magicLink) {
    throw new Error('Timeout: Email belum masuk dalam 90 detik. Cek manual lewat Menu [4].')
  }

  console.log(`[+] Link Firebase terdeteksi:\n    ${magicLink}`)

  // Konfirmasi ulang Email/Gmail sebelum mengeksekusi /api/verify-link
  const confirmedEmail = (await ask(`\n[?] Konfirmasi Email/Gmail untuk verifikasi [Enter = ${email}]: `)).trim() || email

  console.log(`\n[*] [4/4] Memproses verifikasi AM Premium untuk ${confirmedEmail}...`)
  const verifyRes = await verifyAmLink(magicLink, confirmedEmail)

  console.log('\n==============================================')
  console.log('       ✅ AKTIVASI AM PREMIUM SELESAI!        ')
  console.log('==============================================')
  console.log(`Email Akun : ${confirmedEmail}`)
  console.log('Response   :', JSON.stringify(verifyRes, null, 2))
  console.log('==============================================')
}

async function menu() {
  await refreshStatsAndDomains()

  while (true) {
    console.clear()
    console.log('==============================================')
    console.log('     ABEECLOUD AM PREMIUM ACTIVATION MENU     ')
    console.log('==============================================')
    console.log(`[*] Total Aktivasi : ${state.stats?.total ?? '-'} | Hari Ini: ${state.stats?.today ?? '-'}`)
    console.log(`[*] TempMail Aktif : ${state.activeEmail || 'Belum dibuat'}`)
    console.log(`[*] Verify Keys    : ${state.verifyKeys?.length ? state.verifyKeys.join(', ') : 'Auto-Detect'}`)
    console.log('----------------------------------------------')
    console.log('[1] Auto Aktivasi AM Premium (TempMail + Konfirmasi Verify)')
    console.log('[2] Buat TempMail Baru (Support Custom Name & Domain)')
    console.log('[3] Kirim Link Aktivasi (/api/send-link)')
    console.log('[4] Cek Inbox, Ambil Link Firebase & Verif Langsung')
    console.log('[5] Verifikasi Link Manual (Konfirmasi Email/Gmail + Link)')
    console.log('[6] Refresh Statistik Server (/api/stats)')
    console.log('[7] Cek Payload Keys Frontend (/api/verify-link)')
    console.log('[0] Keluar')
    console.log('==============================================')

const choice = (await ask('Pilih menu (0-7): ')).trim()

    if (choice === '1') {
      try {
        await handleAutoActivation()
        await refreshStatsAndDomains()
      } catch (err) {
        console.error(`\n[-] Error: ${formatNetError(err)}`)
      }
      await pause()
    } else if (choice === '2') {
      try {
        const customName = (await ask('\n[?] Masukkan Custom Name (misal: dhanzpro) [Enter = Acak]: ')).trim()
        const domain = await promptChooseDomain()
        console.log('\n[*] Membuat alamat TempMail...')
        const res = await generateTempMail(customName, domain)
        console.log('\n[+] TEMPMAIL SIAP DIGUNAKAN:')
        console.log(JSON.stringify(res, null, 2))
      } catch (err) {
        console.error(`\n[-] Error: ${formatNetError(err)}`)
      }
      await pause()
    } else if (choice === '3') {
      const label = state.activeEmail
        ? `\n[?] Masukkan Email/Gmail Tujuan [Enter = ${state.activeEmail}]: `
        : '\n[?] Masukkan Email/Gmail Tujuan: '
      const email = (await ask(label)).trim() || state.activeEmail

      if (!email || !email.includes('@')) {
        console.log('[-] Email tidak valid!')
      } else {
        try {
          state.activeEmail = email
          console.log(`\n[*] Mengirim link aktivasi ke ${email}...`)
          const res = await sendAmLink(email)
          console.log('\n[+] RESPONSE SEND LINK:')
          console.log(JSON.stringify(res, null, 2))
        } catch (err) {
          console.error(`\n[-] Error: ${formatNetError(err)}`)
        }
      }
      await pause()
    } else if (choice === '4') {
      const label = state.activeEmail
        ? `\n[?] Email TempMail [Enter = ${state.activeEmail}]: `
        : '\n[?] Masukkan Email TempMail: '
      const email = (await ask(label)).trim() || state.activeEmail

      if (!email || !email.includes('@')) {
        console.log('[-] Email tidak valid!')
      } else {
        try {
          state.activeEmail = email
          console.log(`\n[*] Mengecek inbox (${email})...`)
          const inbox = await getTempMailInbox(email)

          if (inbox.messages.length === 0) {
            console.log(`[-] Inbox masih kosong (Sumber: ${inbox.source}).`)
          } else {
            console.log(`\n[+] DITEMUKAN ${inbox.messages.length} PESAN (Sumber: ${inbox.source}):`)
            inbox.messages.forEach((m, i) => {
              console.log(`  [${i + 1}] ${m.subject}`)
              console.log(`      Dari: ${m.from} | ID: ${m.id}`)
            })

            const pick = parseInt((await ask('\n[?] Pilih nomor pesan untuk ekstrak link (0 = kembali): ')).trim(), 10)
            if (pick > 0 && pick <= inbox.messages.length) {
              const chosen = inbox.messages[pick - 1]
              console.log('\n[*] Membaca isi pesan & memindai tautan Firebase...')
              const detail = await getTempMailMessage(chosen.id, email)
              const foundLink = detail.magicLink || extractMagicLink(chosen.raw)

              console.log('\n[+] DETAIL PESAN:')
              console.log(`Subjek : ${detail.subject}`)
              console.log(`Dari   : ${detail.from}`)

              if (foundLink) {
                console.log(`\n🔗 LINK VERIFIKASI TERDETEKSI:\n${foundLink}`)
                const autoV = (await ask('\n[?] Langsung verifikasi link ini sekarang? (y/n) [Enter = y]: ')).trim().toLowerCase()
                if (autoV === '' || autoV === 'y' || autoV === 'yes') {
                  const confirmMail = (await ask(`[?] Konfirmasi Email/Gmail [Enter = ${email}]: `)).trim() || email
                  console.log(`\n[*] Memproses /api/verify-link untuk ${confirmMail}...`)
                  const vRes = await verifyAmLink(foundLink, confirmMail)
                  console.log('\n[+] HASIL VERIFIKASI:')
                  console.log(JSON.stringify(vRes, null, 2))
                  await refreshStatsAndDomains()
                }
              } else {
                console.log('\n[-] Link verifikasi tidak ditemukan di isi pesan.')
              }
            }
          }
        } catch (err) {
          console.error(`\n[-] Error: ${formatNetError(err)}`)
        }
      }
      await pause()
    } else if (choice === '5') {
      const mailPrompt = state.activeEmail
        ? `\n[?] Konfirmasi Email/Gmail penerima link [Enter = ${state.activeEmail}]: `
        : '\n[?] Konfirmasi Email/Gmail penerima link: '
      const confirmMail = (await ask(mailPrompt)).trim() || state.activeEmail
      const link = (await ask('[?] Paste Link Verifikasi (https://alight-creative.firebaseapp.com/...): ')).trim()

      if (!confirmMail || !confirmMail.includes('@')) {
        console.log('[-] Email/Gmail tidak valid!')
      } else if (!link || !link.startsWith('http')) {
        console.log('[-] Link tidak valid!')
      } else {
        try {
          state.activeEmail = confirmMail
          console.log(`\n[*] Memverifikasi tautan untuk ${confirmMail}...`)
          const res = await verifyAmLink(link, confirmMail)
          console.log('\n[+] HASIL VERIFIKASI:')
          console.log(JSON.stringify(res, null, 2))
          await refreshStatsAndDomains()
        } catch (err) {
          console.error(`\n[-] Error: ${formatNetError(err)}`)
        }
      }
      await pause()
    } else if (choice === '6') {
      console.log('\n[*] Mengambil statistik & domain terbaru...')
      await refreshStatsAndDomains()
      console.log('\n[+] STATISTIK:', JSON.stringify(state.stats, null, 2))
      console.log('[+] DOMAINS  :', state.domains.join(', '))
      await pause()
    } else if (choice === '7') {
      try {
        console.log('\n[*] Memindai blok /api/verify-link dari abeecloud.vercel.app...')
        state.verifyKeys = null
        const keys = await detectVerifyPayloadKeys()
        console.log('[+] Detected JSON Keys:', keys.length ? keys.join(', ') : 'Tidak terdeteksi (pakai multi-alias)')
      } catch (err) {
        console.error(`\n[-] Error Scan: ${formatNetError(err)}`)
      }
      await pause()
    } else if (choice === '0') {
      console.log('\nKeluar dari program.')
      rl.close()
      process.exit(0)
    } else {
      console.log('\n[-] Pilihan tidak valid!')
      await pause()
    }
  }
}

menu()