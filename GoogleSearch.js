// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 1 November 2026
// 🍂 Function : Google Search & Direct Answer Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const GOOGLE_SEARCH_URL = 'https://www.google.com/search'
const GOOGLE_COMPLETE_URL = 'https://www.google.com/complete/search'
const FALLBACK_SEARCH_URL = 'https://html.duckduckgo.com/html/'
const TIMEOUT = 30_000

const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Cookie': 'CONSENT=YES+cb.20240116-07-p0.id+FX+999;',
  'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
}

function decodeHtml(str = '') {
  return String(str)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tryEvaluateMath(query) {
  let cleaned = query
    .toLowerCase()
    .replace(/\b(berapa|brp|hasil|dari|hitung|sama dengan)\b/g, '')
    .replace(/[?=]/g, '')
    .replace(/\b(kali|dikali)\b/g, '*')
    .replace(/[x×]/g, '*')
    .replace(/\b(bagi|dibagi)\b/g, '/')
    .replace(/[:÷]/g, '/')
    .replace(/\b(tambah|ditambah)\b/g, '+')
    .replace(/\b(kurang|dikurang)\b/g, '-')
    .trim()

  if (!/^[\d\s.+\-*/()]+$/.test(cleaned) || !/[+\-*/]/.test(cleaned)) {
    return null
  }

  try {
    const val = Function(`"use strict"; return (${cleaned})`)()
    if (typeof val === 'number' && Number.isFinite(val)) {
      return `${cleaned.replace(/\*/g, '×').replace(/\//g, '÷')} = ${val}`
    }
  } catch (_) {}
  return null
}

async function fetchGoogleInstantAnswer(query, signal) {
  try {
    const ep = new URL(GOOGLE_COMPLETE_URL)
    ep.searchParams.set('client', 'chrome')
    ep.searchParams.set('hl', 'id')
    ep.searchParams.set('gl', 'id')
    ep.searchParams.set('q', query)

    const res = await fetch(ep.toString(), {
      method: 'GET',
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      signal
    })

    if (!res.ok) return null
    const data = await res.json()
    const suggestions = Array.isArray(data?.[1]) ? data[1] : []
    const types = data?.[4]?.['google:suggesttype'] || []

    for (let i = 0; i < suggestions.length; i++) {
      if (types[i] === 'CALCULATOR' || String(suggestions[i]).startsWith('=')) {
        return String(suggestions[i]).replace(/^=\s*/, '')
      }
    }
    return null
  } catch (_) {
    return null
  }
}

function parseGoogleHtml(html) {
  let directAnswer = null
  const results = []

  const answerPatterns = [
    /<span[^>]*class=["'][^"']*qv3Wpe[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*class=["'][^"']*IZ6rdc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*class=["'][^"']*hgKElc[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*data-attrid=["']wa:\/description["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*BNeawe iBp4i AP7Wnd[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ]

  for (const regex of answerPatterns) {
    const match = html.match(regex)
    if (match && match[1]) {
      const cleaned = decodeHtml(match[1])
      if (cleaned) {
        directAnswer = cleaned
        break
      }
    }
  }

  const blockRegex = /<div class="yuRUbf">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/div>(?:[\s\S]*?<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>)?/gi
  let match
  while ((match = blockRegex.exec(html)) !== null) {
    const url = match[1]
    const title = decodeHtml(match[2])
    const snippet = match[3] ? decodeHtml(match[3]) : ''
    if (url.startsWith('http') && title) {
      results.push({ title, url, snippet })
    }
  }

  if (results.length === 0) {
    const altRegex = /<a[^>]+href=["']\/url\?q=([^"&]+)&amp;[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
    while ((match = altRegex.exec(html)) !== null) {
      const rawUrl = decodeURIComponent(match[1])
      if (!rawUrl.startsWith('http') || rawUrl.includes('google.com')) continue
      const title = decodeHtml(match[2])
      if (!title) continue
      results.push({ title, url: rawUrl, snippet: '' })
    }
  }

  return { directAnswer, results }
}

async function fetchFallbackSearch(query, signal) {
  const results = []
  const body = new URLSearchParams({ q: query, kl: 'id-id' })

  const res = await fetch(FALLBACK_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': BROWSER_HEADERS['User-Agent']
    },
    body: body.toString(),
    signal
  })

  if (!res.ok) return results
  const html = await res.text()

  const itemRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = itemRegex.exec(html)) !== null) {
    let rawUrl = match[1]
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/)
    if (uddgMatch) rawUrl = decodeURIComponent(uddgMatch[1])

    results.push({
      title: decodeHtml(match[2]),
      url: rawUrl,
      snippet: decodeHtml(match[3])
    })
  }

  return results
}

/**
 * Mencari kueri di Google dan mengembalikan objek { answer, search }
 * @param {string} query - Kata kunci atau pertanyaan pencarian
 */
export async function googleSearchAnswer(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query pencarian tidak boleh kosong!')
  }

  const cleanQuery = query.trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const mathAnswer = tryEvaluateMath(cleanQuery)
    const instantAnswer = await fetchGoogleInstantAnswer(cleanQuery, controller.signal)

    let htmlAnswer = null
    let searchResults = []

    const endpoint = new URL(GOOGLE_SEARCH_URL)
    endpoint.searchParams.set('q', cleanQuery)
    endpoint.searchParams.set('hl', 'id')
    endpoint.searchParams.set('gl', 'id')
    endpoint.searchParams.set('ie', 'UTF-8')

    const res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: controller.signal
    })

    if (res.ok) {
      const rawHtml = await res.text()
      const parsed = parseGoogleHtml(rawHtml)
      htmlAnswer = parsed.directAnswer
      searchResults = parsed.results
    }

    if (searchResults.length === 0) {
      searchResults = await fetchFallbackSearch(cleanQuery, controller.signal)
    }

    const finalAnswer =
      mathAnswer ||
      instantAnswer ||
      htmlAnswer ||
      (searchResults.length > 0 && searchResults[0].snippet ? searchResults[0].snippet : 'Jawaban langsung tidak ditemukan.')

    return {
      status: true,
      query: cleanQuery,
      answer: finalAnswer,
      search: searchResults
    }
  } finally {
    clearTimeout(timer)
  }
}

export default {
  googleSearchAnswer
}
