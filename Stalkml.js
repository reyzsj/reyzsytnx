// ---------------------------------------------------------
// 🔥 Author   : Dhanz (t.me/ktzckmy)
// 🌸 Date     : 28 November 2026
// 🍂 Function : Mobile Legends Stalker Base Module + Hero Mapper (ESM)
// 🌟 Channels :
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
//
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini.
// Native net + zlib zstd + fetch/curl (Zero NPM Dependency, Node.js v22+).
// Built-in Hero ID 1-128 + Auto-Sync Hero 129+ (cache lokal 7 hari).
// Error fix sendiri.
// ---------------------------------------------------------

import dns from 'node:dns'
import net from 'node:net'
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  try { net.setDefaultAutoSelectFamily(false) } catch (_) {}
}

export const CREDIT = Object.freeze({
  Author: 'Dhanz (t.me/ktzckmy)',
  Channel: 'https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l'
})

const HERO_CACHE_FILE = path.resolve(process.cwd(), 'mlbb_heroes_cache.json')
const HERO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'

export const BUILTIN_HEROES = Object.freeze({
  1: 'Miya', 2: 'Balmond', 3: 'Saber', 4: 'Alice', 5: 'Nana',
  6: 'Tigreal', 7: 'Alucard', 8: 'Karina', 9: 'Akai', 10: 'Franco',
  11: 'Bane', 12: 'Bruno', 13: 'Clint', 14: 'Rafaela', 15: 'Eudora',
  16: 'Zilong', 17: 'Fanny', 18: 'Layla', 19: 'Minotaur', 20: 'Lolita',
  21: 'Hayabusa', 22: 'Freya', 23: 'Gord', 24: 'Natalia', 25: 'Kagura',
  26: 'Chou', 27: 'Sun', 28: 'Alpha', 29: 'Ruby', 30: 'Yi Sun-shin',
  31: 'Moskov', 32: 'Johnson', 33: 'Cyclops', 34: 'Estes', 35: 'Hilda',
  36: 'Aurora', 37: 'Lapu-Lapu', 38: 'Vexana', 39: 'Roger', 40: 'Karrie',
  41: 'Gatotkaca', 42: 'Harley', 43: 'Irithel', 44: 'Grock', 45: 'Argus',
  46: 'Odette', 47: 'Lancelot', 48: 'Diggie', 49: 'Hylos', 50: 'Zhask',
  51: 'Helcurt', 52: 'Pharsa', 53: 'Lesley', 54: 'Jawhead', 55: 'Angela',
  56: 'Gusion', 57: 'Valir', 58: 'Martis', 59: 'Uranus', 60: 'Hanabi',
  61: "Chang'e", 62: 'Kaja', 63: 'Selena', 64: 'Aldous', 65: 'Claude',
  66: 'Vale', 67: 'Leomord', 68: 'Lunox', 69: 'Hanzo', 70: 'Belerick',
  71: 'Kimmy', 72: 'Thamuz', 73: 'Harith', 74: 'Minsitthar', 75: 'Kadita',
  76: 'Faramis', 77: 'Badang', 78: 'Khufra', 79: 'Granger', 80: 'Guinevere',
  81: 'Esmeralda', 82: 'Terizla', 83: 'X.Borg', 84: 'Ling', 85: 'Dyrroth',
  86: 'Lylia', 87: 'Baxia', 88: 'Masha', 89: 'Wanwan', 90: 'Silvanna',
  91: 'Cecilion', 92: 'Carmilla', 93: 'Atlas', 94: 'Popol and Kupa', 95: 'Yu Zhong',
  96: 'Luo Yi', 97: 'Benedetta', 98: 'Khaleed', 99: 'Barats', 100: 'Brody',
  101: 'Yve', 102: 'Mathilda', 103: 'Paquito', 104: 'Gloo', 105: 'Beatrix',
  106: 'Phoveus', 107: 'Natan', 108: 'Aulus', 109: 'Aamon', 110: 'Valentina',
  111: 'Edith', 112: 'Floryn', 113: 'Yin', 114: 'Melissa', 115: 'Xavier',
  116: 'Julian', 117: 'Fredrinn', 118: 'Joy', 119: 'Novaria', 120: 'Arlott',
  121: 'Ixia', 122: 'Nolan', 123: 'Cici', 124: 'Chip', 125: 'Zhuxin',
  126: 'Suyou', 127: 'Lukas', 128: 'Kalea'
})

let cachedHeroes = { ...BUILTIN_HEROES }

const decodeHtml = (s = '') => String(s)
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#0*39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

const stripTags = (html = '') => decodeHtml(String(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

async function fetchTextSmart(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': FIREFOX_UA, Accept: 'text/html,application/json,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12_000)
    })
    if (r.ok) return await r.text()
  } catch (_) {}

  try {
    const { stdout } = await execFileAsync('curl', [
      '-sL', '--max-time', '15',
      '-A', FIREFOX_UA,
      '-H', 'Accept: text/html,application/json,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      url
    ], { maxBuffer: 15 * 1024 * 1024 })
    return stdout || ''
  } catch (_) {
    return ''
  }
}

function parseHeroesFromWikiHtml(html = '') {
  const map = {}
  const skipNames = /^(tank|fighter|assassin|mage|marksman|support|gold lane|exp lane|mid lane|jungle|roam|hero|name|code|role|specialty|lane|price)$/i

  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = row[1]
    const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1])
    if (cells.length < 3) continue

    let heroId = null
    const mIcon = rowHtml.match(/Hero0*([1-9]\d{0,2})1-icon/i)
    if (mIcon) heroId = Number(mIcon[1])

    if (!heroId) {
      for (let i = 0; i < Math.min(5, cells.length); i++) {
        const mNum = stripTags(cells[i]).match(/^0*([1-9]\d{0,2})$/)
        if (mNum && Number(mNum[1]) <= 400) { heroId = Number(mNum[1]); break }
      }
    }
    if (!heroId) continue

    let heroName = null
    for (let i = 0; i < Math.min(3, cells.length) && !heroName; i++) {
      for (const a of cells[i].matchAll(/<a\b[^>]*href=["']\/wiki\/([^"'#:]+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
        if (/^(File|Category|Special|Template):/i.test(a[1])) continue
        const inner = stripTags(a[3])
        const titleAttr = decodeHtml(a[2].match(/title=["']([^"']+)["']/i)?.[1] || '').trim()
        const cand = (inner && !/^\d+$/.test(inner)) ? inner : titleAttr
        if (cand && !/^\d+$/.test(cand) && !skipNames.test(cand)) {
          heroName = cand
          break
        }
      }
    }
    if (heroName && !map[heroId]) map[heroId] = heroName
  }
  return map
}

