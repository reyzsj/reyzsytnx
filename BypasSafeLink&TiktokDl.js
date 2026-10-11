/**
 * ============================================================================
 * 🌸 MODULE DOCUMENTATION & API SPECIFICATION
 * ============================================================================
 * 
 * 🛠️ Module Name  : SFL Link Skipper & TikWM TikTok Downloader (ESM)
 * 👤 Author       : Dhanz (https://t.me/ktzckmy)
 * 📅 Date         : 09 Oktober 2026
 * 📜 License      : Open-Source / Educational Purpose Only
 * 📢 Channel      : https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
 * 
 * ----------------------------------------------------------------------------
 * 📌 FUNCTION SPECIFICATION
 * ----------------------------------------------------------------------------
 *  1. skipSfl(sflUrl)
 *     - Input Param  : {string} sflUrl - URL SFL valid (contoh: https://sfl.gl/xxx)
 *     - Return Type  : Promise<Object>
 * 
 *  2. downloadTikWM(tiktokUrl)
 *     - Input Param  : {string} tiktokUrl - URL TikTok valid (vt.tiktok.com / www.tiktok.com)
 *     - Return Type  : Promise<Object>
 * 
 * ----------------------------------------------------------------------------
 * 📥 JSON RESPONSE STRUCTURE
 * ----------------------------------------------------------------------------
 * 
 * 1. skipSfl() Response:
 * {
 *   "ok": true,
 *   "author": "Dhanz (@ktzckmy)",
 *   "result": { ... } // Hasil dekode / destination URL dari SFL
 * }
 * 
 * 2. downloadTikWM() Response:
 * {
 *   "ok": true,
 *   "author": "Dhanz (@ktzckmy)",
 *   "title": "Deskripsi Video TikTok",
 *   "cover": "https://tikwm.com/media/cover/...",
 *   "authorInfo": {
 *     "username": "creator_username",
 *     "nickname": "Creator Nickname"
 *   },
 *   "downloads": {
 *     "mp4": "https://tikwm.com/video/media/...",
 *     "mp4hd": "https://tikwm.com/video/media/...",
 *     "mp3": "https://tikwm.com/video/music/..."
 *   }
 * }
 * 
 * ----------------------------------------------------------------------------
 * 💡 INTEGRATION EXAMPLES
 * ----------------------------------------------------------------------------
 * 
 * 1. Penggunaan Dasar (Import Modul ESM):
 * ----------------------------------------------------------------------------
 * import { skipSfl, downloadTikWM } from './tools.js'
 * 
 * // Contoh Skip SFL
 * const sflResult = await skipSfl('https://sfl.gl/EfEd7fY')
 * console.log('Skip SFL:', sflResult)
 * 
 * // Contoh TikTok Downloader
 * const ttResult = await downloadTikWM('https://vt.tiktok.com/ZSbtUh49v/')
 * if (ttResult.ok) {
 *     console.log('Video MP4:', ttResult.downloads.mp4)
 *     console.log('Audio MP3:', ttResult.downloads.mp3)
 * }
 * 
 * ----------------------------------------------------------------------------
 * 2. Integrasi Express.js REST API Server:
 * ----------------------------------------------------------------------------
 * import express from 'express'
 * import { skipSfl, downloadTikWM } from './tools.js'
 * 
 * const app = express()
 * app.use(express.json())
 * 
 * // Endpoint Skip SFL
 * app.get('/api/skiplink/sfl', async (req, res) => {
 *     const { url } = req.query
 *     if (!url) {
 *         return res.status(400).json({ ok: false, author: 'Dhanz (@ktzckmy)', message: 'Query url wajib diisi!' })
 *     }
 *     const result = await skipSfl(url)
 *     return res.status(result.ok ? 200 : 500).json(result)
 * })
 * 
 * // Endpoint TikTok Downloader
 * app.get('/api/download/tiktok', async (req, res) => {
 *     const { url } = req.query
 *     if (!url) {
 *         return res.status(400).json({ ok: false, author: 'Dhanz (@ktzckmy)', message: 'Query url wajib diisi!' })
 *     }
 *     const result = await downloadTikWM(url)
 *     return res.status(result.ok ? 200 : 500).json(result)
 * })
 * 
 * app.listen(3000, () => console.log('API Server berjalan di http://localhost:3000'))
 * 
 * ============================================================================
 */
