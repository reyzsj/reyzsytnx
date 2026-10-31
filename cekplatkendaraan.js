// ---------------------------------------------------------
// 🔥 Author   : Dhanz
// 🌸 Date     : 31 Oktober 2026
// 🍂 Function : Cek Plat Nomor & Samsat Base Module (ESM)
// 🌟 Channels : 
//  - https://whatsapp.com/channel/0029VbE3FdeGZNCjob8ShJ3l
// 
// 🍁 Notes :
// Mohon untuk tidak menghapus watermark ini. 
// Error fix sendiri.
// ---------------------------------------------------------

const PROJECT_ID = 'informasisamsat'
const FIRESTORE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const TIMEOUT = 30_000

const DEFAULT_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
}

const SAMSAT_DATABASE = {
  A: {
    provinsi: 'Provinsi Banten',
    default: { daerah: 'Kota Serang / Kab. Serang', samsat: 'Samsat Kota Serang', alamat: 'Jl. Jenderal Sudirman No. 1, Kota Serang' },
    sub: {
      A: { daerah: 'Kota Serang', samsat: 'Samsat Kota Serang', alamat: 'Jl. Jenderal Sudirman No. 1, Kota Serang' },
      E: { daerah: 'Kab. Serang', samsat: 'Samsat Cikande', alamat: 'Jl. Raya Serang - Jakarta KM 27, Cikande' },
      J: { daerah: 'Kab. Pandeglang', samsat: 'Samsat Pandeglang', alamat: 'Jl. Raya Labuan KM 2, Kab. Pandeglang' },
      N: { daerah: 'Kab. Lebak', samsat: 'Samsat Rangkasbitung', alamat: 'Jl. Jenderal Sudirman KM 3, Rangkasbitung' },
      O: { daerah: 'Kota Cilegon', samsat: 'Samsat Kota Cilegon', alamat: 'Jl. Raya Merak, Kota Cilegon' },
      V: { daerah: 'Kota Tangerang / Kab. Tangerang', samsat: 'Samsat Balaraja / Cikokol', alamat: 'Jl. Perintis Kemerdekaan, Kota Tangerang' }
    }
  },
  AA: {
    provinsi: 'Provinsi Jawa Tengah',
    default: { daerah: 'Kota Magelang / Kedu', samsat: 'Samsat Kota Magelang', alamat: 'Jl. Jenderal Sudirman No. 45, Kota Magelang' },
    sub: {
      A: { daerah: 'Kota Magelang', samsat: 'Samsat Kota Magelang', alamat: 'Jl. Jenderal Sudirman No. 45, Kota Magelang' },
      B: { daerah: 'Kab. Magelang', samsat: 'Samsat Mungkid', alamat: 'Jl. Mayor Kusen, Mungkid, Kab. Magelang' },
      C: { daerah: 'Kab. Purworejo', samsat: 'Samsat Purworejo', alamat: 'Jl. Mayjen Sutoyo No. 27, Purworejo' },
      D: { daerah: 'Kab. Kebumen', samsat: 'Samsat Kebumen', alamat: 'Jl. Tentara Pelajar No. 39, Kebumen' },
      E: { daerah: 'Kab. Temanggung', samsat: 'Samsat Temanggung', alamat: 'Jl. S. Kadar Maron, Temanggung' },
      F: { daerah: 'Kab. Wonosobo', samsat: 'Samsat Wonosobo', alamat: 'Jl. Mayjen Bambang Sugeng KM 3, Wonosobo' }
    }
  },
  AB: {
    provinsi: 'Provinsi DI Yogyakarta',
    default: { daerah: 'Kota Yogyakarta', samsat: 'Samsat Kota Yogyakarta', alamat: 'Jl. Tentara Pelajar No. 15, Kota Yogyakarta' },
    sub: {
      A: { daerah: 'Kota Yogyakarta', samsat: 'Samsat Kota Yogyakarta', alamat: 'Jl. Tentara Pelajar No. 15, Kota Yogyakarta' },
      B: { daerah: 'Kab. Bantul', samsat: 'Samsat Bantul', alamat: 'Jl. Urip Sumoharjo No. 8, Bantul' },
      C: { daerah: 'Kab. Kulon Progo', samsat: 'Samsat Kulon Progo', alamat: 'Jl. KH. Ahmad Dahlan, Wates' },
      D: { daerah: 'Kab. Gunungkidul', samsat: 'Samsat Gunungkidul', alamat: 'Jl. Brigjen Katamso No. 10, Wonosari' },
      E: { daerah: 'Kab. Sleman', samsat: 'Samsat Sleman', alamat: 'Jl. Magelang KM 12.5, Sleman' }
    }
  },
  AD: { provinsi: 'Provinsi Jawa Tengah', default: { daerah: 'Kota Surakarta (Solo)', samsat: 'Samsat Kota Surakarta', alamat: 'Jl. Prof. DR. Soeharso No. 17, Kota Surakarta' } },
  AE: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kota Madiun', samsat: 'Samsat Kota Madiun', alamat: 'Jl. Pahlawan No. 40, Kota Madiun' } },
  AG: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kota Kediri', samsat: 'Samsat Kota Kediri', alamat: 'Jl. Supersemar No. 82, Kota Kediri' } },
  B: {
    provinsi: 'Provinsi DKI Jakarta / Jabar / Banten',
    default: { daerah: 'DKI Jakarta (Jadetabek)', samsat: 'Samsat Polda Metro Jaya', alamat: 'Jl. Jenderal Sudirman Kav. 55, Jakarta Selatan' },
    sub: {
      B: { daerah: 'Jakarta Barat', samsat: 'Samsat Jakarta Barat', alamat: 'Jl. Daan Mogot KM 13, Cengkareng, Jakarta Barat' },
      P: { daerah: 'Jakarta Pusat', samsat: 'Samsat Jakarta Pusat', alamat: 'Jl. Gunung Sahari No. 13, Jakarta Pusat' },
      S: { daerah: 'Jakarta Selatan', samsat: 'Samsat Jakarta Selatan', alamat: 'Jl. Jenderal Sudirman Kav. 55, Jakarta Selatan' },
      T: { daerah: 'Jakarta Timur', samsat: 'Samsat Jakarta Timur', alamat: 'Jl. D.I. Panjaitan Kav. 55, Jakarta Timur' },
      U: { daerah: 'Jakarta Utara', samsat: 'Samsat Jakarta Utara', alamat: 'Jl. Gunung Sahari No. 13, Pademangan, Jakarta Utara' },
      E: { daerah: 'Kota Depok', samsat: 'Samsat Depok', alamat: 'Jl. Merdeka No. 2, Sukmajaya, Kota Depok' },
      K: { daerah: 'Kota Bekasi', samsat: 'Samsat Kota Bekasi', alamat: 'Jl. Ir. H. Juanda No. 302, Kota Bekasi' },
      F: { daerah: 'Kab. Bekasi', samsat: 'Samsat Kab. Bekasi (Cikarang)', alamat: 'Jl. Industri Pasir Gombong, Cikarang Utara' },
      C: { daerah: 'Kota Tangerang', samsat: 'Samsat Cikokol Tangerang', alamat: 'Jl. Perintis Kemerdekaan II, Kota Tangerang' },
      W: { daerah: 'Kota Tangerang Selatan', samsat: 'Samsat Ciputat / BSD', alamat: 'Jl. R.E. Martadinata, Ciputat, Tangerang Selatan' }
    }
  },
  BA: { provinsi: 'Provinsi Sumatera Barat', default: { daerah: 'Kota Padang', samsat: 'Samsat Kota Padang', alamat: 'Jl. Khatib Sulaiman No. 43, Kota Padang' } },
  BB: { provinsi: 'Provinsi Sumatera Utara', default: { daerah: 'Tapanuli / Kota Sibolga', samsat: 'Samsat Sibolga', alamat: 'Jl. Dr. F.L. Tobing, Kota Sibolga' } },
  BD: { provinsi: 'Provinsi Bengkulu', default: { daerah: 'Kota Bengkulu', samsat: 'Samsat Kota Bengkulu', alamat: 'Jl. Kapten P. Tendean, Kota Bengkulu' } },
  BE: { provinsi: 'Provinsi Lampung', default: { daerah: 'Kota Bandar Lampung', samsat: 'Samsat Rajabasa Bandar Lampung', alamat: 'Jl. Pramuka No. 88, Rajabasa, Bandar Lampung' } },
  BG: { provinsi: 'Provinsi Sumatera Selatan', default: { daerah: 'Kota Palembang', samsat: 'Samsat Kota Palembang', alamat: 'Jl. Kapten A. Rivai, Kota Palembang' } },
  BH: { provinsi: 'Provinsi Jambi', default: { daerah: 'Kota Jambi', samsat: 'Samsat Kota Jambi', alamat: 'Jl. Jenderal Basuki Rahmat, Kota Jambi' } },
  BK: { provinsi: 'Provinsi Sumatera Utara', default: { daerah: 'Kota Medan', samsat: 'Samsat Medan Utara / Selatan', alamat: 'Jl. Putri Hijau No. 14, Kota Medan' } },
  BL: { provinsi: 'Provinsi Aceh', default: { daerah: 'Kota Banda Aceh', samsat: 'Samsat Kota Banda Aceh', alamat: 'Jl. T. Nyak Arief, Kota Banda Aceh' } },
  BM: { provinsi: 'Provinsi Riau', default: { daerah: 'Kota Pekanbaru', samsat: 'Samsat Kota Pekanbaru', alamat: 'Jl. Gajah Mada No. 200, Kota Pekanbaru' } },
  BN: { provinsi: 'Provinsi Kepulauan Bangka Belitung', default: { daerah: 'Kota Pangkalpinang', samsat: 'Samsat Pangkalpinang', alamat: 'Jl. Pulau Bangka, Komplek Perkantoran Gubernur, Pangkalpinang' } },
  BP: { provinsi: 'Provinsi Kepulauan Riau', default: { daerah: 'Kota Batam / Tanjungpinang', samsat: 'Samsat Batam Centre', alamat: 'Jl. Engku Putri, Batam Centre, Kota Batam' } },
  D: {
    provinsi: 'Provinsi Jawa Barat',
    default: { daerah: 'Kota Bandung', samsat: 'Samsat Kota Bandung (Soekarno-Hatta)', alamat: 'Jl. Soekarno-Hatta No. 528, Kota Bandung' },
    sub: {
      A: { daerah: 'Kota Bandung', samsat: 'Samsat Kota Bandung', alamat: 'Jl. Soekarno-Hatta No. 528, Kota Bandung' },
      S: { daerah: 'Kota Cimahi', samsat: 'Samsat Kota Cimahi', alamat: 'Jl. Jend. H. Amir Machmud, Kota Cimahi' },
      U: { daerah: 'Kab. Bandung Barat', samsat: 'Samsat Padalarang', alamat: 'Jl. Raya Padalarang, Kab. Bandung Barat' },
      V: { daerah: 'Kab. Bandung', samsat: 'Samsat Soreang / Rancaekek', alamat: 'Jl. Raya Gading Tutuka, Soreang, Kab. Bandung' }
    }
  },
  DA: { provinsi: 'Provinsi Kalimantan Selatan', default: { daerah: 'Kota Banjarmasin', samsat: 'Samsat Banjarmasin', alamat: 'Jl. Jenderal Ahmad Yani KM 6, Banjarmasin' } },
  DB: { provinsi: 'Provinsi Sulawesi Utara', default: { daerah: 'Kota Manado', samsat: 'Samsat Kota Manado', alamat: 'Jl. 17 Agustus, Kota Manado' } },
  DC: { provinsi: 'Provinsi Sulawesi Barat', default: { daerah: 'Kab. Mamuju', samsat: 'Samsat Mamuju', alamat: 'Jl. Jenderal Sudirman, Mamuju' } },
  DD: { provinsi: 'Provinsi Sulawesi Selatan', default: { daerah: 'Kota Makassar', samsat: 'Samsat Kota Makassar', alamat: 'Jl. Andi Mappanyuki No. 79, Kota Makassar' } },
  DE: { provinsi: 'Provinsi Maluku', default: { daerah: 'Kota Ambon', samsat: 'Samsat Kota Ambon', alamat: 'Jl. Rijali, Kota Ambon' } },
  DG: { provinsi: 'Provinsi Maluku Utara', default: { daerah: 'Kota Ternate', samsat: 'Samsat Kota Ternate', alamat: 'Jl. Sultan M. Djabir Sjah, Kota Ternate' } },
  DH: { provinsi: 'Provinsi Nusa Tenggara Timur', default: { daerah: 'Kota Kupang', samsat: 'Samsat Kota Kupang', alamat: 'Jl. Polisi Militer No. 9, Kota Kupang' } },
  DK: { provinsi: 'Provinsi Bali', default: { daerah: 'Kota Denpasar', samsat: 'Samsat Kota Denpasar', alamat: 'Jl. Cok Agung Tresna, Renon, Kota Denpasar' } },
  DL: { provinsi: 'Provinsi Sulawesi Utara', default: { daerah: 'Kepulauan Sangihe / Talaud', samsat: 'Samsat Tahuna', alamat: 'Jl. Tatehe, Tahuna, Kep. Sangihe' } },
  DM: { provinsi: 'Provinsi Gorontalo', default: { daerah: 'Kota Gorontalo', samsat: 'Samsat Kota Gorontalo', alamat: 'Jl. Jenderal Sudirman, Kota Gorontalo' } },
  DN: { provinsi: 'Provinsi Sulawesi Tengah', default: { daerah: 'Kota Palu', samsat: 'Samsat Kota Palu', alamat: 'Jl. RA. Kartini No. 102, Kota Palu' } },
  DP: { provinsi: 'Provinsi Sulawesi Selatan', default: { daerah: 'Kota Parepare / Luwu / Palopo', samsat: 'Samsat Kota Parepare', alamat: 'Jl. Jenderal Sudirman, Kota Parepare' } },
  DR: { provinsi: 'Provinsi Nusa Tenggara Barat', default: { daerah: 'Kota Mataram (Pulau Lombok)', samsat: 'Samsat Kota Mataram', alamat: 'Jl. Langko No. 32, Kota Mataram' } },
  DT: { provinsi: 'Provinsi Sulawesi Tenggara', default: { daerah: 'Kota Kendari', samsat: 'Samsat Kota Kendari', alamat: 'Jl. Haluoleo, Kota Kendari' } },
  DW: { provinsi: 'Provinsi Sulawesi Selatan', default: { daerah: 'Kab. Bone / Wajo / Soppeng', samsat: 'Samsat Watampone', alamat: 'Jl. Jenderal Ahmad Yani, Watampone' } },
  E: {
    provinsi: 'Provinsi Jawa Barat',
    default: { daerah: 'Kota Cirebon', samsat: 'Samsat Kota Cirebon', alamat: 'Jl. Pemuda No. 44, Kota Cirebon' },
    sub: {
      A: { daerah: 'Kota Cirebon', samsat: 'Samsat Kota Cirebon', alamat: 'Jl. Pemuda No. 44, Kota Cirebon' },
      H: { daerah: 'Kab. Cirebon', samsat: 'Samsat Sumber', alamat: 'Jl. Sunan Drajat No. 17, Sumber, Kab. Cirebon' },
      P: { daerah: 'Kab. Indramayu', samsat: 'Samsat Indramayu', alamat: 'Jl. Gatot Subroto, Kab. Indramayu' },
      U: { daerah: 'Kab. Majalengka', samsat: 'Samsat Majalengka', alamat: 'Jl. KH. Abdul Halim, Kab. Majalengka' },
      Y: { daerah: 'Kab. Kuningan', samsat: 'Samsat Kuningan', alamat: 'Jl. RE. Martadinata, Kab. Kuningan' }
    }
  },
  EA: { provinsi: 'Provinsi Nusa Tenggara Barat', default: { daerah: 'Pulau Sumbawa / Kota Bima', samsat: 'Samsat Sumbawa Besar', alamat: 'Jl. Garuda No. 105, Sumbawa Besar' } },
  EB: { provinsi: 'Provinsi Nusa Tenggara Timur', default: { daerah: 'Pulau Flores / Ende / Maumere', samsat: 'Samsat Ende', alamat: 'Jl. Eltari, Ende' } },
  ED: { provinsi: 'Provinsi Nusa Tenggara Timur', default: { daerah: 'Pulau Sumba / Waingapu', samsat: 'Samsat Sumba Timur', alamat: 'Jl. Jenderal Soeharto, Waingapu' } },
  F: {
    provinsi: 'Provinsi Jawa Barat',
    default: { daerah: 'Kota Bogor', samsat: 'Samsat Kota Bogor', alamat: 'Jl. Ir. H. Juanda No. 4, Kota Bogor' },
    sub: {
      A: { daerah: 'Kota Bogor', samsat: 'Samsat Kota Bogor', alamat: 'Jl. Ir. H. Juanda No. 4, Kota Bogor' },
      F: { daerah: 'Kab. Bogor', samsat: 'Samsat Cibinong', alamat: 'Jl. Raya Jakarta - Bogor KM 50, Cibinong' },
      Q: { daerah: 'Kota Sukabumi', samsat: 'Samsat Kota Sukabumi', alamat: 'Jl. Jenderal Sudirman, Kota Sukabumi' },
      U: { daerah: 'Kab. Sukabumi', samsat: 'Samsat Cibadak / Pelabuhan Ratu', alamat: 'Jl. Raya Karangtengah, Cibadak, Kab. Sukabumi' },
      W: { daerah: 'Kab. Cianjur', samsat: 'Samsat Cianjur', alamat: 'Jl. Dr. Muwardi (By Pass), Kab. Cianjur' }
    }
  },
  G: { provinsi: 'Provinsi Jawa Tengah', default: { daerah: 'Kota Pekalongan', samsat: 'Samsat Kota Pekalongan', alamat: 'Jl. Gajah Mada Barat No. 11A, Kota Pekalongan' } },
  H: { provinsi: 'Provinsi Jawa Tengah', default: { daerah: 'Kota Semarang', samsat: 'Samsat Kota Semarang', alamat: 'Jl. Brigjen Sudiarto No. 500, Kota Semarang' } },
  K: { provinsi: 'Provinsi Jawa Tengah', default: { daerah: 'Kab. Pati / Kudus / Jepara', samsat: 'Samsat Pati', alamat: 'Jl. P. Sudirman No. 65, Pati' } },
  KB: { provinsi: 'Provinsi Kalimantan Barat', default: { daerah: 'Kota Pontianak', samsat: 'Samsat Kota Pontianak', alamat: 'Jl. Adisucipto KM 5.5, Kota Pontianak' } },
  KH: { provinsi: 'Provinsi Kalimantan Tengah', default: { daerah: 'Kota Palangka Raya', samsat: 'Samsat Palangka Raya', alamat: 'Jl. Tjilik Riwut KM 4.5, Palangka Raya' } },
  KT: { provinsi: 'Provinsi Kalimantan Timur', default: { daerah: 'Kota Samarinda / Balikpapan', samsat: 'Samsat Kota Samarinda', alamat: 'Jl. M. Yamin, Kota Samarinda' } },
  KU: { provinsi: 'Provinsi Kalimantan Utara', default: { daerah: 'Kota Tarakan / Tanjung Selor', samsat: 'Samsat Tarakan', alamat: 'Jl. Mulawarman, Kota Tarakan' } },
  L: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kota Surabaya', samsat: 'Samsat Surabaya Manyar', alamat: 'Jl. Manyar Kertoarjo No. 1, Kota Surabaya' } },
  M: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Pulau Madura', samsat: 'Samsat Pamekasan', alamat: 'Jl. Raya Pamekasan - Sumenep, Pamekasan' } },
  N: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kota Malang', samsat: 'Samsat Kota Malang', alamat: 'Jl. S. Supriadi No. 80, Kota Malang' } },
  P: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kab. Jember / Banyuwangi', samsat: 'Samsat Jember', alamat: 'Jl. Gajah Mada No. 244, Jember' } },
  PA: { provinsi: 'Provinsi Papua', default: { daerah: 'Kota Jayapura', samsat: 'Samsat Kota Jayapura', alamat: 'Jl. Raya Abepura, Kota Jayapura' } },
  PB: { provinsi: 'Provinsi Papua Barat', default: { daerah: 'Kab. Manokwari', samsat: 'Samsat Manokwari', alamat: 'Jl. Drs. Esau Sesa, Manokwari' } },
  PG: { provinsi: 'Provinsi Papua Pegunungan', default: { daerah: 'Kab. Jayawijaya (Wamena)', samsat: 'Samsat Wamena', alamat: 'Jl. Yos Sudarso, Wamena' } },
  PS: { provinsi: 'Provinsi Papua Selatan', default: { daerah: 'Kab. Merauke', samsat: 'Samsat Merauke', alamat: 'Jl. Raya Mandala, Merauke' } },
  PT: { provinsi: 'Provinsi Papua Tengah', default: { daerah: 'Kab. Nabire / Mimika', samsat: 'Samsat Nabire', alamat: 'Jl. Pepera, Nabire' } },
  PY: { provinsi: 'Provinsi Papua Barat Daya', default: { daerah: 'Kota Sorong', samsat: 'Samsat Kota Sorong', alamat: 'Jl. Jenderal Sudirman, Kota Sorong' } },
  R: { provinsi: 'Provinsi Jawa Tengah', default: { daerah: 'Kab. Banyumas (Purwokerto)', samsat: 'Samsat Purwokerto', alamat: 'Jl. Gerilya Timur, Purwokerto' } },
  S: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kab. Bojonegoro / Mojokerto / Tuban', samsat: 'Samsat Bojonegoro', alamat: 'Jl. Teuku Umar No. 1, Bojonegoro' } },
  T: { provinsi: 'Provinsi Jawa Barat', default: { daerah: 'Kab. Karawang / Purwakarta / Subang', samsat: 'Samsat Karawang', alamat: 'Jl. Jenderal Ahmad Yani (By Pass), Karawang' } },
  W: { provinsi: 'Provinsi Jawa Timur', default: { daerah: 'Kab. Sidoarjo / Gresik', samsat: 'Samsat Sidoarjo', alamat: 'Jl. Cemengkalang No. 12, Sidoarjo' } },
  Z: {
    provinsi: 'Provinsi Jawa Barat',
    default: { daerah: 'Kota Tasikmalaya', samsat: 'Samsat Kota Tasikmalaya', alamat: 'Jl. Ir. H. Juanda (By Pass) Kota Tasikmalaya' },
    sub: {
      A: { daerah: 'Kab. Sumedang', samsat: 'Samsat Sumedang', alamat: 'Jl. Prabu Gajah Agung No. 19, Kab. Sumedang' },
      B: { daerah: 'Kab. Sumedang', samsat: 'Samsat Sumedang', alamat: 'Jl. Prabu Gajah Agung No. 19, Kab. Sumedang' },
      C: { daerah: 'Kab. Sumedang', samsat: 'Samsat Sumedang', alamat: 'Jl. Prabu Gajah Agung No. 19, Kab. Sumedang' },
      D: { daerah: 'Kab. Garut', samsat: 'Samsat Garut', alamat: 'Jl. Suherman No. 64, Tarogong Kidul, Kab. Garut' },
      E: { daerah: 'Kab. Garut', samsat: 'Samsat Garut', alamat: 'Jl. Suherman No. 64, Tarogong Kidul, Kab. Garut' },
      F: { daerah: 'Kab. Garut', samsat: 'Samsat Garut', alamat: 'Jl. Suherman No. 64, Tarogong Kidul, Kab. Garut' },
      G: { daerah: 'Kab. Garut', samsat: 'Samsat Garut', alamat: 'Jl. Suherman No. 64, Tarogong Kidul, Kab. Garut' },
      H: { daerah: 'Kota Tasikmalaya', samsat: 'Samsat Kota Tasikmalaya', alamat: 'Jl. Ir. H. Juanda (By Pass) Kota Tasikmalaya' },
      I: { daerah: 'Kota Tasikmalaya', samsat: 'Samsat Kota Tasikmalaya', alamat: 'Jl. Ir. H. Juanda (By Pass) Kota Tasikmalaya' },
      J: { daerah: 'Kota Tasikmalaya', samsat: 'Samsat Kota Tasikmalaya', alamat: 'Jl. Ir. H. Juanda (By Pass) Kota Tasikmalaya' },
      K: { daerah: 'Kota Tasikmalaya', samsat: 'Samsat Kota Tasikmalaya', alamat: 'Jl. Ir. H. Juanda (By Pass) Kota Tasikmalaya' },
      L: { daerah: 'Kab. Tasikmalaya', samsat: 'Samsat Kabupaten Tasikmalaya', alamat: 'Jl. Raya Singaparna, Cintaraja, Kab. Tasikmalaya' },
      M: { daerah: 'Kab. Tasikmalaya', samsat: 'Samsat Kabupaten Tasikmalaya', alamat: 'Jl. Raya Singaparna, Cintaraja, Kab. Tasikmalaya' },
      N: { daerah: 'Kab. Tasikmalaya', samsat: 'Samsat Kabupaten Tasikmalaya', alamat: 'Jl. Raya Singaparna, Cintaraja, Kab. Tasikmalaya' },
      P: { daerah: 'Kab. Tasikmalaya', samsat: 'Samsat Kabupaten Tasikmalaya', alamat: 'Jl. Raya Singaparna, Cintaraja, Kab. Tasikmalaya' },
      T: { daerah: 'Kab. Ciamis', samsat: 'Samsat Ciamis', alamat: 'Jl. Jenderal Sudirman No. 201, Kab. Ciamis' },
      U: { daerah: 'Kab. Ciamis', samsat: 'Samsat Ciamis', alamat: 'Jl. Jenderal Sudirman No. 201, Kab. Ciamis' },
      V: { daerah: 'Kab. Ciamis', samsat: 'Samsat Ciamis', alamat: 'Jl. Jenderal Sudirman No. 201, Kab. Ciamis' },
      W: { daerah: 'Kota Banjar', samsat: 'Samsat Kota Banjar', alamat: 'Jl. Brigjen M. Isa SH, Purwaharja, Kota Banjar' },
      X: { daerah: 'Kota Banjar', samsat: 'Samsat Kota Banjar', alamat: 'Jl. Brigjen M. Isa SH, Purwaharja, Kota Banjar' },
      Y: { daerah: 'Kab. Pangandaran', samsat: 'Samsat Pangandaran', alamat: 'Jl. Raya Parigi - Cigugur, Kab. Pangandaran' }
    }
  }
}