export async function loadHeroMap(forceRefresh = false) {
  if (!forceRefresh && Object.keys(cachedHeroes).length >= 130) return cachedHeroes

  if (!forceRefresh) {
    try {
      if (fs.existsSync(HERO_CACHE_FILE)) {
        const c = JSON.parse(fs.readFileSync(HERO_CACHE_FILE, 'utf8'))
        if (c?.heroes && Object.keys(c.heroes).length >= 120 && (Date.now() - (c.updatedAt || 0)) < HERO_CACHE_TTL) {
          cachedHeroes = { ...BUILTIN_HEROES, ...c.heroes }
          return cachedHeroes
        }
      }
    } catch (_) {}
  }

  let parsed = {}
  const apiRaw = await fetchTextSmart('https://mobile-legends.fandom.com/api.php?action=parse&page=List_of_heroes&prop=text&format=json&formatversion=2')
  if (apiRaw) {
    try { parsed = parseHeroesFromWikiHtml(JSON.parse(apiRaw)?.parse?.text || '') } catch (_) {}
  }

  if (Object.keys(parsed).length < 50) {
    const html = await fetchTextSmart('https://mobile-legends.fandom.com/wiki/List_of_heroes')
    if (html) parsed = parseHeroesFromWikiHtml(html)
  }

  cachedHeroes = { ...BUILTIN_HEROES, ...parsed }
  if (Object.keys(parsed).length >= 50) {
    try {
      fs.writeFileSync(HERO_CACHE_FILE, JSON.stringify({
        updatedAt: Date.now(),
        count: Object.keys(cachedHeroes).length,
        heroes: cachedHeroes
      }, null, 2))
    } catch (_) {}
  }
  return cachedHeroes
}

export const heroNameOf = (heroId, heroMap = cachedHeroes) => (
  heroMap[String(heroId)] || heroMap[Number(heroId)] || BUILTIN_HEROES[Number(heroId)] || `Hero #${heroId}`
)

const RANK_GROUPS = [
  { name: 'Warrior', start: 1, end: 10, divisions: 3 },
  { name: 'Elite', start: 11, end: 25, divisions: 3 },
  { name: 'Master', start: 26, end: 45, divisions: 4 },
  { name: 'Grandmaster', start: 46, end: 75, divisions: 5 },
  { name: 'Epic', start: 76, end: 105, divisions: 5 },
  { name: 'Legend', start: 106, end: 135, divisions: 5 },
  { name: 'Mythic', start: 136, end: 160, divisions: 0 },
  { name: 'Mythical Honor', start: 161, end: 185, divisions: 0 },
  { name: 'Mythical Glory', start: 186, end: 235, divisions: 0 },
  { name: 'Glorious Mythic', start: 236, end: 9999, divisions: 0 }
]
const DIVISIONS = { 3: ['III', 'II', 'I'], 4: ['IV', 'III', 'II', 'I'], 5: ['V', 'IV', 'III', 'II', 'I'] }

export const rankOf = (value) => {
  const level = Number(value)
  if (!Number.isFinite(level) || level <= 0) return null
  const group = RANK_GROUPS.find((item) => level >= item.start && level <= item.end)
  if (!group) return { level, name: 'Unranked', division: null, fullName: 'Unranked' }
  if (!group.divisions) return { level, name: group.name, division: null, fullName: group.name }
  const span = (group.end - group.start + 1) / group.divisions
  const index = Math.min(group.divisions - 1, Math.floor((level - group.start) / span))
  return { level, name: group.name, division: DIVISIONS[group.divisions][index], fullName: `${group.name} ${DIVISIONS[group.divisions][index]}` }
}

export class MlbbError extends Error {
  constructor(message, details = {}) {
    super(message); this.name = 'MlbbError'; this.code = details.code; this.status = details.status; this.url = details.url; this.body = details.body
  }
}

const asNumber = (v, label) => { const n = Number(v); if (!Number.isSafeInteger(n) || n <= 0) throw new MlbbError(`${label} must be a positive integer`); return n }
const parseTarget = (value, zoneId) => {
  if (value && typeof value === 'object') return { roleId: asNumber(value.roleId, 'roleId'), zoneId: asNumber(value.zoneId, 'zoneId') }
  if (zoneId !== undefined && zoneId !== null) return { roleId: asNumber(value, 'roleId'), zoneId: asNumber(zoneId, 'zoneId') }
  const match = String(value ?? '').trim().match(/^(\d{3,})\s*(?:[\(\[]\s*(\d{2,})\s*[\)\]]|[,/|:\-\s]\s*(\d{2,}))$/)
  if (!match) throw new MlbbError('pass roleId and zoneId, or a string like "12345678 (1234)"')
  return { roleId: asNumber(match[1], 'roleId'), zoneId: asNumber(match[2] ?? match[3], 'zoneId') }
}

export const GAME_PROTOCOL_AVAILABLE = true
const GAME_AUTH_HOST = 'login.ml.youngjoygame.com', GAME_AUTH_PORT = 30021
const GAME_OP_AUTH_SC = 0x70000201, GAME_OP_UPGRADE = 0x70000501, GAME_OP_UPGRADE_SC = 0x70000601
const GAME_OP_CONNECT = 0x7000914e, GAME_OP_CONNECT_SC = 0x7000924e
const GAME_OP_ROLE = 0x7000f54e, GAME_OP_ROLE_SC = 0x7000f64e
const GAME_OP_PROFILE = 0x70009f4f, GAME_OP_PROFILE_SC = 0x7000a04f
const GAME_OP_STATS = 0x7000d694, GAME_OP_STATS_SC = 0x7000d794
const GAME_OP_HISTORY = 0x7000d895, GAME_OP_HISTORY_SC = 0x7000d995

