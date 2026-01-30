const db = require('../config/database');
const path = require('path');
const fs = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let query = `
      SELECT f.*, c.nama as category_nama 
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
      query += ' AND f.nama LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY f.nama ASC';

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
      `SELECT f.*, c.nama as category_nama 
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
    const { nama, category_id, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;

    if (!nama || !category_id || !harga) {
      return res.status(400).json({
        success: false,
        message: 'Nama, kategori, dan harga harus diisi'
      });
    }

    const [result] = await db.execute(
      'INSERT INTO foods (nama, category_id, harga, stok, deskripsi, gambar) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, category_id, harga, stok || 0, deskripsi || null, gambar]
    );

    const [newFood] = await db.execute(
      `SELECT f.*, c.nama as category_nama 
       FROM foods f 
       LEFT JOIN categories c ON f.category_id = c.id 
       WHERE f.id = ?`,
      [result.insertId]
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
    const { nama, category_id, harga, stok, deskripsi } = req.body;

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
      'UPDATE foods SET nama = ?, category_id = ?, harga = ?, stok = ?, deskripsi = ?, gambar = ? WHERE id = ?',
      [nama, category_id, harga, stok || 0, deskripsi || null, gambar, id]
    );

    const [updated] = await db.execute(
      `SELECT f.*, c.nama as category_nama 
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
