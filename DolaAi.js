// ---------------------------------------------------------
// 🔥 Author   : Dhanz (https://t.me/ktzckmy)
// 🌸 Date     : 11 Oktober 2026
// 🍂 Function : Dola AI Base Module (Puppeteer Stealth / ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Membiarkan credit adalah bentuk apresiasi terkecil untuk developer.
// Error fix sendiri.
// ---------------------------------------------------------

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

function getChromiumPath() {
  const termuxPath = '/data/data/com.termux/files/usr/bin/chromium'
  if (existsSync(termuxPath)) return termuxPath

  try {
    const path = execSync('which chromium || which chromium-browser || which google-chrome', {
      stdio: ['pipe', 'pipe', 'ignore']
    }).toString().trim()
    if (path) return path
  } catch (_) {}

  return null
}

/**
 * Kirim pertanyaan dan ekstrak balasan dari Dola AI Web Chat
 * @param {string} prompt - Pertanyaan / prompt
 * @param {Object} [options={}] - Opsi opsional (proxy, headless, timeout, dll)
 */
export async function dolaChat(prompt, options = {}) {
  const {
    proxy = null,
    headless = 'new',
    timeout = 35000,
    streamTimeout = 45000,
    blockResources = true,
    executablePath = null
  } = options

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { status: false, prompt: prompt || '', error: 'Prompt pertanyaan tidak boleh kosong.' }
  }

  const autoExecutablePath = executablePath || getChromiumPath()
  if (!autoExecutablePath) {
    return { status: false, prompt: prompt.trim(), error: 'Chromium tidak ditemukan! Silakan install Chromium terlebih dahulu.' }
  }

  let browser = null
  try {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ]

    if (blockResources) launchArgs.push('--blink-settings=imagesEnabled=false')

    let proxyAuth = null
    if (proxy) {
      let proxyServer = ''
      if (typeof proxy === 'string') {
        try {
          const parsed = new URL(proxy.includes('://') ? proxy : `http://${proxy}`)
          proxyServer = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
          if (parsed.username || parsed.password) {
            proxyAuth = { username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password) }
          }
        } catch {
          proxyServer = proxy
        }
      } else if (typeof proxy === 'object') {
        proxyServer = proxy.server
        if (proxy.username || proxy.password) {
          proxyAuth = { username: proxy.username, password: proxy.password }
        }
      }
      if (proxyServer) launchArgs.push(`--proxy-server=${proxyServer}`)
    }

    browser = await puppeteer.launch({
      headless,
      executablePath: autoExecutablePath,
      args: launchArgs
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })

    if (proxyAuth) await page.authenticate(proxyAuth)

    await page.goto('https://www.dola.com/chat/', { waitUntil: 'domcontentloaded', timeout })

    if (page.url().includes('/security/region-restricted')) {
      throw new Error('Akses diblokir oleh dola.com karena pembatasan wilayah (/security/region-restricted).')
    }

    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const okBtn = btns.find((b) => b.innerText?.trim() === 'OK')
        if (okBtn) okBtn.click()
      })
    } catch (_) {}

    const inputSelector = '.ProseMirror, div[contenteditable="true"], textarea'
    await page.waitForSelector(inputSelector, { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1000))
    await page.click(inputSelector)

    await page.evaluate((selector) => {
      const el = document.querySelector(selector)
      if (el) el.focus()
    }, inputSelector)

    await page.keyboard.type(prompt.trim(), { delay: 10 })
    await new Promise((r) => setTimeout(r, 400))

    const submitted = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const sendBtn = btns.find((b) =>
        b.className.includes('send-msg') ||
        b.className.includes('send') ||
        b.getAttribute('aria-label')?.toLowerCase()?.includes('send')
      )
      if (sendBtn && !sendBtn.disabled && !sendBtn.className.includes('disabled')) {
        sendBtn.click()
        return true
      }
      return false
    })

    if (!submitted) await page.keyboard.press('Enter')

    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 800))
      let confirmed = false
      try {
        confirmed = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'))
          const confirmBtn = btns.find((b) => b.innerText?.trim() === 'Confirm')
          if (confirmBtn) {
            confirmBtn.click()
            return true
          }
          return false
        })
      } catch (_) {}
      if (confirmed) break
    }

    let lastText = ''
    let stableCount = 0
    const startTime = Date.now()

    while (Date.now() - startTime < streamTimeout) {
      await new Promise((r) => setTimeout(r, 1200))
      let extracted = ''

      try {
        extracted = await page.evaluate(() => {
          const botContainers = Array.from(document.querySelectorAll('[class*="grid-cols-[minmax"]'))
          if (botContainers.length > 0) {
            const latest = botContainers[botContainers.length - 1]
            const answerBlock = latest.querySelector('[data-plugin-identifier*="10000"]')
            if (answerBlock && answerBlock.innerText?.trim()) return answerBlock.innerText.trim()

            const clone = latest.cloneNode(true)
            clone.querySelectorAll('button, svg, [role="toolbar"], [data-plugin-identifier*="search_query"]').forEach((el) => el.remove())
            let clean = clone.innerText?.trim() || ''
            return clean.replace(/^(Searching the web\.\.\.|Searched for [^\n]+\n?)/i, '').trim()
          }

          const markdownEls = Array.from(document.querySelectorAll('[class*="markdown"], [class*="prose"]'))
          if (markdownEls.length > 0) return markdownEls[markdownEls.length - 1].innerText?.trim() || ''
          return ''
        })
      } catch (e) {
        if (e.message?.includes('Execution context was destroyed') || e.message?.includes('Cannot find context') || e.message?.includes('Target closed')) {
          continue
        }
        throw e
      }

      if (extracted && extracted.length > 0) {
        if (extracted === lastText) {
          stableCount++
          if (stableCount >= 2) break
        } else {
          stableCount = 0
          lastText = extracted
        }
      }
    }

    if (!lastText) throw new Error('Gagal mendapatkan balasan dari Dola AI.')

    return { status: true, prompt: prompt.trim(), result: lastText }
  } catch (error) {
    return { status: false, prompt: prompt ? prompt.trim() : '', error: error.message || String(error) }
  } finally {
    if (browser) {
      try { await browser.close() } catch (_) {}
    }
  }
}

export default {
  dolaChat
}
