// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : AMFinder Alight Motion Preset Finder Module (Native Fetch)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

const HOST = 'https://amfinder.web.id'
const TIMEOUT = 180_000
const RETRIES = 2

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

function parseBlock(block, onLog) {
  const ev = /(?:^|\n)event:[ \t]*(.+)/.exec(block)
  const data = /(?:^|\n)data:[ \t]?([\s\S]*)/.exec(block)?.[1]
  if (!ev) return null

  const name = ev[1].trim()
  if (name === 'log') {
    let msg = data ?? ''
    try { msg = JSON.parse(data) } catch (_) {}
    onLog?.(msg)
    return null
  }
  if (name === 'result') return JSON.parse(data)
  if (name === 'error') {
    let m = data ?? 'unknown error'
    try { m = JSON.parse(data).message || m } catch (_) {}
    throw new Error(m)
  }
  return null
}

/**
 * Cari preset Alight Motion dari URL TikTok
 * @param {string} videoUrl - Link TikTok target
 * @param {Function} [onLog] - Callback opsional untuk melihat real-time log dari SSE server
 */
export async function findPreset(videoUrl, onLog = null) {
  const targetUrl = String(videoUrl || '').trim()
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    throw new Error('URL TikTok tidak valid!')
  }

  const endpoint = `${HOST}/api/find?url=${encodeURIComponent(targetUrl)}&bat=NaN&chg=0`

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'accept': 'text/event-stream',
          'user-agent': USER_AGENTS[attempt % USER_AGENTS.length],
          'referer': `${HOST}/`
        }
      })

      if (res.status !== 200) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }

      const decoder = new TextDecoder()
      let buf = ''
      let result = null

      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const r = parseBlock(buf.slice(0, idx), onLog)
          if (r) result = r
          buf = buf.slice(idx + 2)
        }
      }

      const lastBlock = parseBlock(buf, () => {})
      if (lastBlock) result = lastBlock

      clearTimeout(timer)

      if (!result) throw new Error('Koneksi ditutup server sebelum menerima result.')
      if (result.ok === false) throw new Error(result.error || 'Server error')

      return result
    } catch (err) {
      clearTimeout(timer)
      if (attempt < RETRIES && err.name !== 'AbortError') {
        onLog?.(`[*] Retry (${attempt + 1}/${RETRIES}) karena error: ${err.message}`)
        continue
      }
      throw err
    }
  }
}

export default {
  findPreset
}
