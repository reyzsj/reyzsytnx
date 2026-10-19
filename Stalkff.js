// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 19 Oktober 2026
// 🍂 Function : FF Player Info Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mengembalikan objek berisi summary (ringkasan) dan raw_data (JSON asli).
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const API_URL = 'https://adenpedia.my.id/update01/info.php'
const TIMEOUT = 30_000

function formatEpoch(epoch) {
  if (!epoch) return '-'
  const d = new Date(epoch * 1000)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} WIB - ${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Mengambil informasi detail player Free Fire berdasarkan UID
 * @param {string|number} uid - UID Free Fire Target
 */
export async function getPlayerInfo(uid) {
  if (!uid || String(uid).trim() === '') throw new Error('UID tidak boleh kosong!')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(`${API_URL}?uid=${String(uid).trim()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    })

    const rawData = await res.text()
    let data = null; try { data = JSON.parse(rawData) } catch (_) {}
    
    if (!res.ok) throw new Error(`API Error: HTTP ${res.status}`)
    if (!data || !data.basicInfo) throw new Error('Data player tidak valid atau gagal ditarik.')

    const b = data.basicInfo
    const c = data.clanBasicInfo
    const s = data.socialInfo
    const cs = data.creditScoreInfo

    const roleMap = { 4: 'GameMaster', 1: 'Player', 2: 'Streamer' }

    return {
      status: true,
      summary: {
        Nickname: b.nickname || '-',
        UID: uid,
        Status: roleMap[b.role] || 'Player',
        Level: b.level || 0,
        Prime_Level: b.primeInfo?.primeLevel || 0,
        Total_Likes: (b.liked || 0).toLocaleString('id-ID'),
        Server: b.region || '-',
        BR_Ranking: `${(b.rankingPoints || 0).toLocaleString('id-ID')} pts`,
        CS_Ranking: `${b.csRankingPoints || 0} pts`,
        Booyah_Pass: b.hasElitePass ? 'Aktif' : 'Tidak Aktif',
        Credit_Score: cs?.creditScore || 0,
        Clan_Name: c?.clanName ? `${c.clanName} (Lv.${c.clanLevel})` : 'Tidak Punya Guild',
        Signature: s?.signature || '-',
        Created_At: formatEpoch(b.createAt),
        Last_Login: formatEpoch(b.lastLoginAt)
      },
      raw_data: data
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  getPlayerInfo
}