const GAME_TEMPLATES = {
  loginInner: 'cAABAQFFrwhwQFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1QXtncHNfYWRpZD0xNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDUmYW5kcm9pZF9pZD1hODM0NTZhZWI3ZTg5OTIyJmRldmljZV91bmlxdWVfaWQ9Y2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZCDTIuMi4xNi4xMjMyLjFDB2FuZF91c2FEAmVuBQJJAlVTTREyMDE5LTIuMDEuMDA1Ni4wOE6IAWdwc19hZGlkPTE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NSZhbmRyb2lkX2lkPWE4MzQ1NmFlYjdlODk5MjImaWRmYT0maWRmdj0mb3NfdmVyc2lvbj0xMyZkZXZpY2VfbmFtZT0yMTA4MTExMVJHJmlzc2ltdWxhdG9yPTBvDwFABGlkZmFAJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NX8QEAFBPWJ1aWxkX2JyYW5kPVJlZG1pJmJ1aWxkX2RldmljZT1tZXJsaW54JmxvZ2luc3ZpcD0mY291bnRyaWVzPTSAfxNAB2FuZHJvaWRDJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NUQQYTgzNDU2YWViN2U4OTkyMkUkNjA1N2QxMmYtNTM4NC0xMmEyLTNmN2YtMWU1ZmQzMTA2YWQ1RiA3OTdjNTIzM2I5MTg4NTUwNmE4M2YwMzUwM2Y4YTE5OYBPFFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1TxUgY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZPFgxhb3NwX21lcmxpbnhPFwJlbg8YZQ8ZAU8afGNIQUJBVU1CTUVRQk1JQkJKUWkyVlVvNzVMMHY4bllFYnJTeTJudWhET0RvZ0RmcG9YZ2xRRG5xNGVMUUFmZ3d4UVJDS0dJMlkyUTBZbU5sT0daaU5UTm1ZV1psT0RjMU1HUmtORGRsWTJNNE9ESmlNbUV4Wm1NeE56ZUFPGyA3Yjc2ODllOWIzZDhmMDM5ZTUwMzQ1YjZkMGVhN2NiYQ8ctgEPHQVPJCQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPJQMxODIPJlpPKiBlZTliZjhhNDE2YWYzMjJhMTJkZDlmZjllNTAzNjc0NQ8sAoCA',
  checkUpgrade: 'cADRoq6eAUFES1o5eU5mbCtlazZkNC9FemdtdExldU11eVNyUHJ0OW5XeSt5K1kwRkQzKzNrQis4VnVmUGwrbTlrcE9HSkYxN0FnPT1CDTIuMi4xNi4xMjMyLjEFgkhGB2FuZF91c2FKDjE1OC4xNDAuMTcwLjgxC9Oo/N8FDAFNAlVTDw9ZDxECTxICSURfExRAKTQ0X3Jlc291cmNlbWFuYWdlP3siZ3JvdXBfdGFnIjoiY29udHJvbCJ9QCk0MjJfY3BsdXNkb3dubG9hZD97Imdyb3VwX3RhZyI6ImNvbnRyb2wifUAhNzBfcHJvZF9tbGJicmVjX29ic2VydmVfMjAyNjAzMjU/QC03MF9wcm9kX21sYmJyZWNfYnV5X2ZpbHRlcl9zdHJhdGVneV8yMDI2MDMyNj9AMTcwX3Byb2RfbWxiYnJlY19taW5pYnV5X2ZpbHRlcl9zdHJhdGVneV8yMDI2MDMyNj9AFDYwX1NlYXNvbkhlcm9Qb29sXzI/QBNkaXNwYXRjaGVyXzg4Ml9vbGQ/QB44OF9lbnRlcl9iYXR0bGVfY29yeV8yP2NvbnRyb2xAGjg4Ml9haV9yZWNvbW1hbmRhdGlvbl9wcm8/QBc4OF9lbnRlcl9iYXR0bGVfY29yeV80P0ANMTZfbW9sYV9vbGQxP0AcMTZfcHNzX3ZlcnNpb24xX2hvdXlhbmd5YW5nP0ArMTZfYWlfcmVjb21tYW5kYXRpb25fb25seW0yX29sZHBsYXllcj90ZXN0MUASMTZfU2Vhc29uSGVyb1Bvb2w/QBwxNl9Mb3dSZXNPcmRlcl9uZXcwOTI4P3Rlc3QyQAwxNl9yZWRkb3RzMT9AFTE2X2VudGVyX2JhdHRsZV9jb3J5P0AVMTZfTG9naW5UaW1lT3B0aW1pemU/QBcxNl9Mb3dSZXNPcmRlcl9uZXcxMDIwP0AXMTZfTG93UmVzT3JkZXJfbmV3MTExMj9PFCBkZGUzN2ViNzQxNzg0YmEyYmVmYjY5NGY4YjE2NDhkNw8VtgEPFloPFwIPGAGAgA==',
  netConnect: 'cADRoq6eAUFEQi80MnVFakcrMUI0YnFFRjhiQnovRzVKNnNTODE0YzNpR2wwSHdFRWxpTWZaOUc1Mno5ZGhqUTdLT0NUR3ZpaEFnPT0CgkhEDTIuMi4xNi4xMjM1LjEGAkcOMTU4LjE0MC4xNzAuODFICTIxMTgxMjMyMkkCSURKEGUwNzQ3NDZkN2E4MjU0NTVLDTIuMi4yMy4xMjM1LjFNB2FuZF91c2FOF1hpYW9taSAyMTA4MTExMVJHLUFSTTY0Tw9YYW5kX2NkOWU0NTllYTcwOGE5NDhkNWMyZjVhNmNhODgzOGNmYTgzNDU2YWViN2U4OTkyMjE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NU8RDTIuMi4xNi4xMjMyLjFPEgBPExBhODM0NTZhZWI3ZTg5OTIyfxRAB2FuZHJvaWRBAEIAQyQxNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDVEEGE4MzQ1NmFlYjdlODk5MjJFJDYwNTdkMTJmLTUzODQtMTJhMi0zZjdmLTFlNWZkMzEwNmFkNUYgNzk3YzUyMzNiOTE4ODU1MDZhODNmMDM1MDNmOGExOTlHAEgAgA8XtwFPGABPGSQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPGgMxODOAgA==',
  roleInit: 'cABlQQdhbmRfdXNhAgJDF1hpYW9taSAyMTA4MTExMVJHLUFSTTY0RAJlbgWAiXoGnR1HAklESFhhbmRfY2Q5ZTQ1OWVhNzA4YTk0OGQ1YzJmNWE2Y2E4ODM4Y2ZhODM0NTZhZWI3ZTg5OTIyMTQ2ZDU1YWQtZTVkMi00MDYyLTgwZmYtOTAwMTEwZmI0YzQ1SQgxODcyLDg2NEoQYTgzNDU2YWViN2U4OTkyMksATABNJDE0NmQ1NWFkLWU1ZDItNDA2Mi04MGZmLTkwMDExMGZiNGM0NU8PIEFuZHJvaWQgT1MgMTM7VFEzQS4yNTAxMDYuMDAzLlMzTxARMjAxOS0yLjAxLjAwNTYuMDhPERRQVC4gRWthIE1hcyBSZXB1Ymxpa08SAE8TAA8UBA8VAg8WAU8XAE8YBDIwMTl/GUARWGlhb21pIDIxMDgxMTExUkdBEkhhcmR3YXJlCTogTVQ2NzY5WkIITWFsaS1HNTIDnR0EAYBPGlpwNWFRWTdGYzY2VngzNmxEZTlJaG1HTmxsMDdKcmpRWSszRzc0d3lwYkQvQmYzN2RiN2J5ZkR4TGI2Rzl4SW80M0VCeHliRjVRK051Z1pjbUx4SzVkcWJpNTdPGw0yLjIuMTYuMTIzNS4xTxwNMi4yLjIzLjEyMzUuMU8dEGE4MzQ1NmFlYjdlODk5MjJPHiBjZDllNDU5ZWE3MDhhOTQ4ZDVjMmY1YTZjYTg4MzhjZk8fIDc5N2M1MjMzYjkxODg1NTA2YTgzZjAzNTAzZjhhMTk5DyABfyFAB2FuZHJvaWRBAEIAQyQxNDZkNTVhZC1lNWQyLTQwNjItODBmZi05MDAxMTBmYjRjNDVEEGE4MzQ1NmFlYjdlODk5MjJFJDYwNTdkMTJmLTUzODQtMTJhMi0zZjdmLTFlNWZkMzEwNmFkNUYgNzk3YzUyMzNiOTE4ODU1MDZhODNmMDM1MDNmOGExOTlHAEgAgE8iEmNvbS5tb2JpbGUubGVnZW5kc38kgA8lAU8mIDEyNWZjMDZiOGU1YmJhZDE2YzA3ZWQ0NzAzMTczNDVkDyfKstDXBg8otwFPKgBPKyQyZWE5YWVmMi0zZGRlLTRlNWMtYTY5MS0wOTM3ZDVhY2RmY2JPLAMxODNfMQJAE1N5c3RlbV9TdXJwcmlzZUNhcmRAGFN5c3RlbV9NYWluSW50ZXJmYWNlMjAyNA8yAg8z0QVPNCBhYTZhN2UwNzA5MmM3Y2VjMmUwOTcxMjljMjQwNTliY082AA86Ak87AE88AE8+AA8/AYCA',
  battleData: 'cADRoq6eAQGCSEwAgIA=',
  history: 'cACCSAHRoq6eAYCA'
}

