# Backend Laravel API Setup Guide

Panduan untuk setup backend Laravel yang mendukung aplikasi FoodPOS React.

## Langkah Setup

### 1. Buat Project Laravel Baru (di folder terpisah)

```bash
cd d:\!freelance\sidequest\81 - react web POS makanan\sc
laravel new api_pos_makanan
cd api_pos_makanan
```

### 2. Konfigurasi Database

Edit file `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pos_makanan
DB_USERNAME=root
DB_PASSWORD=
```

### 3. Install Sanctum untuk API Authentication

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 4. Konfigurasi CORS

Edit `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:3000'],
'supports_credentials' => true,
```

### 5. Buat Models, Controllers, dan Routes

#### User Model (app/Models/User.php)
Pastikan model User menggunakan HasApiTokens:
```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

### 6. Routes API

Buat file `routes/api.php` dengan routes berikut:
- POST /api/login
- POST /api/logout
- GET /api/categories
- POST /api/categories
- PUT /api/categories/{id}
- DELETE /api/categories/{id}
- GET /api/foods
- POST /api/foods
- PUT /api/foods/{id}
- DELETE /api/foods/{id}
- GET /api/transactions
- POST /api/transactions
- GET /api/transactions/{id}
- GET /api/history/transactions
- GET /api/dashboard/summary
- GET /api/dashboard/top-foods

### 7. Jalankan Server

```bash
php artisan serve --port=8000
```

## Struktur Database (Sudah dibuat)

Database `pos_makanan` sudah memiliki:
- Tabel: users, categories, foods, transactions, transaction_details
- Views: v_makanan_terlaris, v_dashboard_summary, v_history_transaksi
- Procedure: generate_kode_transaksi
- Trigger: update stok otomatis

## Testing API

Gunakan Postman atau REST client untuk test:
```
POST http://localhost:8000/api/login
Content-Type: application/json

{
    "username": "admin",
    "password": "password"
}
```
