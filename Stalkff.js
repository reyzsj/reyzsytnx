// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 15 November 2026
// 🍂 Function : FF Player Info & Stalk Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mengembalikan objek berisi summary (ringkasan lengkap) dan raw_data (JSON asli).
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const API_URL = 'https://adenpedia.my.id/update01/info.php'
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': 'https://adenpedia.my.id',
  'Referer': 'https://adenpedia.my.id/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('id-ID')
}

function formatEpoch(epoch) {
  if (!epoch) return '-'
  const d = new Date(epoch * 1000)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')} WIB - ${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function getBrRank(points) {
  const tiers = [
    [1000, 'Bronze I'], [1100, 'Bronze II'], [1200, 'Bronze III'],
    [1310, 'Silver I'], [1410, 'Silver II'], [1600, 'Silver III'],
    [1610, 'Gold I'], [1735, 'Gold II'], [1860, 'Gold III'], [1985, 'Gold IV'],
    [2110, 'Platinum I'], [2235, 'Platinum II'], [2360, 'Platinum III'],
    [2485, 'Platinum IV'], [2610, 'Platinum V'],
    [2760, 'Diamond I'], [2910, 'Diamond II'], [3060, 'Diamond III'],
    [3210, 'Diamond IV'], [3350, 'Diamond V'],
    [3500, 'Heroic I'], [4100, 'Heroic II'], [4300, 'Heroic III'],
    [4900, 'Heroic IV'], [5500, 'Heroic V'], [6300, 'Master I'],
    [7100, 'Master II'], [8000, 'Master III'], [9000, 'Master IV'], [10000, 'Master V'],
  ]
  let result = 'Unranked'
  for (const [minimum, name] of tiers) {
    if (points < minimum) break
    result = name
  }
  return result
}

function getCsRank(rankId, points) {
  if (rankId >= 320 || points >= 87) {
    const stars = Math.max(0, points - 90)
    if (stars >= 100) return `Elite Master (${stars} bintang)`
    if (stars >= 50) return `Master (${stars} bintang)`
    if (stars >= 24) return `Elite Heroic (${stars} bintang)`
    return `Heroic (${stars} bintang)`
  }
  if (points <= 0) return 'Bronze'
  if (points < 9) return `Bronze (${points} bintang)`
  if (points < 21) return `Silver (${points} bintang)`
  if (points < 37) return `Gold (${points} bintang)`
  if (points < 62) return `Platinum (${points} bintang)`
  return `Diamond (${points} bintang)`
}

function estimateTopUp(basic) {
  const primeLevel = Number(basic.primeInfo?.primeLevel || 0)
  const baseByPrime = {
    1: 12800, 2: 128000, 3: 384000, 4: 1280000,
    5: 3840000, 6: 7680000, 7: 15360000,
  }
  const extras = Number(basic.liked || 0) * 12 + Number(basic.level || 0) * 8500

  if (primeLevel >= 8) {
    return {
      minimum: Math.floor((25600000 + extras) / 1000) * 1000,
      maximum: Math.floor((51600000 + extras) / 1000) * 1000,
      note: 'Kisaran estimasi; nilai acak/cache untuk Prime 8 ke atas.',
    }
  }

  const amount = Math.floor(((baseByPrime[primeLevel] || 50000) + extras) / 1000) * 1000
  return { minimum: amount, maximum: amount, note: 'Estimasi sistem, bukan riwayat transaksi resmi.' }
}

/**
 * Mengambil informasi detail player Free Fire berdasarkan UID
 * @param {string|number} uid - UID Free Fire Target (8-11 digit)
 */
export async function getPlayerInfo(uid) {
  const cleanUid = String(uid || '').trim()
  if (!cleanUid) throw new Error('UID tidak boleh kosong!')
  if (!/^\d{8,11}$/.test(cleanUid)) throw new Error('UID harus berupa 8-11 digit angka!')

  const url = new URL(API_URL)
  url.searchParams.set('uid', cleanUid)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: controller.signal
    })

    const rawData = await res.text()
    let data = null
    try { data = JSON.parse(rawData) } catch (_) {}

    if (!res.ok) throw new Error(`API Error: HTTP ${res.status}`)
    if (!data || data.error) throw new Error(data?.error || 'Data player tidak valid atau gagal ditarik.')

    const b = data.basicInfo || {}
    if (!b.nickname) throw new Error('Profil tidak ditemukan atau data profil kosong.')

    const c = data.clanBasicInfo
    const s = data.socialInfo
    const cs = data.creditScoreInfo

    const pointsBr = Number(b.rankingPoints || 0)
    const pointsCs = Number(b.csRankingPoints || 0)
    const primeLevel = Number(b.primeInfo?.primeLevel || 0)
    const topUp = estimateTopUp(b)

    const roleMap = { 4: 'GameMaster', 1: 'Player', 2: 'Streamer' }
    const regionNames = { ID: 'Indonesia', SG: 'Singapore', TH: 'Thailand', VN: 'Vietnam', BR: 'Brazil', IND: 'India' }

    const estimatedTopUpIDR = topUp.minimum === topUp.maximum
      ? `Rp ${formatNumber(topUp.minimum)}`
      : `Rp ${formatNumber(topUp.minimum)} – Rp ${formatNumber(topUp.maximum)}`

    return {
      status: true,
      summary: {
        Nickname: b.nickname || '-',
        UID: cleanUid,
        Status: roleMap[b.role] || 'Player',
        Level: Number(b.level || 0),
        Prime_Level: primeLevel,
        Total_Likes: formatNumber(b.liked || 0),
        Server: `${regionNames[b.region] || b.region || 'Tidak diketahui'} (${b.region || '?'})`,
        BR_Ranking: `${getBrRank(pointsBr)} (${formatNumber(pointsBr)} pts)`,
        CS_Ranking: `${getCsRank(Number(b.csRank || 0), pointsCs)} (${formatNumber(pointsCs)} pts)`,
        Booyah_Pass: b.hasElitePass === true ? 'Aktif' : 'Tidak Aktif',
        Credit_Score: cs?.creditScore || 0,
        Estimated_TopUp: estimatedTopUpIDR,
        TopUp_Note: topUp.note,
        Clan_Name: c?.clanName ? `${c.clanName} (Lv.${c.clanLevel})` : 'Tidak Punya Guild',
        Signature: s?.signature || b.signature || '-',
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