const SDP_INT = 0, SDP_NEG = 1, SDP_FLOAT = 2, SDP_DOUBLE = 3
const SDP_STRING = 4, SDP_LIST = 5, SDP_MAP = 6, SDP_STRUCT = 7, SDP_END = 8

const readVar = (buf, pos) => {
  let v = 0n, shift = 0n, i = pos
  for (;;) {
    if (i >= buf.length) throw new MlbbError('truncated varint')
    const b = buf[i++]; v |= BigInt(b & 0x7f) << shift
    if (!(b & 0x80)) break
    shift += 7n; if (shift > 70n) throw new MlbbError('varint too long')
  }
  return { value: v, next: i }
}
const writeVar = (val) => {
  let rest = BigInt(val), out = []
  do { let b = Number(rest & 0x7fn); rest >>= 7n; if (rest !== 0n) b |= 0x80; out.push(b) } while (rest !== 0n)
  return Buffer.from(out)
}
const readSdpHead = (buf, pos) => {
  const b = buf[pos++], type = b >> 4; let tag = b & 0x0f
  if (tag === 15) { const ext = readVar(buf, pos); tag = Number(ext.value); pos = ext.next }
  return { type, tag, next: pos }
}
const decodeSdpNode = (buf, pos) => {
  const h = readSdpHead(buf, pos), i = h.next
  if (h.type === SDP_INT) { const v = readVar(buf, i); return [{ tag: h.tag, type: SDP_INT, v: v.value }, v.next] }
  if (h.type === SDP_NEG) { const v = readVar(buf, i); return [{ tag: h.tag, type: SDP_NEG, v: -v.value }, v.next] }
  if (h.type === SDP_FLOAT) return [{ tag: h.tag, type: SDP_FLOAT, v: buf.readFloatLE(i) }, i + 4]
  if (h.type === SDP_DOUBLE) return [{ tag: h.tag, type: SDP_DOUBLE, v: buf.readDoubleLE(i) }, i + 8]
  if (h.type === SDP_STRING) { const len = readVar(buf, i), sz = Number(len.value); return [{ tag: h.tag, type: SDP_STRING, raw: Buffer.from(buf.subarray(len.next, len.next + sz)) }, len.next + sz] }
  if (h.type === SDP_LIST) {
    const cnt = readVar(buf, i), items = []; let cur = cnt.next
    for (let k = 0n; k < cnt.value; k += 1n) { const [n, nxt] = decodeSdpNode(buf, cur); items.push(n); cur = nxt }
    return [{ tag: h.tag, type: SDP_LIST, items }, cur]
  }
  if (h.type === SDP_MAP) {
    const cnt = readVar(buf, i), entries = []; let cur = cnt.next
    for (let k = 0n; k < cnt.value; k += 1n) { const [key, kn] = decodeSdpNode(buf, cur), [val, vn] = decodeSdpNode(buf, kn); entries.push([key, val]); cur = vn }
    return [{ tag: h.tag, type: SDP_MAP, entries }, cur]
  }
  if (h.type === SDP_STRUCT) {
    const fields = []; let cur = i
    for (;;) {
      if (cur >= buf.length) throw new MlbbError('unclosed struct')
      if (buf[cur] >> 4 === SDP_END) { cur = readSdpHead(buf, cur).next; break }
      const [n, nxt] = decodeSdpNode(buf, cur); fields.push(n); cur = nxt
    }
    return [{ tag: h.tag, type: SDP_STRUCT, fields }, cur]
  }
  if (h.type === SDP_END) return [{ tag: h.tag, type: SDP_END }, i]
  throw new MlbbError(`unknown SDP type ${h.type}`)
}
const decodeSdp = (buf) => { const nodes = []; let cur = 0; while (cur < buf.length) { const [n, nxt] = decodeSdpNode(buf, cur); nodes.push(n); cur = nxt } return nodes }
const writeSdpHead = (tag, type) => (tag < 15 ? Buffer.from([(type << 4) | tag]) : Buffer.concat([Buffer.from([(type << 4) | 15]), writeVar(tag)]))
const encodeSdpNode = (node) => {
  const head = writeSdpHead(node.tag, node.type)
  if (node.type === SDP_INT || node.type === SDP_NEG) return Buffer.concat([head, writeVar(node.type === SDP_NEG ? -node.v : node.v)])
  if (node.type === SDP_FLOAT) { const b = Buffer.alloc(4); b.writeFloatLE(node.v); return Buffer.concat([head, b]) }
  if (node.type === SDP_DOUBLE) { const b = Buffer.alloc(8); b.writeDoubleLE(node.v); return Buffer.concat([head, b]) }
  if (node.type === SDP_STRING) return Buffer.concat([head, writeVar(node.raw.length), node.raw])
  if (node.type === SDP_LIST) return Buffer.concat([head, writeVar(node.items.length), ...node.items.map(encodeSdpNode)])
  if (node.type === SDP_MAP) return Buffer.concat([head, writeVar(node.entries.length), ...node.entries.flatMap(([k, v]) => [encodeSdpNode(k), encodeSdpNode(v)])])
  if (node.type === SDP_STRUCT) return Buffer.concat([head, ...node.fields.map(encodeSdpNode), writeSdpHead(0, SDP_END)])
  if (node.type === SDP_END) return head
  throw new MlbbError(`unknown SDP type ${node.type}`)
}
const encodeSdp = (nodes) => Buffer.concat(nodes.map(encodeSdpNode))
const sdpTag = (nodes, tag) => (Array.isArray(nodes) ? nodes.find((n) => n.tag === tag) || null : null)
const sdpInt = (nodes, tag, fb = 0) => { const f = sdpTag(nodes, tag); return (!f || (f.type !== SDP_INT && f.type !== SDP_NEG)) ? fb : Number(f.v) }
const sdpBig = (nodes, tag, fb = '0') => { const f = sdpTag(nodes, tag); return (!f || (f.type !== SDP_INT && f.type !== SDP_NEG)) ? fb : String(f.v) }
const sdpText = (nodes, tag) => { const f = sdpTag(nodes, tag); return (!f || f.type !== SDP_STRING) ? null : f.raw.toString('utf8') }
const fieldsOf = (node) => (node && node.type === SDP_STRUCT && node.fields) || []
const setSdp = (nodes, tag, value) => {
  const field = sdpTag(nodes, tag)
  if (!field) throw new MlbbError(`template field ${tag} is missing`)
  if (typeof value === 'string') { field.type = SDP_STRING; field.raw = Buffer.from(value, 'utf8'); delete field.v }
  else { const big = BigInt(value); field.type = big < 0n ? SDP_NEG : SDP_INT; field.v = big < 0n ? -big : big; delete field.raw }
  delete field.items; delete field.entries; delete field.fields; return nodes
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const authWrap = (inner) => { const p = zlib.zstdCompressSync(inner), h = Buffer.alloc(4); h.writeUInt16BE(0x1000, 0); h.writeUInt16BE(p.length + 4, 2); return Buffer.concat([h, p]) }
const innerFrame = (op, seq, body) => { const h = Buffer.alloc(6); h.writeUInt32BE(op >>> 0, 0); h[4] = seq & 0xff; h[5] = 0x45; return Buffer.concat([h, writeVar(body.length - 1), body]) }
const parseInner = (raw) => {
  const opcode = raw.readUInt32BE(0)
  for (let i = 4; i < Math.min(raw.length - 1, 24); i += 1) {
    if (raw[i] !== 0x45 && raw[i] !== 0x46) continue
    const d = readVar(raw, i + 1), end = d.next + Number(d.value) + 1
    if (end <= raw.length) return { opcode, body: raw.subarray(d.next, end), consumed: end }
  }
  throw new MlbbError('cannot parse game auth frame')
}
const readZoneFrame = (buf) => {
  if (buf.length < 9) return null
  const length = buf.readUInt32BE(0); if (length < 9 || length > buf.length) return null
  const opcode = buf.readUInt32BE(4); let pos = 8
  for (let a = 0; a < 3; a += 1) {
    try { pos = readVar(buf, pos).next } catch { return null }
    if (pos < length && (buf[pos] === 0x45 || buf[pos] === 0x46)) {
      const d = readVar(buf, pos + 1)
      if (d.next + Number(d.value) + 1 === length) return { length, opcode, body: buf.subarray(d.next, length) }
    }
  }
  return { length, opcode, body: buf.subarray(9, length) }
}
const pushInnerFrames = (raw, push) => {
  let rest = raw
  while (rest.length >= 7) {
    let f = null; try { f = parseInner(rest) } catch { f = null }
    if (!f) { const zf = readZoneFrame(rest); if (!zf) return; push({ opcode: zf.opcode, body: zf.body }); rest = rest.subarray(zf.length); continue }
    push({ opcode: f.opcode, body: f.body }); rest = rest.subarray(f.consumed)
  }
}
const zoneFrame = (op, seq, msgId, body, flag = 0) => {
  const head = Buffer.from([seq & 0xff]), mid = flag ? Buffer.concat([Buffer.from([flag & 0xff]), writeVar(msgId)]) : writeVar(msgId)
  const payload = Buffer.concat([head, mid, Buffer.from([0x45]), writeVar(body.length - 1), body])
  const outer = Buffer.alloc(8); outer.writeUInt32BE(payload.length + 8, 0); outer.writeUInt32BE(op >>> 0, 4)
  return Buffer.concat([outer, payload])
}

class TcpLink {
  constructor(host, port, timeout, label) { this.host = host; this.port = port; this.timeout = timeout; this.label = label; this.buffer = Buffer.alloc(0); this.frames = []; this.waiters = []; this.closed = false }
  open() {
    return new Promise((resolve, reject) => {
      let done = false
      const timer = setTimeout(() => { if (!done) { done = true; this.close(); reject(new MlbbError(`${this.label} connect timeout`, { status: 408 })) } }, this.timeout)
      this.socket = net.connect({ host: this.host, port: this.port }); this.socket.setNoDelay(true)
      this.socket.once('connect', () => { if (!done) { done = true; clearTimeout(timer); resolve() } })
      this.socket.once('error', (e) => { this.closed = true; if (!done) { done = true; clearTimeout(timer); reject(e) } })
      this.socket.on('data', (c) => this.receive(c))
      this.socket.on('close', () => { this.closed = true; while (this.waiters.length) this.waiters.shift().reject(new MlbbError(`${this.label} connection closed`)) })
    })
  }
  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    for (;;) {
      if (this.buffer.length >= 4 && this.buffer.readUInt16BE(0) === 0x1000) {
        const total = this.buffer.readUInt16BE(2); if (total < 4 || this.buffer.length < total) return
        const raw = zlib.zstdDecompressSync(this.buffer.subarray(4, total)); this.buffer = this.buffer.subarray(total)
        pushInnerFrames(raw, (f) => this.push(f)); continue
      }
      const f = readZoneFrame(this.buffer); if (!f) return
      this.buffer = this.buffer.subarray(f.length); this.push(f)
    }
  }
  push(frame) { const w = this.waiters.shift(); if (w) w.resolve(frame); else this.frames.push(frame) }
  read(timeout = this.timeout) {
    if (this.frames.length) return Promise.resolve(this.frames.shift())
    if (this.closed) return Promise.reject(new MlbbError(`${this.label} connection closed`))
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((e) => e.resolve === resolve); if (idx >= 0) this.waiters.splice(idx, 1)
        reject(new MlbbError(`${this.label} server did not respond`, { status: 408 }))
      }, timeout)
      this.waiters.push({ resolve: (f) => { clearTimeout(timer); resolve(f) }, reject: (e) => { clearTimeout(timer); reject(e) } })
    })
  }
  async expect(opcode, timeout = this.timeout) {
    const deadline = Date.now() + timeout
    for (;;) { const left = deadline - Date.now(); if (left <= 0) throw new MlbbError(`${this.label} server did not answer opcode 0x${opcode.toString(16)}`, { status: 408 }); const f = await this.read(left); if (f.opcode === opcode) return f }
  }
  writeRaw(buf) { if (this.closed) throw new MlbbError(`${this.label} connection closed`); this.socket.write(buf) }
  close() { this.closed = true; if (this.socket) this.socket.destroy() }
}

