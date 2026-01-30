const db = require('../config/database');

exports.create = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { items, bayar } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items transaksi harus diisi'
      });
    }

    await connection.beginTransaction();

    // Generate transaction code using stored procedure
    const [codeResult] = await connection.execute('CALL generate_kode_transaksi(@kode)');
    const [kodeRow] = await connection.execute('SELECT @kode as kode');
    const kode_transaksi = kodeRow[0].kode;

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.harga * item.qty;
    }

    const kembalian = bayar - total;

    if (kembalian < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Pembayaran kurang dari total'
      });
    }

    // Insert transaction
    const [transResult] = await connection.execute(
      'INSERT INTO transactions (kode_transaksi, total, bayar, kembalian, user_id) VALUES (?, ?, ?, ?, ?)',
      [kode_transaksi, total, bayar, kembalian, req.user.id]
    );

    const transactionId = transResult.insertId;

    // Insert transaction details (trigger will update stock)
    for (const item of items) {
      await connection.execute(
        'INSERT INTO transaction_details (transaction_id, food_id, qty, harga, subtotal) VALUES (?, ?, ?, ?, ?)',
        [transactionId, item.food_id, item.qty, item.harga, item.harga * item.qty]
      );
    }

    await connection.commit();

    // Get complete transaction data
    const [transaction] = await connection.execute(
      `SELECT t.*, u.nama as user_nama 
       FROM transactions t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.id = ?`,
      [transactionId]
    );

    const [details] = await connection.execute(
      `SELECT td.*, f.nama as food_nama 
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
        items: details
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
    const { start_date, end_date, search } = req.query;
    
    let query = `
      SELECT t.*, u.nama as user_nama,
             (SELECT COUNT(*) FROM transaction_details WHERE transaction_id = t.id) as item_count
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(t.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.created_at) <= ?';
      params.push(end_date);
    }

    if (search) {
      query += ' AND t.kode_transaksi LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY t.created_at DESC';

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
      `SELECT t.*, u.nama as user_nama 
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
      `SELECT td.*, f.nama as food_nama 
       FROM transaction_details td 
       LEFT JOIN foods f ON td.food_id = f.id 
       WHERE td.transaction_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...transactions[0],
        items: details
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data transaksi'
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM v_history_transaksi WHERE 1=1';
    const params = [];

    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    const [history] = await db.execute(query, params);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil history transaksi'
    });
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
        [detail.qty, detail.food_id]
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
