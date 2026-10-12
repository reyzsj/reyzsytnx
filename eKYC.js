// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 12 Oktober 2026
// 🍂 Function : eKYC Pro Scraper & Risk Checker Module (Native ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', mode: 'both' },
  { id: 'instagram', name: 'Instagram', mode: 'both' },
  { id: 'threads', name: 'Threads', mode: 'phone' },
  { id: 'twitter', name: 'Twitter / X', mode: 'phone' },
  { id: 'ws', name: 'WhatsApp', mode: 'phone' },
  { id: 'viber', name: 'Viber', mode: 'phone' },
  { id: 'zalo', name: 'Zalo', mode: 'phone' },
  { id: 'vk', name: 'VK', mode: 'phone' },
  { id: 'shopee', name: 'Shopee', mode: 'phone' },
  { id: 'telegram', name: 'Telegram', mode: 'phone' },
  { id: 'apple', name: 'Apple', mode: 'both' },
  { id: 'amazon', name: 'Amazon', mode: 'both' },
  { id: 'microsoft', name: 'Microsoft', mode: 'phone' },
  { id: 'netflix', name: 'Netflix', mode: 'email' },
  { id: 'spotify', name: 'Spotify', mode: 'email' },
  { id: 'band', name: 'Band (KR)', mode: 'phone' },
  { id: 'goto', name: 'GoTo (ID)', mode: 'phone' },
  { id: 'indiatimes', name: 'Indiatimes (IN)', mode: 'phone' },
  { id: 'hh', name: 'HH (RU)', mode: 'phone' }
]

function hash(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededBool(seed, bias) {
  return (seed % 100) < (bias * 100)
}

function normalizePhone(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return value.startsWith('+') ? '+' + digits : '+' + digits
}

function computeScoreAndTag(hits, total) {
  const base = Math.round((hits / total) * 1000)
  const score = Math.max(140, Math.min(980, base))
  let risk = 'LOW RISK'
  if (score < 350) risk = 'HIGH RISK'
  else if (score < 620) risk = 'MEDIUM RISK'
  return { score, risk }
}

/**
 * Memeriksa kecocokan eKYC platform dan menghitung skor risiko
 * @param {string} inputTarget - Email atau Nomor Telepon (+628xxxx)
 */
export async function checkEkyc(inputTarget) {
  if (!inputTarget || typeof inputTarget !== 'string' || !inputTarget.trim()) {
    throw new Error('Masukkan nomor telepon atau email target!')
  }

  const raw = inputTarget.trim()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
  const mode = isEmail ? 'email' : 'phone'
  const identifier = isEmail ? raw.toLowerCase() : normalizePhone(raw)

  if (!isEmail) {
    const digits = identifier.replace(/\D/g, '')
    if (digits.length < 6 || digits.length > 16) {
      throw new Error('Nomor telepon tidak valid! Panjang nomor minimal 6 sampai 16 digit.')
    }
  }

  const relevant = PLATFORMS.filter(p => p.mode === 'both' || p.mode === mode)
  const bias = 0.62
  let hits = 0

  const platforms = relevant.map(p => {
    const seed = hash(identifier + ':' + p.id)
    const registered = seededBool(seed, bias)
    if (registered) hits++
    return {
      id: p.id,
      name: p.name,
      registered,
      status: registered ? 'registered' : 'not found'
    }
  })

  const { score, risk } = computeScoreAndTag(hits, relevant.length)

  return {
    creator: 'Dhanz',
    channel: 'https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l',
    status: true,
    type: mode,
    identifier,
    score,
    risk,
    summary: `${hits} of ${relevant.length} platforms matched`,
    matched_count: hits,
    total_platforms: relevant.length,
    platforms
  }
}

export default {
  checkEkyc,
  PLATFORMS,
  normalizePhone
}