const sdpPlain = (n) => {
  if (!n) return null
  if (n.type === SDP_INT || n.type === SDP_NEG) return String(n.v)
  if (n.type === SDP_FLOAT || n.type === SDP_DOUBLE) return Number(n.v)
  if (n.type === SDP_STRING) return n.raw.toString('utf8')
  if (n.type === SDP_LIST) return (n.items || []).map(sdpPlain)
  if (n.type === SDP_MAP) return (n.entries || []).map(([k, v]) => [sdpPlain(k), sdpPlain(v)])
  if (n.type === SDP_STRUCT) { const o = {}; for (const f of n.fields || []) o[f.tag] = sdpPlain(f); return o }
  return null
}
const sdpTagMap = (nodes) => { const o = {}; for (const n of nodes || []) o[n.tag] = sdpPlain(n); return o }
const sdpTextList = (node) => ((node && node.items) || []).map((i) => (i.type === SDP_STRING ? i.raw.toString('utf8') : String(sdpPlain(i))))
const isoFromSeconds = (sec) => (Number.isFinite(Number(sec)) && Number(sec) > 0 ? new Date(Number(sec) * 1000).toISOString() : null)
const COLLECTION_QUALITY = { 1: 'common', 2: 'exceptional', 3: 'deluxe', 4: 'exquisite', 5: 'grand', 6: 'legend' }

