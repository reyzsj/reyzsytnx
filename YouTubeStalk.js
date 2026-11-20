// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 20 November 2026
// 🍂 Function : YouTube Channel Stalker Base Module Fix (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Native Fetch (Zero Dependency, Node.js v18+).
// Valid Base64 Params + selectedTab Lock + lockupViewModel + UULF/UUSH & RSS Fallback.
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first')
}
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

const YT_BASE = 'https://www.youtube.com'
const TIMEOUT = 25_000

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const YT_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20250101.00.00',
    hl: 'id',
    gl: 'ID'
  }
}

const YT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': YT_BASE,
  'Referer': `${YT_BASE}/`,
  'Cookie': 'SOCS=CAI',
  'User-Agent': DESKTOP_UA
}

function decodeXml(str = '') {
  return String(str)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim()
}

function readText(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj.trim()
  if (typeof obj.content === 'string') return obj.content.trim()
  if (typeof obj.simpleText === 'string') return obj.simpleText.trim()
  if (Array.isArray(obj.runs)) return obj.runs.map((r) => r.text || '').join('').trim()
  return ''
}

function pickBestThumb(thumbs) {
  const list = Array.isArray(thumbs) ? thumbs : (thumbs?.thumbnails || thumbs?.sources || [])
  if (!Array.isArray(list) || list.length === 0) return ''
  const last = list[list.length - 1]?.url || ''
  return last.startsWith('//') ? `https:${last}` : last
}

async function ytPost(pathEndpoint, body) {
  const res = await fetch(`${YT_BASE}/youtubei/v1/${pathEndpoint}?prettyPrint=false`, {
    method: 'POST',
    headers: YT_HEADERS,
    body: JSON.stringify({ context: YT_CONTEXT, ...body }),
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`API Error HTTP ${res.status}`)
  return res.json()
}

function findObjectsByKey(node, targetKey, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) findObjectsByKey(item, targetKey, out)
    return out
  }
  if (targetKey in node && node[targetKey] && typeof node[targetKey] === 'object') {
    out.push(node[targetKey])
  }
  for (const val of Object.values(node)) {
    if (val && typeof val === 'object') findObjectsByKey(val, targetKey, out)
  }
  return out
}

function extractRealExternalUrl(rawUrl = '') {
  try {
    const u = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl)
    if (u.hostname.includes('youtube.com') && u.pathname === '/redirect') {
      return u.searchParams.get('q') || rawUrl
    }
    return u.href
  } catch (_) {
    return rawUrl.startsWith('http') ? rawUrl : (rawUrl ? `https://${rawUrl}` : '')
  }
}

function getSelectedTab(browseData) {
  const tabs = browseData?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
  return tabs.find((t) => t?.tabRenderer?.selected)?.tabRenderer || null
}

function extractTabParams(homeData) {
  const tabs = homeData?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
  const found = {
    videos: { exists: false, params: 'EgZ2aWRlb3M=' },
    shorts: { exists: false, params: 'EgZzaG9ydHM=' },
    channels: { exists: false, params: 'EghjaGFubmVscw==' }
  }

  for (const t of tabs) {
    const tr = t?.tabRenderer
    if (!tr) continue
    const ep = tr.endpoint?.browseEndpoint
    const urlPath = ep?.canonicalBaseUrl || tr.endpoint?.commandMetadata?.webCommandMetadata?.url || ''
    const title = readText(tr.title).toLowerCase()

    if (/\/videos(?:\?|$)/i.test(urlPath) || title === 'videos' || title === 'video') {
      found.videos = { exists: true, params: ep?.params || 'EgZ2aWRlb3M=' }
    } else if (/\/shorts(?:\?|$)/i.test(urlPath) || title === 'shorts') {
      found.shorts = { exists: true, params: ep?.params || 'EgZzaG9ydHM=' }
    } else if (/\/channels(?:\?|$)/i.test(urlPath) || title === 'channels' || title === 'channel') {
      found.channels = { exists: true, params: ep?.params || 'EghjaGFubmVscw==' }
    }
  }
  return found
}

/**
 * Mengubah @username, nama channel, atau link channel menjadi Channel ID (UC...)
 * @param {string} input
 */
