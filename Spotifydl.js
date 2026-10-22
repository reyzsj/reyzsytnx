// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 22 Oktober 2026
// 🍂 Function : SpotSaver Spotify Downloader Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const SEARCH_URL = 'https://spotsaver.net/api/spotify/'
const DOWNLOAD_URL = 'https://spotsaver.net/api/download/'
const TIMEOUT = 30_000

async function getYouTubeVideoId(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    })
    const html = await res.text()
    const match = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/)
    return match ? match[1] : null
  } catch (_) {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mengekstrak metadata dan link unduhan MP3 dari Spotify via SpotSaver API
 * @param {string} spotifyUrl - URL Lagu Spotify valid
 */
export async function requestApi(spotifyUrl) {
  if (!spotifyUrl || typeof spotifyUrl !== 'string' || !spotifyUrl.trim()) {
    throw new Error('URL Spotify tidak boleh kosong!')
  }

  const cleanUrl = spotifyUrl.trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Referer': 'https://spotsaver.net/',
      'Origin': 'https://spotsaver.net'
    }

    const searchRes = await fetch(`${SEARCH_URL}?url=${encodeURIComponent(cleanUrl)}`, {
      method: 'GET',
      headers,
      signal: controller.signal
    })

    const rawSearch = await searchRes.text()
    let searchData = null; try { searchData = JSON.parse(rawSearch) } catch (_) {}

    if (!searchRes.ok) throw new Error(`API Search Error: HTTP ${searchRes.status}`)
    if (!searchData || !searchData.items || searchData.items.length === 0) {
      throw new Error('Lagu tidak ditemukan.')
    }

    const track = searchData.items[0]
    const fullTitle = `${track.title} - ${track.artist}`

    let videoId = track.videoId
    if (!videoId) {
      videoId = await getYouTubeVideoId(fullTitle)
    }

    if (!videoId) throw new Error('Gagal melacak YouTube Video ID.')

    const dlRes = await fetch(DOWNLOAD_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        videoId: videoId,
        candidateIds: track.candidateIds || [],
        format: 'mp3',
        title: fullTitle,
        licenseKey: null
      }),
      signal: controller.signal
    })

    const rawDl = await dlRes.text()
    let dlData = null; try { dlData = JSON.parse(rawDl) } catch (_) {}

    if (!dlRes.ok) throw new Error(`API Download Error: HTTP ${dlRes.status}`)

    return {
      status: true,
      metadata: {
        title: track.title,
        artist: track.artist,
        album: track.album || '-',
        duration: track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : '-',
        thumbnail: track.thumbnail,
        previewUrl: track.previewUrl,
        videoId: videoId
      },
      download: dlData
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  requestApi
}