const decodeCollection = (node) => {
  if (!node || node.type !== SDP_STRUCT) return null
  const f = node.fields || [], qualities = {}
  for (const [k, v] of (sdpTag(f, 4) || {}).entries || []) { const name = COLLECTION_QUALITY[sdpInt([k], 0)]; if (name) qualities[name] = sdpInt([v], 0) }
  return { level: sdpInt(f, 0), points: sdpInt(f, 1), nextLevelPoints: sdpInt(f, 10), qualities, maxedQualities: sdpInt(f, 8), season: sdpInt(f, 9) }
}
const decodeAffinity = (node) => ((node && node.items) || []).map((item) => {
  const f = fieldsOf(item)
  return { roleId: sdpBig(f, 0), zoneId: sdpInt(f, 1), name: sdpText(f, 2), level: sdpInt(f, 3), relation: sdpInt(f, 6) === 1 ? 'partner' : 'sibling', value: sdpInt(f, 7) }
})
const decodeVisitors = (node) => ((node && node.items) || []).map((item) => {
  const f = fieldsOf(item)
  return { roleId: sdpBig(f, 0), zoneId: sdpInt(f, 1), facePath: sdpText(f, 2), level: sdpInt(f, 3), faceId: sdpInt(f, 4) }
})
const decodePlayerBase = (fields) => {
  const rankLevel = sdpInt(fields, 6)
  return {
    roleId: sdpInt(fields, 0), zoneId: sdpInt(fields, 1), name: sdpText(fields, 2), level: sdpInt(fields, 3),
    faceId: sdpInt(fields, 4), nationality: sdpInt(fields, 5), rankLevel, rank: rankOf(rankLevel),
    rankPoints: rankLevel, highestRankPoints: sdpInt(fields, 148), lastLogin: sdpInt(fields, 21),
    lastLoginAt: isoFromSeconds(sdpInt(fields, 21)), facePath: sdpText(fields, 14), signature: sdpText(fields, 19),
    creditScore: sdpInt(fields, 20), gender: sdpInt(fields, 13), status: sdpInt(fields, 15), certified: sdpInt(fields, 16) === 1,
    nameDisplay: { title: sdpText(fields, 17), tag: sdpText(fields, 18) }, achievementScore: sdpInt(fields, 8),
    totalMatches: sdpInt(fields, 22), battleLikes: sdpInt(fields, 24), following: sdpInt(fields, 25),
    followers: sdpInt(fields, 149), likes: sdpInt(fields, 77), watcherNum: sdpInt(fields, 75),
    heroCount: sdpInt(fields, 9), skinCount: sdpInt(fields, 10), pvpRank: sdpInt(fields, 11),
    clientVersion: sdpText(fields, 12), teamId: sdpBig(fields, 34), title: sdpPlain(sdpTag(fields, 40)),
    mcl: { weekly: sdpPlain(sdpTag(fields, 28)), season: sdpPlain(sdpTag(fields, 29)) },
    location: sdpTextList(sdpTag(fields, 74)), countryCode: sdpText(fields, 136),
    skins: ((sdpTag(fields, 92) || {}).items || []).map((i) => sdpInt(fieldsOf(i), 0)),
    collection: decodeCollection(sdpTag(fields, 118)), emblem: sdpPlain(sdpTag(fields, 134)),
    visitors: decodeVisitors(sdpTag(fields, 27)), affinity: decodeAffinity(sdpTag(fields, 82)),
    tags: sdpTagMap(fields)
  }
}
const decodeHeroDatas = (nodes, heroMap) => (nodes || []).map((item) => {
  const f = fieldsOf(item), id = sdpInt(f, 0), matches = sdpInt(f, 1), wins = sdpInt(f, 2)
  return {
    hero: heroNameOf(id, heroMap),
    matches,
    wins,
    winRate: matches > 0 ? Number(((wins / matches) * 100).toFixed(2)) : 0,
    skinId: sdpInt(f, 3),
    skinSource: sdpInt(f, 4)
  }
})
const decodeRecordDetail = (f, heroMap) => ({
  hero: heroNameOf(sdpInt(f, 3), heroMap),
  camp: sdpInt(f, 1), position: sdpInt(f, 2),
  equipment: ((sdpTag(f, 4) || {}).items || []).map((i) => sdpInt(fieldsOf(i), 0)),
  kills: sdpInt(f, 5), deaths: sdpInt(f, 6), assists: sdpInt(f, 7), money: sdpInt(f, 8),
  maxKillNoDeath: sdpInt(f, 9), monsters: sdpInt(f, 11), heroDamage: sdpInt(f, 12), towerDamage: sdpInt(f, 13)
})
const decodeBattleRecord = (nodes, heroMap) => (nodes || []).map((item) => {
  const f = fieldsOf(item), detail = decodeRecordDetail(fieldsOf(sdpTag(f, 7)), heroMap), winCamp = sdpInt(f, 3)
  return {
    battleId: sdpBig(f, 0), duration: sdpInt(f, 1), time: sdpInt(f, 2), winCamp,
    result: winCamp && detail.camp ? (winCamp === detail.camp ? 'WIN' : 'LOSE') : null,
    pvpType: sdpInt(f, 4), valid: sdpInt(f, 6) === 1, detail
  }
})
const decodeStatsByType = (field, heroMap) => {
  const out = {}
  for (const [k, v] of field.entries || []) {
    const f = v.fields || []
    out[String(sdpInt([k], 0))] = {
      matches: sdpInt(f, 0), wins: sdpInt(f, 1), mvp: sdpInt(f, 2),
      avg: { kda: sdpInt(f, 8) / 100, join: sdpInt(f, 9) / 100, money: sdpInt(f, 10), damage: sdpInt(f, 11), taken: sdpInt(f, 12), tower: sdpInt(f, 13) },
      heroes: decodeHeroDatas((sdpTag(f, 66) || {}).items, heroMap)
    }
  }
  return out
}
const decodeGameStats = (body, roleId, zoneId, heroMap) => {
  const nodes = decodeSdp(body)
  const fields = (sdpTag(nodes, 0) || { fields: [] }).fields || []
  const baseFields = (sdpTag(fields, 19) || {}).fields || []
  const total = sdpInt(fields, 0), wins = sdpInt(fields, 1)
  return {
    roleId: sdpInt(fields, 17) || roleId, zoneId: sdpInt(fields, 18) || zoneId, name: sdpText(baseFields, 2),
    totalMatches: total, wins, losses: Math.max(0, total - wins),
    winRate: total > 0 ? Number(((wins / total) * 100).toFixed(2)) : 0,
    weekMatches: sdpInt(fields, 2), weekScore: sdpInt(fields, 3), reputation: sdpInt(fields, 4),
    mvp: sdpInt(fields, 5), loseMvp: sdpInt(fields, 23),
    kills: { double: sdpInt(fields, 6), triple: sdpInt(fields, 7), quadra: sdpInt(fields, 8), penta: sdpInt(fields, 9), overFive: sdpInt(fields, 10) },
    avg: { kda: sdpInt(fields, 11) / 100, join: sdpInt(fields, 12) / 100, money: sdpInt(fields, 13), damage: sdpInt(fields, 14), taken: sdpInt(fields, 15), tower: sdpInt(fields, 16) },
    seasonMaxRankId: sdpInt(fields, 24), displayAchieveId: sdpInt(fields, 20), beSupport: sdpInt(fields, 25),
    profile: decodePlayerBase(baseFields),
    heroes: decodeHeroDatas((sdpTag(fields, 30) || {}).items, heroMap),
    matches: decodeBattleRecord((sdpTag(fields, 31) || {}).items, heroMap),
    byType: decodeStatsByType(sdpTag(fields, 32) || { entries: [] }, heroMap),
    raw: nodes
  }
}