export async function resolveChannelId(input) {
  const raw = String(input || '').trim()
  if (!raw) throw new Error('Username, @handle, atau URL channel YouTube wajib diisi!')
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(raw)) return raw

  let candidateUrl = raw
  if (!/^https?:\/\//i.test(raw)) {
    if (/youtube\.com\//i.test(raw)) {
      candidateUrl = `https://${raw.replace(/^\/+/, '')}`
    } else {
      const handle = raw.startsWith('@') ? raw : `@${raw.replace(/\s+/g, '')}`
      candidateUrl = `${YT_BASE}/${handle}`
    }
  } else {
    candidateUrl = raw.replace(/^https?:\/\/m\.youtube\.com/i, YT_BASE)
  }

  const directMatch = candidateUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/)
  if (directMatch?.[1]) return directMatch[1]

  try {
    const resolved = await ytPost('navigation/resolve_url', { url: candidateUrl })
    const bid = resolved?.endpoint?.browseEndpoint?.browseId
    if (bid && bid.startsWith('UC')) return bid
  } catch (_) {}

  try {
    const res = await fetch(candidateUrl, {
      headers: { 'User-Agent': DESKTOP_UA, 'Cookie': 'SOCS=CAI', 'Accept-Language': 'id-ID,id;q=0.9' },
      signal: AbortSignal.timeout(15_000)
    })
    if (res.ok) {
      const html = await res.text()
      const m =
        html.match(/"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/) ||
        html.match(/"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/)
      if (m?.[1]) return m[1]
    }
  } catch (_) {}

  const query = raw.replace(/^https?:\/\/[^/]+\/?/i, '').replace(/^@/, '')
  const searchData = await ytPost('search', { query, params: 'EgIQAg==' })
  const channels = findObjectsByKey(searchData, 'channelRenderer')
  if (channels.length > 0 && channels[0].channelId) return channels[0].channelId

  throw new Error(`Channel YouTube "${raw}" tidak ditemukan!`)
}
function parseVideosFromNode(rootNode, limit = 15) {
  if (!rootNode) return []
  const results = []
  const seen = new Set()

  const classicList = [
    ...findObjectsByKey(rootNode, 'videoRenderer'),
    ...findObjectsByKey(rootNode, 'gridVideoRenderer')
  ]
  for (const v of classicList) {
    if (!v.videoId || seen.has(v.videoId)) continue
    seen.add(v.videoId)
    results.push({
      videoId: v.videoId,
      title: readText(v.title) || `Video ${v.videoId}`,
      views: readText(v.viewCountText) || readText(v.shortViewCountText) || '-',
      published: readText(v.publishedTimeText) || '-',
      duration: readText(v.lengthText) || 'LIVE',
      url: `${YT_BASE}/watch?v=${v.videoId}`,
      thumbnail: pickBestThumb(v.thumbnail) || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  for (const pv of findObjectsByKey(rootNode, 'playlistVideoRenderer')) {
    if (!pv.videoId || seen.has(pv.videoId)) continue
    seen.add(pv.videoId)
    const infoParts = Array.isArray(pv.videoInfo?.runs)
      ? pv.videoInfo.runs.map((r) => r.text.trim()).filter((t) => t && t !== '•')
      : []
    results.push({
      videoId: pv.videoId,
      title: readText(pv.title) || `Video ${pv.videoId}`,
      views: infoParts[0] || '-',
      published: infoParts[1] || '-',
      duration: readText(pv.lengthText) || '-',
      url: `${YT_BASE}/watch?v=${pv.videoId}`,
      thumbnail: pickBestThumb(pv.thumbnail) || `https://i.ytimg.com/vi/${pv.videoId}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  for (const lv of findObjectsByKey(rootNode, 'lockupViewModel')) {
    const vid = lv.contentId
    if (!vid || !/^[a-zA-Z0-9_-]{11}$/.test(vid) || seen.has(vid)) continue
    if (lv.contentType && lv.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue
    seen.add(vid)

    const metaVm = lv.metadata?.lockupMetadataViewModel
    const title = readText(metaVm?.title) || `Video ${vid}`
    const rows = metaVm?.metadata?.contentMetadataViewModel?.metadataRows || []
    const texts = []
    for (const row of rows) {
      for (const part of (row.metadataParts || [])) {
        const t = readText(part.text)
        if (t) texts.push(t)
      }
    }
    const views = texts.find((t) => /ditonton|view/i.test(t)) || '-'
    const published = texts.find((t) => /lalu|ago|streamed/i.test(t)) || '-'
    const badges = findObjectsByKey(lv.contentImage, 'thumbnailBadgeViewModel')
    const duration = badges.find((b) => /\d+:\d+/.test(b.text || ''))?.text || '-'

    results.push({
      videoId: vid,
      title,
      views,
      published,
      duration,
      url: `${YT_BASE}/watch?v=${vid}`,
      thumbnail: pickBestThumb(lv.contentImage?.thumbnailViewModel?.image) || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  return results
}

function parseShortsFromNode(rootNode, limit = 10) {
  if (!rootNode) return []
  const results = []
  const seen = new Set()

  for (const s of findObjectsByKey(rootNode, 'shortsLockupViewModel')) {
    const vid =
      s?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
      s?.entityId?.match(/([a-zA-Z0-9_-]{11})$/)?.[1]
    if (!vid || seen.has(vid)) continue
    seen.add(vid)
    results.push({
      videoId: vid,
      title: readText(s?.overlayMetadata?.primaryText) || s?.accessibilityText || `Short ${vid}`,
      views: readText(s?.overlayMetadata?.secondaryText) || '-',
      url: `${YT_BASE}/shorts/${vid}`,
      thumbnail: pickBestThumb(s?.thumbnail) || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  for (const r of findObjectsByKey(rootNode, 'reelItemRenderer')) {
    if (!r.videoId || seen.has(r.videoId)) continue
    seen.add(r.videoId)
    results.push({
      videoId: r.videoId,
      title: readText(r.headline) || `Short ${r.videoId}`,
      views: readText(r.viewCountText) || '-',
      url: `${YT_BASE}/shorts/${r.videoId}`,
      thumbnail: pickBestThumb(r.thumbnail) || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  for (const pv of findObjectsByKey(rootNode, 'playlistVideoRenderer')) {
    if (!pv.videoId || seen.has(pv.videoId)) continue
    seen.add(pv.videoId)
    results.push({
      videoId: pv.videoId,
      title: readText(pv.title) || `Short ${pv.videoId}`,
      views: pv.videoInfo?.runs?.[0]?.text || '-',
      url: `${YT_BASE}/shorts/${pv.videoId}`,
      thumbnail: pickBestThumb(pv.thumbnail) || `https://i.ytimg.com/vi/${pv.videoId}/hqdefault.jpg`
    })
    if (results.length >= limit) return results
  }

  return results
}

async function fetchChannelPlaylist(playlistId, type = 'video', limit = 15) {
  try {
    const data = await ytPost('browse', { browseId: `VL${playlistId}` })
    return type === 'short'
      ? parseShortsFromNode(data, limit)
      : parseVideosFromNode(data, limit)
  } catch (_) {
    return []
  }
}

async function fetchRssUploads(channelId, excludeIds = new Set(), limit = 15) {
  try {
    const res = await fetch(`${YT_BASE}/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { 'User-Agent': DESKTOP_UA },
      signal: AbortSignal.timeout(12_000)
    })
    if (!res.ok) return []
    const xml = await res.text()
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
    const results = []

    for (const entry of entries) {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim()
      if (!videoId || excludeIds.has(videoId)) continue
      const linkHref = entry.match(/<link[^>]+href="([^"]+)"/)?.[1] || `${YT_BASE}/watch?v=${videoId}`
      if (linkHref.includes('/shorts/')) continue

      const title = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || `Video ${videoId}`)
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.slice(0, 10) || '-'
      const viewsNum = entry.match(/views="(\d+)"/)?.[1]
      const views = viewsNum ? `${Number(viewsNum).toLocaleString('id-ID')} x ditonton` : '-'

      results.push({
        videoId,
        title,
        views,
        published,
        duration: '-',
        url: linkHref,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      })
      if (results.length >= limit) break
    }
    return results
  } catch (_) {
    return []
  }
}

function parseSubscribedChannels(browseDatas, selfChannelId) {
  const subscriptions = []
  const featuredChannels = []
  const seenSub = new Set([selfChannelId])
  const seenFeat = new Set([selfChannelId])

  const walk = (node, sectionTitle = '') => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, sectionTitle)
      return
    }

    let currentTitle = sectionTitle
    if (node.shelfRenderer) currentTitle = readText(node.shelfRenderer.title) || currentTitle
    else if (node.itemSectionRenderer?.header) currentTitle = readText(node.itemSectionRenderer.header) || currentTitle

    const ch = node.gridChannelRenderer || node.channelRenderer
    if (ch?.channelId) {
      const id = ch.channelId
      const isSub = /subscri|langganan/i.test(currentTitle)
      const setRef = isSub ? seenSub : seenFeat
      const arrRef = isSub ? subscriptions : featuredChannels

      if (!setRef.has(id)) {
        setRef.add(id)
        const pathUrl = ch.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || `/channel/${id}`
        arrRef.push({
          channelId: id,
          name: readText(ch.title) || '-',
          subscribers: readText(ch.subscriberCountText) || '-',
          videos: readText(ch.videoCountText) || '-',
          url: `${YT_BASE}${pathUrl}`,
          avatar: pickBestThumb(ch.thumbnail)
        })
      }
      return
    }

    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') walk(val, currentTitle)
    }
  }

  for (const d of browseDatas) {
    if (d) walk(d, '')
  }

  return { subscriptions, featuredChannels }
}

/**
 * Mengambil informasi lengkap channel YouTube (Profil, Bio, Subscriber, Langganan Publik, Video Reguler, Shorts)
 * @param {string} target - @username, nama channel, Channel ID (UC...), atau URL channel
 * @param {object} [opts]
 * @param {number} [opts.videoLimit=15] - Maksimal video reguler terbaru
 * @param {number} [opts.shortsLimit=10] - Maksimal Shorts terbaru
 */
export async function stalkYouTubeChannel(target, { videoLimit = 15, shortsLimit = 10 } = {}) {
  const channelId = await resolveChannelId(target)
  const suffix = channelId.slice(2)

  const homeData = await ytPost('browse', { browseId: channelId })
  const meta = homeData?.metadata?.channelMetadataRenderer || {}
  const micro = homeData?.microformat?.microformatDataRenderer || {}

  const tabInfo = extractTabParams(homeData)
  const aboutToken = findObjectsByKey(homeData?.header, 'continuationCommand')[0]?.token || ''

  const [aboutData, videosTabResp, shortsTabResp, channelsTabResp] = await Promise.all([
    aboutToken
      ? ytPost('browse', { continuation: aboutToken }).catch(() => null)
      : ytPost('browse', { browseId: channelId, params: 'EgVhYm91dA==' }).catch(() => null),
    ytPost('browse', { browseId: channelId, params: tabInfo.videos.params }).catch(() => null),
    ytPost('browse', { browseId: channelId, params: tabInfo.shorts.params }).catch(() => null),
    ytPost('browse', { browseId: channelId, params: tabInfo.channels.params }).catch(() => null)
  ])

  let latestShorts = []
  const selectedShortsTab = getSelectedTab(shortsTabResp)
  const shortsTabUrl =
    selectedShortsTab?.endpoint?.browseEndpoint?.canonicalBaseUrl ||
    selectedShortsTab?.endpoint?.commandMetadata?.webCommandMetadata?.url || ''
  if (selectedShortsTab && (/\/shorts/i.test(shortsTabUrl) || /shorts/i.test(readText(selectedShortsTab.title)))) {
    latestShorts = parseShortsFromNode(selectedShortsTab.content, shortsLimit)
  }
  if (latestShorts.length === 0) {
    latestShorts = await fetchChannelPlaylist(`UUSH${suffix}`, 'short', shortsLimit)
  }

  let latestVideos = []
  const selectedVideosTab = getSelectedTab(videosTabResp)
  const videosTabUrl =
    selectedVideosTab?.endpoint?.browseEndpoint?.canonicalBaseUrl ||
    selectedVideosTab?.endpoint?.commandMetadata?.webCommandMetadata?.url || ''
  if (selectedVideosTab && (/\/videos/i.test(videosTabUrl) || /video/i.test(readText(selectedVideosTab.title)))) {
    latestVideos = parseVideosFromNode(selectedVideosTab.content, videoLimit)
  }
  if (latestVideos.length === 0) {
    latestVideos = await fetchChannelPlaylist(`UULF${suffix}`, 'video', videoLimit)
  }
  if (latestVideos.length === 0) {
    const shortIds = new Set(latestShorts.map((s) => s.videoId))
    latestVideos = await fetchRssUploads(channelId, shortIds, videoLimit)
  }

  const phvm = findObjectsByKey(homeData?.header, 'pageHeaderViewModel')[0] || null
  const legacyHeader = homeData?.header?.c4TabbedHeaderRenderer || null
  const aboutVm = findObjectsByKey(aboutData || homeData, 'aboutChannelViewModel')[0] || null
  const legacyAbout = findObjectsByKey(aboutData || homeData, 'channelAboutFullMetadataRenderer')[0] || null

  let handle = ''
  let subscribers = ''
  let totalVideos = ''

  if (phvm?.metadata?.contentMetadataViewModel?.metadataRows) {
    for (const row of phvm.metadata.contentMetadataViewModel.metadataRows) {
      for (const part of (row.metadataParts || [])) {
        const txt = readText(part.text)
        if (!txt) continue
        if (txt.startsWith('@') && !handle) handle = txt
        else if (/subscriber|pelanggan/i.test(txt) && !subscribers) subscribers = txt
        else if (/video/i.test(txt) && !totalVideos) totalVideos = txt
      }
    }
  }

  const externalLinks = []
  for (const lk of (aboutVm?.links || legacyAbout?.primaryLinks || [])) {
    const vm = lk?.channelExternalLinkViewModel
    if (vm) {
      const url = extractRealExternalUrl(
        vm.link?.commandRuns?.[0]?.onTap?.innertubeCommand?.urlEndpoint?.url || readText(vm.link)
      )
      if (url) externalLinks.push({ title: readText(vm.title) || 'Link', url })
    } else if (lk?.navigationEndpoint?.urlEndpoint?.url) {
      externalLinks.push({
        title: readText(lk.title) || 'Link',
        url: extractRealExternalUrl(lk.navigationEndpoint.urlEndpoint.url)
      })
    }
  }

  const { subscriptions, featuredChannels } = parseSubscribedChannels(
    [getSelectedTab(channelsTabResp)?.content, homeData],
    channelId
  )

  return {
    status: true,
    profile: {
      channelId,
      name: readText(phvm?.title?.dynamicTextViewModel?.text) || meta.title || legacyHeader?.title || '-',
      handle: handle || readText(legacyHeader?.channelHandleText) || (meta.vanityChannelUrl?.match(/\/(@[^/]+)/)?.[1] || '-'),
      url: aboutVm?.canonicalChannelUrl || meta.vanityChannelUrl || meta.channelUrl || `${YT_BASE}/channel/${channelId}`,
      verified:
        JSON.stringify(homeData?.header || '').includes('CHECK_CIRCLE_FILLED') ||
        JSON.stringify(homeData?.header || '').includes('BADGE_STYLE_TYPE_VERIFIED'),
      subscribers: aboutVm?.subscriberCountText || subscribers || readText(legacyHeader?.subscriberCountText) || 'Disembunyikan',
      totalVideos: aboutVm?.videoCountText || totalVideos || readText(legacyHeader?.videosCountText) || '-',
      totalViews: aboutVm?.viewCountText || readText(legacyAbout?.viewCountText) || '-',
      joinedDate: readText(aboutVm?.joinedDateText) || readText(legacyAbout?.joinedDateText) || '-',
      country: aboutVm?.country || readText(legacyAbout?.country) || '-',
      bio: aboutVm?.description || meta.description || readText(legacyAbout?.description) || '(Tidak ada bio)',
      avatar:
        pickBestThumb(phvm?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image) ||
        pickBestThumb(meta.avatar) ||
        pickBestThumb(legacyHeader?.avatar),
      banner: pickBestThumb(phvm?.banner?.imageBannerViewModel?.image) || pickBestThumb(legacyHeader?.banner),
      familySafe: Boolean(meta.isFamilySafe ?? micro.familySafe ?? true),
      externalLinks
    },
    subscriptionsNote:
      subscriptions.length > 0
        ? `Ditemukan ${subscriptions.length} channel langganan publik.`
        : 'Daftar langganan (subscriptions) disembunyikan/privat oleh pemilik channel atau kosong.',
    subscriptions,
    featuredChannels,
    latestVideos,
    latestShorts
  }
}

export default {
  resolveChannelId,
  stalkYouTubeChannel
}