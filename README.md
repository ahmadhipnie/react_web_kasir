# FoodPOS - Sistem Point of Sale Makanan

Aplikasi Point of Sale (POS) modern untuk bisnis makanan menggunakan React + Vite.

## Fitur

- 🔐 **Login System** - Autentikasi pengguna
- 📊 **Dashboard** - Ringkasan penjualan dan statistik
- 🍔 **Manajemen Menu** - CRUD data makanan dengan gambar
- 📂 **Kategori** - Pengelolaan kategori menu
- 🛒 **Transaksi** - Proses penjualan yang mudah dan cepat
- 📜 **History** - Riwayat transaksi dengan fitur export Excel

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Custom CSS dengan CSS Variables
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: React Icons
- **Date Handling**: date-fns
- **Export**: xlsx + file-saver

## Prasyarat

- Node.js 18+
- npm atau yarn
- Backend API Laravel (terpisah)
- MySQL Database dengan struktur pos_makanan

## Instalasi

1. Clone repository
```bash
git clone https://github.com/ahmadhipnie/react_web_kasir.git
cd react_web_kasir
```

2. Install dependencies
```bash
npm install
```

3. Setup environment
```bash
cp .env.example .env
```

4. Edit `.env` sesuai konfigurasi backend
```env
VITE_API_URL=http://localhost:8000/api
```

5. Jalankan development server
```bash
npm run dev
```

6. Buka browser di `http://localhost:3000`

## Scripts

- `npm run dev` - Menjalankan development server
- `npm run build` - Build untuk production
- `npm run preview` - Preview hasil build

## Struktur Folder

```
src/
├── components/        # Komponen reusable
│   └── common/       # Komponen umum (Modal, Loading, dll)
├── config/           # Konfigurasi (API endpoints)
├── context/          # React Context (Auth)
├── layouts/          # Layout komponen
├── pages/            # Halaman aplikasi
├── services/         # API services
├── styles/           # CSS styles
└── utils/            # Helper functions
```

## Database

Aplikasi ini membutuhkan backend Laravel dengan database MySQL.
Struktur tabel:
- `users` - Data pengguna
- `categories` - Kategori menu
- `foods` - Data makanan
- `transactions` - Transaksi penjualan
- `transaction_details` - Detail item transaksi

Views yang dibutuhkan:
- `v_makanan_terlaris` - Menu terlaris
- `v_dashboard_summary` - Ringkasan dashboard
- `v_history_transaksi` - History transaksi

## License

MIT License