class GameSession {
  constructor(link, auth, options = {}) { this.link = link; this.auth = auth; this.timeout = options.timeout || 12000; this.msgId = 0; this.seq = 0 }
  async request(op, expect, body, flag = 0, retries = 1) {
    let err = null
    for (let a = 0; a <= retries; a += 1) {
      if (this.link.closed) throw new MlbbError('game connection closed')
      try {
        this.msgId += 1; this.seq = (this.seq % 250) + 1
        this.link.writeRaw(zoneFrame(op, flag ? 1 : this.seq, this.msgId, body, flag))
        return await this.link.expect(expect, this.timeout)
      } catch (e) { err = e; if (this.link.closed || a >= retries) break; await sleep(600) }
    }
    throw err
  }
  async profile(roleId, zoneId) {
    const n = decodeSdp(Buffer.from(GAME_TEMPLATES.battleData, 'base64'))
    setSdp(n[0].fields, 0, roleId); setSdp(n[0].fields, 1, zoneId)
    const f = await this.request(GAME_OP_PROFILE, GAME_OP_PROFILE_SC, encodeSdp(n))
    const fields = decodeSdp(f.body)
    return { roleId, zoneId, ...decodePlayerBase((sdpTag(fields, 0) || { fields: [] }).fields || []), raw: fields }
  }
  async stats(roleId, zoneId, heroMap) {
    const map = heroMap || await loadHeroMap(false)
    const n = decodeSdp(Buffer.from(GAME_TEMPLATES.battleData, 'base64'))
    setSdp(n[0].fields, 0, roleId); setSdp(n[0].fields, 1, zoneId)
    const f = await this.request(GAME_OP_STATS, GAME_OP_STATS_SC, encodeSdp(n), 1, 2)
    return decodeGameStats(f.body, roleId, zoneId, map)
  }
  async history(roleId, zoneId) {
    const n = decodeSdp(Buffer.from(GAME_TEMPLATES.history, 'base64'))
    setSdp(n[0].fields, 0, zoneId); setSdp(n[0].fields, 1, roleId)
    const f = await this.request(GAME_OP_HISTORY, GAME_OP_HISTORY_SC, encodeSdp(n), 1, 1)
    const list = sdpTag((sdpTag(decodeSdp(f.body), 0) || { fields: [] }).fields || [], 2)
    return (!list || list.type !== SDP_LIST) ? [] : (list.items || []).map((i) => sdpBig(fieldsOf(i), 0))
  }
  close() { this.link.close() }
}

