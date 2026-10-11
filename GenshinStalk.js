// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Genshin Impact Stalker Plugin (Native Fetch / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const TIMEOUT = 15_000

let handler = async (m, { conn, sock, text, usedPrefix, command, reply }) => {
  const client = conn || sock
  const doReply = typeof reply === 'function' ? reply : typeof m.reply === 'function' ? m.reply.bind(m) : (txt) => client.sendMessage(m.chat, { text: txt }, { quoted: m })

  if (!text) return doReply(`🔍 *Format:* ${usedPrefix + command} <UID>\n*Contoh:* ${usedPrefix + command} 800000000`)

  try {
    if (typeof global.react === 'function') await global.react(client, m, 'loading')

    const apiUrl = typeof global.API === 'function' 
      ? global.API('kyzz', '/api/stalker/gensin', { uid: text.trim() }, 'apikey')
      : `https://api.kyzz.my.id/api/stalker/gensin?uid=${encodeURIComponent(text.trim())}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    })
    clearTimeout(timer)

    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.status || !data?.playerData) {
      return doReply(`❌ Player Genshin dengan UID "${text}" tidak ditemukan.`)
    }

    const p = data.playerData
    let cap = `⚔️ *GENSHIN IMPACT STALKER*\n\n`
    cap += `• *UID:* ${data.uid || text}\n`
    cap += `• *Nickname:* ${p.username || '-'}\n`
    cap += `• *Level:* ${p.level ?? '-'}\n`
    cap += `• *World Level:* ${p.worldLevel ?? '-'}\n`
    cap += `• *Signature:* ${p.signature || '-'}\n`
    cap += `• *Achievements:* ${p.finishAchievementNum ?? '-'}\n`
    cap += `• *Abyss Floor:* ${p.towerFloorIndex ? `${p.towerFloorIndex}-${p.towerLevelIndex}` : '-'}\n`

    if (p.avatar) {
      await client.sendMessage(m.chat, { image: { url: p.avatar }, caption: cap.trim() }, { quoted: m })
    } else {
      await doReply(cap.trim())
    }

    if (typeof global.react === 'function') await global.react(client, m, 'success')
  } catch (e) {
    console.error('[STALK-GENSHIN]', e)
    if (typeof global.react === 'function') await global.react(client, m, 'error')
    doReply(`❌ Gagal stalk Genshin: ${e.message}`)
  }
}

handler.help = ['stalkgenshin <uid>']
handler.tags = ['stalker']
handler.command = /^(stalkgenshin|genshinstalk|stalkgi)$/i
handler.limit = true
handler.register = true

export default handler