function parsePlateInput(depanOrFull, angka = '', belakang = '') {
  if (!angka && !belakang) {
    const clean = String(depanOrFull).trim().toUpperCase().replace(/\s+/g, ' ')
    const match = clean.match(/^([A-Z]{1,2})\s*(\d{1,4})?\s*([A-Z]{1,3})?$/)
    if (match) {
      return {
        depan: match[1],
        angka: match[2] || '',
        belakang: match[3] || ''
      }
    }
  }

  return {
    depan: String(depanOrFull).trim().toUpperCase(),
    angka: String(angka || '').trim(),
    belakang: String(belakang || '').trim().toUpperCase()
  }
}

/**
 * Mengambil informasi Samsat dan data plat nomor
 * @param {string} depanOrFull - Kode depan atau plat lengkap (cth: B 1234 XYZ)
 * @param {string} [angka=''] - Nomor angka plat
 * @param {string} [belakang=''] - Huruf seri belakang plat
 */
export async function getPlatInfo(depanOrFull, angka = '', belakang = '') {
  const { depan, angka: noAngka, belakang: seriBelakang } = parsePlateInput(depanOrFull, angka, belakang)

  if (!SAMSAT_DATABASE[depan]) {
    throw new Error(`Kode depan "${depan}" tidak ditemukan dalam database wilayah!`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  let firestoreData = null

  try {
    const targetUrl = `${FIRESTORE_REST_URL}/plat_${depan.toLowerCase()}_${noAngka}`
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    })

    if (res.ok) {
      const json = await res.json()
      firestoreData = json.fields || null
    }
  } catch (_) {
    // Fallback jika tidak ditemukan di firestore
  } finally {
    clearTimeout(timer)
  }

  const regionInfo = SAMSAT_DATABASE[depan]
  let detailInfo = regionInfo.default

  if (regionInfo.sub && seriBelakang) {
    const firstChar = seriBelakang.charAt(0)
    if (regionInfo.sub[firstChar]) {
      detailInfo = regionInfo.sub[firstChar]
    }
  }

  return {
    status: true,
    plat_nomor: `${depan} ${noAngka} ${seriBelakang}`.trim(),
    provinsi: regionInfo.provinsi,
    daerah: detailInfo.daerah,
    samsat: detailInfo.samsat,
    alamat: detailInfo.alamat,
    firestore_data: firestoreData
  }
}

export default {
  getPlatInfo
}
