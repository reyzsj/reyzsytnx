# 🚀 Node.js Native Fetch Scraper & API Toolkit

Kumpulan modul scraper dan otomatisasi API berbasis **Node.js ESM** yang dibangun menggunakan **Native Fetch (Zero Dependency)**. Dirancang untuk performa tinggi, efisiensi resource, dan ketahanan eksekusi di lingkungan Termux maupun VPS.

---

## ✨ Fitur Utama

- ⚡ **Zero Dependency:** Murni memanfaatkan modul standar bawaan Node.js (`fetch`, `readline`, `node:util`, `timers/promises`).
- 🛡️ **Robust Error Handling:** Dilengkapi mekanisme *auto-retry*, *exponential backoff*, *jitter*, dan pembacaan header `Retry-After`.
- 🎭 **Rotasi User-Agent:** Meminimalkan risiko pemblokiran IP dan deteksi bot pada target endpoint.

---

## ⚙️ Persyaratan Sistem

- **Node.js** v18.0.0 atau yang lebih baru.
- **Termux** / **Linux VPS** / **Windows CLI**.

---

## 🚀 Cara Penggunaan

### 1. Eksekusi CLI Interaktif
Jalankan file script secara langsung dari terminal:

```bash
node <nama_script>.js
