# WhatsApp Web API

Sebuah aplikasi Node.js yang menyediakan API untuk WhatsApp Web dengan antarmuka pengguna web yang interaktif. Aplikasi ini memungkinkan Anda untuk menghubungkan WhatsApp dengan aplikasi Node.js dan mengirim/menerima pesan melalui API.

## Fitur

- Antarmuka web yang responsif dan modern
- Otentikasi WhatsApp melalui kode QR
- Mengirim pesan WhatsApp melalui API
- Menerima notifikasi pesan masuk melalui webhook
- Manajemen sesi WhatsApp (mulai/hapus)
- Komunikasi real-time menggunakan Socket.IO

## Endpoint API

- `GET /api/status` - Memeriksa status koneksi WhatsApp
- `GET /api/qr` - Mendapatkan kode QR untuk otentikasi
- `POST /api/session/start` - Memulai sesi baru
- `POST /api/session/delete` - Menghapus sesi yang aktif
- `POST /api/webhook` - Mengatur URL webhook
- `GET /api/webhook` - Mendapatkan URL webhook saat ini
- `POST /api/send` - Mengirim pesan WhatsApp

## Persyaratan

- Node.js (versi 14 atau lebih baru)
- NPM atau Yarn
- Browser modern

## Instalasi

1. Clone repositori ini atau download sebagai ZIP
2. Buka terminal dan navigasi ke direktori proyek
3. Instal dependensi dengan menjalankan:

```bash
npm install
```

4. Jalankan aplikasi:

```bash
npm start
```

5. Buka browser dan akses `http://localhost:3000`

## Penggunaan

### Memulai Sesi WhatsApp

1. Buka aplikasi web di browser
2. Klik tombol "Start Session"
3. Pindai kode QR yang muncul dengan aplikasi WhatsApp di ponsel Anda
4. Setelah terhubung, status akan berubah menjadi "Connected"

### Mengirim Pesan

1. Navigasi ke tab "Send Message"
2. Masukkan nomor telepon penerima (termasuk kode negara tanpa + atau 00)
3. Ketik pesan Anda
4. Klik tombol "Send Message"

### Mengatur Webhook

1. Navigasi ke tab "Webhook"
2. Masukkan URL webhook Anda
3. Klik tombol "Save Webhook"
4. Semua pesan masuk akan diteruskan ke URL webhook yang ditentukan

## Pengembangan

Untuk pengembangan, Anda dapat menjalankan aplikasi dengan mode pengembangan:

```bash
npm run dev
```

Ini akan memulai server dengan nodemon yang akan memantau perubahan file dan memulai ulang server secara otomatis.

## Teknologi yang Digunakan

- Node.js dan Express.js untuk backend
- Socket.IO untuk komunikasi real-time
- whatsapp-web.js untuk integrasi WhatsApp
- Bootstrap 5 untuk UI
- QRCode.js untuk pembuatan kode QR

## Lisensi

Proyek ini dilisensikan di bawah lisensi ISC.

## Catatan

Aplikasi ini menggunakan whatsapp-web.js yang merupakan implementasi tidak resmi dari WhatsApp Web. Gunakan dengan bijak dan sesuai dengan Ketentuan Layanan WhatsApp.