const gameAuth = async (options = {}) => {
  const timeout = options.timeout || 12000
  const link = new TcpLink(options.authHost || GAME_AUTH_HOST, options.authPort || GAME_AUTH_PORT, timeout, 'auth')
  await link.open()
  try {
    link.writeRaw(authWrap(Buffer.from(GAME_TEMPLATES.loginInner, 'base64')))
    const af = await link.expect(GAME_OP_AUTH_SC, timeout)
    const an = (sdpTag(decodeSdp(af.body), 0) || { fields: [] }).fields || []
    const account = sdpInt(an, 0), sessionKey = sdpText(an, 1), ip = sdpText(an, 7)
    const zf = sdpTag(an, 2), zoneId = zf?.fields ? sdpInt(zf.fields, 0) : options.zoneId
    if (!account || !sessionKey) throw new MlbbError('game auth did not return an account')
    const up = decodeSdp(Buffer.from(GAME_TEMPLATES.checkUpgrade, 'base64'))
    setSdp(up[0].fields, 1, sessionKey); setSdp(up[0].fields, 10, ip)
    link.writeRaw(authWrap(innerFrame(GAME_OP_UPGRADE, 1, encodeSdp(up))))
    const uf = await link.expect(GAME_OP_UPGRADE_SC, timeout)
    const server = sdpText((sdpTag(decodeSdp(uf.body), 0) || { fields: [] }).fields || [], 1)
    if (!server) throw new MlbbError('game auth did not return a zone address')
    const [host, p] = server.split(':')
    return { account, sessionKey, ip, zoneId, host, port: Number(p) || 30103 }
  } finally { link.close() }
}

export const closeSession = (session) => { if (session && typeof session.close === 'function') session.close() }

export const gameProfile = async (session, roleId, zoneId) => {
  if (!(session instanceof GameSession)) throw new MlbbError('pass a session from guestLogin()')
  const ids = parseTarget(roleId, zoneId)
  return session.profile(ids.roleId, ids.zoneId)
}

export const gameStats = async (session, roleId, zoneId) => {
  if (!(session instanceof GameSession)) throw new MlbbError('pass a session from guestLogin()')
  const ids = parseTarget(roleId, zoneId)
  const heroMap = await loadHeroMap(false)
  return session.stats(ids.roleId, ids.zoneId, heroMap)
}

export const gameHistory = async (session, roleId, zoneId) => {
  if (!(session instanceof GameSession)) throw new MlbbError('pass a session from guestLogin()')
  const ids = parseTarget(roleId, zoneId)
  return session.history(ids.roleId, ids.zoneId)
}

export const playerStats = async (roleId, zoneId, options = {}) => {
  const ids = parseTarget(roleId, zoneId)
  const [heroMap, session] = await Promise.all([loadHeroMap(false), guestLogin(options)])
  try { return await session.stats(ids.roleId, ids.zoneId, heroMap) } finally { session.close() }
}

export const fullStats = async (roleId, zoneId, options = {}) => {
  const ids = parseTarget(roleId, zoneId)
  const [heroMap, session] = await Promise.all([loadHeroMap(false), guestLogin(options)])
  try {
    const profile = await session.profile(ids.roleId, ids.zoneId)
    const stats = await session.stats(ids.roleId, ids.zoneId, heroMap)
    const history = await session.history(ids.roleId, ids.zoneId)
    return { profile, stats, history }
  } finally { session.close() }
}

/**
 * Stalk profil, statistik, dan riwayat pemain MLBB (dengan nama hero otomatis)
 * Mendukung: stalk("558519744 (3488)", opts), stalk({ roleId, zoneId }, opts), atau stalk(558519744, 3488, opts)
 */
export const stalk = async (target, zoneOrOptions = {}, maybeOptions = {}) => {
  let ids, options
  if (zoneOrOptions !== null && typeof zoneOrOptions === 'object') {
    ids = parseTarget(target); options = zoneOrOptions
  } else if (zoneOrOptions !== undefined && zoneOrOptions !== null) {
    ids = parseTarget(target, zoneOrOptions); options = maybeOptions || {}
  } else {
    ids = parseTarget(target); options = {}
  }

  const result = { roleId: ids.roleId, zoneId: ids.zoneId, profile: null, stats: null, history: null, errors: {} }
  const capture = async (key, task) => { try { result[key] = await task() } catch (e) { result.errors[key] = e.message } }

  let game = null
  try {
    const [heroMap, session] = await Promise.all([loadHeroMap(false), guestLogin(options)])
    game = session
    await capture('profile', () => game.profile(ids.roleId, ids.zoneId))
    if (game.link.closed) {
      result.errors.stats = 'game connection closed'
      result.errors.history = 'game connection closed'
      return result
    }
    await capture('stats', () => game.stats(ids.roleId, ids.zoneId, heroMap))
    if (!game.link.closed && options.includeHistory !== false) {
      await capture('history', () => game.history(ids.roleId, ids.zoneId))
    } else if (game.link.closed) {
      result.errors.history = 'game connection closed'
    }
  } catch (e) {
    for (const key of ['profile', 'stats', 'history']) if (!result.errors[key]) result.errors[key] = e.message
  } finally { if (game) game.close() }
  return result
}

export default {
  CREDIT,
  BUILTIN_HEROES,
  loadHeroMap,
  heroNameOf,
  guestLogin,
  closeSession,
  gameProfile,
  gameStats,
  gameHistory,
  playerStats,
  fullStats,
  stalk,
  rankOf,
  GAME_PROTOCOL_AVAILABLE,
  MlbbError
}