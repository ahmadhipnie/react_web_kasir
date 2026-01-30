const db = require('../config/database');
const path = require('path');
const fs = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { category_id, search, status } = req.query;
    let query = `
      SELECT f.id, f.kode_makanan, f.nama_makanan, f.nama_makanan as nama, f.category_id, f.deskripsi, 
             f.harga, f.stok, f.gambar, f.status, f.created_at, f.updated_at,
             c.nama_kategori as category_nama 
      FROM foods f 
      LEFT JOIN categories c ON f.category_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND f.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND f.nama_makanan LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.nama_makanan ASC';

    const [foods] = await db.execute(query, params);

    res.json({
      success: true,
      data: foods
    });
  } catch (error) {
    console.error('Get foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data makanan'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [foods] = await db.execute(
      `SELECT f.id, f.kode_makanan, f.nama_makanan, f.nama_makanan as nama, f.category_id, f.deskripsi, 
              f.harga, f.stok, f.gambar, f.status, f.created_at, f.updated_at,
              c.nama_kategori as category_nama 
       FROM foods f 
       LEFT JOIN categories c ON f.category_id = c.id 
       WHERE f.id = ?`,
      [id]
    );

    if (foods.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Makanan tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: foods[0]
    });
  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data makanan'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { nama_makanan, nama, category_id, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;

    // Accept both nama_makanan and nama for compatibility
    const foodName = nama_makanan || nama;

    // Status handling with validation
    const allowedStatuses = ['tersedia', 'habis', 'nonaktif'];
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : 'tersedia';

    if (!foodName || !category_id || !harga) {
      return res.status(400).json({
        success: false,
        message: 'Nama, kategori, dan harga harus diisi'
      });
    }

    // Generate kode_makanan (support provided kode_makanan and avoid duplicates)
    const providedCode = req.body.kode_makanan;
    let newCode;

    if (providedCode) {
      // validate uniqueness of provided code
      const [exists] = await db.execute('SELECT id FROM foods WHERE kode_makanan = ?', [providedCode]);
      if (exists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Kode makanan sudah ada'
        });
      }
      newCode = providedCode;
    } else {
      // find max numeric suffix and increment
      const [rowsMax] = await db.execute("SELECT MAX(CAST(SUBSTRING(kode_makanan,4) AS UNSIGNED)) as maxnum FROM foods");
      let nextNum = (rowsMax[0].maxnum || 0) + 1;
      newCode = 'MKN' + nextNum.toString().padStart(3, '0');

      // ensure not colliding (race-safe best-effort)
      let attempts = 0;
      while (attempts < 5) {
        const [check] = await db.execute('SELECT id FROM foods WHERE kode_makanan = ?', [newCode]);
        if (check.length === 0) break;
        nextNum += 1;
        newCode = 'MKN' + nextNum.toString().padStart(3, '0');
        attempts += 1;
      }

      if (attempts === 5) {
        return res.status(500).json({
          success: false,
          message: 'Gagal menghasilkan kode makanan unik. Coba lagi.'
        });
      }
    }

    // Try inserting, retrying on duplicate kode_makanan (handles rare race conditions)
    let insertResult;
    let insertAttempts = 0;
    while (insertAttempts < 5) {
      try {
        const [result] = await db.execute(
          'INSERT INTO foods (kode_makanan, nama_makanan, category_id, harga, stok, deskripsi, gambar, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newCode, foodName, category_id, harga, stok || 0, deskripsi || null, gambar, status]
        );
        insertResult = result;
        break;
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY' && err.sqlMessage && err.sqlMessage.includes('kode_makanan')) {
          // increment code and retry
          const num = parseInt(newCode.substring(3)) + 1;
          newCode = 'MKN' + num.toString().padStart(3, '0');
          insertAttempts += 1;
          continue;
        }
        throw err;
      }
    }

    if (!insertResult) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menambahkan makanan karena konflik kode. Coba lagi.'
      });
    }

    const [newFood] = await db.execute(
      `SELECT f.id, f.kode_makanan, f.nama_makanan, f.nama_makanan as nama, f.category_id, f.deskripsi, 
              f.harga, f.stok, f.gambar, f.status, f.created_at, f.updated_at,
              c.nama_kategori as category_nama 
       FROM foods f 
       LEFT JOIN categories c ON f.category_id = c.id 
       WHERE f.id = ?`,
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Makanan berhasil ditambahkan',
      data: newFood[0]
    });
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambah makanan'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_makanan, nama, category_id, harga, stok, deskripsi } = req.body;

    // Accept both nama_makanan and nama for compatibility
    const foodName = nama_makanan || nama;

    // Status handling with validation
    const allowedStatuses = ['tersedia', 'habis', 'nonaktif'];
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : 'tersedia';

    const [existing] = await db.execute(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Makanan tidak ditemukan'
      });
    }

    let gambar = existing[0].gambar;

    if (req.file) {
      // Delete old image if exists
      if (gambar) {
        const oldPath = path.join(__dirname, '../../uploads', gambar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      gambar = req.file.filename;
    }

    await db.execute(
      'UPDATE foods SET nama_makanan = ?, category_id = ?, harga = ?, stok = ?, deskripsi = ?, gambar = ?, status = ? WHERE id = ?',
      [foodName, category_id, harga, stok || 0, deskripsi || null, gambar, status, id]
    );

    const [updated] = await db.execute(
      `SELECT f.id, f.kode_makanan, f.nama_makanan, f.nama_makanan as nama, f.category_id, f.deskripsi, 
              f.harga, f.stok, f.gambar, f.status, f.created_at, f.updated_at,
              c.nama_kategori as category_nama 
       FROM foods f 
       LEFT JOIN categories c ON f.category_id = c.id 
       WHERE f.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Makanan berhasil diupdate',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate makanan'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Makanan tidak ditemukan'
      });
    }

    // Delete image if exists
    if (existing[0].gambar) {
      const imagePath = path.join(__dirname, '../../uploads', existing[0].gambar);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await db.execute('DELETE FROM foods WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Makanan berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus makanan'
    });
  }
};
