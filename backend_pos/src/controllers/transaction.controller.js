const db = require('../config/database');

// In-memory lock to serialize code generation (prevents race condition)
let isGeneratingCode = false;
const pendingRequests = [];

// Generate unique transaction code directly in backend (no stored procedure needed)
const generateKodeTransaksi = async (connection) => {
  // Wait for lock
  if (isGeneratingCode) {
    await new Promise((resolve) => {
      pendingRequests.push(resolve);
    });
  }
  
  isGeneratingCode = true;
  
  try {
    const tanggal = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Get max number for today with FOR UPDATE to lock the row during read
    const [rows] = await connection.execute(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(kode_transaksi, 12) AS UNSIGNED)), 0) + 1 as next_number
       FROM transactions 
       WHERE kode_transaksi LIKE ?
       FOR UPDATE`,
      [`TRX${tanggal}%`]
    );
    
    const nextNumber = rows[0].next_number;
    const kode_transaksi = `TRX${tanggal}${String(nextNumber).padStart(4, '0')}`;
    
    return kode_transaksi;
  } finally {
    isGeneratingCode = false;
    // Release next waiting request
    if (pendingRequests.length > 0) {
      const resolve = pendingRequests.shift();
      resolve();
    }
  }
};

exports.create = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const {
      items,
      uang_diterima,
      metode_pembayaran = 'tunai',
      subtotal: clientSubtotal,
      pajak: clientPajak,
      diskon: clientDiskon,
      total_bayar: clientTotalBayar,
      uang_kembalian: clientKembalian,
      total_item: clientTotalItem,
      catatan
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items transaksi harus diisi'
      });
    }

    // allow uang_diterima to be 0 for non-tunai
    if (metode_pembayaran === 'tunai' && (uang_diterima === undefined || uang_diterima === null)) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah uang diterima harus diisi'
      });
    }

    // Determine user id (from auth middleware or client fallback)
    const userId = req.user?.id || req.body.user_id || null;

    // Calculate totals if not provided by client
    let total_item = 0;
    let subtotal = 0;
    for (const item of items) {
      const quantity = parseInt(item.qty || item.jumlah || 0);
      const price = parseInt(item.harga || item.harga_satuan || 0);
      total_item += quantity;
      subtotal += price * quantity;
    }

    if (clientSubtotal !== undefined) subtotal = Number(clientSubtotal);
    const pajak = clientPajak !== undefined ? Number(clientPajak) : 0;
    const diskon = clientDiskon !== undefined ? Number(clientDiskon) : 0;
    const total_bayar = clientTotalBayar !== undefined ? Number(clientTotalBayar) : subtotal + pajak - diskon;
    const uang_diterima_final = uang_diterima !== undefined ? Number(uang_diterima) : total_bayar;
    const uang_kembalian = clientKembalian !== undefined ? Number(clientKembalian) : (uang_diterima_final - total_bayar);

    if (metode_pembayaran === 'tunai' && uang_kembalian < 0) {
      return res.status(400).json({
        success: false,
        message: 'Pembayaran kurang dari total'
      });
    }

    await connection.beginTransaction();

    // Generate transaction code (no stored procedure, direct in backend)
    const kode_transaksi = await generateKodeTransaksi(connection);
    console.log('Generated kode_transaksi:', kode_transaksi);

    // Insert transaction
    const [transResult] = await connection.execute(
      `INSERT INTO transactions 
       (kode_transaksi, tanggal_transaksi, user_id, total_item, subtotal, pajak, diskon, 
        total_bayar, uang_diterima, uang_kembalian, metode_pembayaran, catatan, status) 
       VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'selesai')`,
      [kode_transaksi, userId, total_item, subtotal, pajak, diskon, 
       total_bayar, uang_diterima_final, uang_kembalian, metode_pembayaran, catatan || null]
    );

    const transactionId = transResult.insertId;

    // Insert transaction details
    for (const item of items) {
      const quantity = parseInt(item.qty || item.jumlah || 0);
      const price = parseInt(item.harga || item.harga_satuan || 0);
      const foodName = item.nama_makanan || item.nama || '';
      await connection.execute(
        `INSERT INTO transaction_details 
         (transaction_id, food_id, nama_makanan, harga_satuan, jumlah, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, item.food_id, foodName, price, quantity, price * quantity]
      );
    }

    await connection.commit();

    // Get complete transaction data
    const [transaction] = await connection.execute(
      `SELECT t.*, u.nama_lengkap as user_nama, u.nama_lengkap as kasir 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.id = ?`,
      [transactionId]
    );

    const [details] = await connection.execute(
      `SELECT td.*, f.nama_makanan as nama_makanan 
       FROM transaction_details td 
       LEFT JOIN foods f ON td.food_id = f.id 
       WHERE td.transaction_id = ?`,
      [transactionId]
    );

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil',
      data: {
        ...transaction[0],
        kasir: transaction[0].kasir || transaction[0].user_nama,
        details
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat transaksi'
    });
  } finally {
    connection.release();
  }
};

exports.getAll = async (req, res) => {
  try {
    const { start_date, end_date, search, status } = req.query;
    
    let query = `
      SELECT t.*, u.nama_lengkap as user_nama, u.nama_lengkap as kasir,
             t.total_item as item_count
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(t.tanggal_transaksi) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.tanggal_transaksi) <= ?';
      params.push(end_date);
    }

    if (search) {
      query += ' AND t.kode_transaksi LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.tanggal_transaksi DESC';

    const [transactions] = await db.execute(query, params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data transaksi'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [transactions] = await db.execute(
      `SELECT t.*, u.nama_lengkap as user_nama, u.nama_lengkap as kasir 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan'
      });
    }

    const [details] = await db.execute(
      `SELECT td.*, f.nama_makanan as nama_makanan 
       FROM transaction_details td 
       LEFT JOIN foods f ON td.food_id = f.id 
       WHERE td.transaction_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...transactions[0],
        kasir: transactions[0].kasir || transactions[0].user_nama,
        details
      }
    });
  } catch (error) {
    console.error('Get transaction detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail transaksi'
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { start_date, end_date, search, status } = req.query;
    let query = 'SELECT * FROM v_history_transaksi WHERE 1=1';
    const params = [];

    if (start_date) {
      query += ' AND DATE(tanggal_transaksi) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(tanggal_transaksi) <= ?';
      params.push(end_date);
    }

    if (search) {
      query += ' AND kode_transaksi LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY tanggal_transaksi DESC';

    const [history] = await db.execute(query, params);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil history transaksi' });
  }
};

exports.delete = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { id } = req.params;

    const [existing] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan'
      });
    }

    await connection.beginTransaction();

    // Get transaction details to restore stock
    const [details] = await connection.execute(
      'SELECT * FROM transaction_details WHERE transaction_id = ?',
      [id]
    );

    // Restore stock for each item
    for (const detail of details) {
      await connection.execute(
        'UPDATE foods SET stok = stok + ? WHERE id = ?',
        [detail.jumlah, detail.food_id]
      );
    }

    // Delete transaction details first
    await connection.execute(
      'DELETE FROM transaction_details WHERE transaction_id = ?',
      [id]
    );

    // Delete transaction
    await connection.execute(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Transaksi berhasil dihapus'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus transaksi'
    });
  } finally {
    connection.release();
  }
};
