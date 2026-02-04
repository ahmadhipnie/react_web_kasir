const db = require('../config/database');

const DEFAULT_CATEGORY_ICON = '🍔';

exports.getAll = async (req, res) => {
  try {
    const [categories] = await db.execute(
      'SELECT id, nama_kategori, nama_kategori as nama, deskripsi, created_at, updated_at FROM categories ORDER BY nama_kategori ASC'
    );

    // Add default icon to each category for compatibility
    const result = categories.map(c => ({ ...c, icon: DEFAULT_CATEGORY_ICON }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data kategori'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await db.execute(
      'SELECT id, nama_kategori, nama_kategori as nama, deskripsi, created_at, updated_at FROM categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan'
      });
    }

    const category = { ...categories[0], icon: DEFAULT_CATEGORY_ICON };

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data kategori'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { nama_kategori, nama, deskripsi } = req.body;

    // Accept both nama_kategori and nama for compatibility
    const categoryName = nama_kategori || nama;

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori harus diisi'
      });
    }

    const [result] = await db.execute(
      'INSERT INTO categories (nama_kategori, deskripsi) VALUES (?, ?)',
      [categoryName, deskripsi || null]
    );

    const [newCategory] = await db.execute(
      'SELECT id, nama_kategori, nama_kategori as nama, deskripsi, created_at, updated_at FROM categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan',
      data: { ...newCategory[0], icon: DEFAULT_CATEGORY_ICON }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambah kategori'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kategori, nama, deskripsi } = req.body;

    // Accept both nama_kategori and nama for compatibility
    const categoryName = nama_kategori || nama;

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori harus diisi'
      });
    }

    const [existing] = await db.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan'
      });
    }

    await db.execute(
      'UPDATE categories SET nama_kategori = ?, deskripsi = ? WHERE id = ?',
      [categoryName, deskripsi || null, id]
    );

    const [updated] = await db.execute(
      'SELECT id, nama_kategori, nama_kategori as nama, deskripsi, created_at, updated_at FROM categories WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Kategori berhasil diupdate',
      data: { ...updated[0], icon: DEFAULT_CATEGORY_ICON }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate kategori'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan'
      });
    }

    // Check if category has foods
    const [foods] = await db.execute(
      'SELECT COUNT(*) as count FROM foods WHERE category_id = ?',
      [id]
    );

    if (foods[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus kategori yang memiliki makanan'
      });
    }

    await db.execute('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus kategori'
    });
  }
};
