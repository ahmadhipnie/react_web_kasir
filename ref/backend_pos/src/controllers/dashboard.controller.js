const db = require('../config/database');

exports.getSummary = async (req, res) => {
  try {
    // Previously this used the view v_dashboard_summary. To allow dropping views safely,
    // compute summary directly using queries below and don't rely on the view.
    const summary = [{
      total_kategori: 0,
      total_makanan: 0,
      total_transaksi: 0,
      total_pendapatan: 0
    }];

    // Get today's transactions
    const [todayTrans] = await db.execute(`
      SELECT COUNT(*) as total_transaksi, COALESCE(SUM(total_bayar), 0) as pendapatan_hari_ini
      FROM transactions 
      WHERE DATE(tanggal_transaksi) = CURDATE()
    `);

    // Compute today's sold items
    const [todayItems] = await db.execute(`
      SELECT COALESCE(SUM(td.jumlah), 0) as total_item_terjual_hari_ini
      FROM transactions t
      LEFT JOIN transaction_details td ON t.id = td.transaction_id
      WHERE DATE(t.tanggal_transaksi) = CURDATE()
    `);

    // Calculate popular foods by summing quantity sold from transaction_details
    const [popularFoods] = await db.execute(`
      SELECT f.id, f.nama_makanan, f.kode_makanan, f.harga, c.nama_kategori as nama_kategori, COALESCE(SUM(td.jumlah), 0) as jumlah_terjual
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      GROUP BY f.id, f.nama_makanan, f.kode_makanan, f.harga, c.nama_kategori
      ORDER BY jumlah_terjual DESC
      LIMIT 5
    `);

    // Get recent transactions
    const [recentTrans] = await db.execute(`
      SELECT t.*, u.nama_lengkap as user_nama 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.tanggal_transaksi DESC 
      LIMIT 5
    `);

    // Get monthly sales data for chart (last 6 months)
    const [monthlySales] = await db.execute(`
      SELECT 
        DATE_FORMAT(tanggal_transaksi, '%Y-%m') as month,
        DATE_FORMAT(tanggal_transaksi, '%b') as month_name,
        COUNT(*) as total_transaksi,
        SUM(total_bayar) as total_pendapatan
      FROM transactions 
      WHERE tanggal_transaksi >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(tanggal_transaksi, '%Y-%m'), DATE_FORMAT(tanggal_transaksi, '%b')
      ORDER BY month ASC
    `);

    // Get category stats
    const [categoryStats] = await db.execute(`
      SELECT 
        c.nama_kategori as category,
        COUNT(DISTINCT f.id) as total_foods,
        COALESCE(SUM(td.jumlah), 0) as total_sold
      FROM categories c
      LEFT JOIN foods f ON c.id = f.category_id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      GROUP BY c.id, c.nama_kategori
      ORDER BY total_sold DESC
    `);

    const resultSummary = summary[0] || {
      total_kategori: 0,
      total_makanan: 0,
      total_transaksi: 0,
      total_pendapatan: 0
    };

    // Ensure total_makanan is accurate (fallback to count foods table)
    const [totalFoods] = await db.execute('SELECT COUNT(*) as total_makanan FROM foods');

    // Map to frontend expected keys
    const mappedSummary = {
      total_pendapatan_hari_ini: todayTrans[0]?.pendapatan_hari_ini || 0,
      total_transaksi_hari_ini: todayTrans[0]?.total_transaksi || 0,
      total_item_terjual_hari_ini: todayItems[0]?.total_item_terjual_hari_ini || 0,
      total_makanan: (typeof totalFoods[0]?.total_makanan !== 'undefined') ? totalFoods[0].total_makanan : (resultSummary.total_makanan || 0),
      total_kategori: resultSummary.total_kategori || 0,
      total_transaksi_all: resultSummary.total_transaksi || 0,
      total_pendapatan_all: resultSummary.total_pendapatan || 0
    };

    res.json({
      success: true,
      data: {
        summary: mappedSummary,
        today: todayTrans[0],
        popular_foods: popularFoods,
        recent_transactions: recentTrans,
        monthly_sales: monthlySales,
        category_stats: categoryStats
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data dashboard'
    });
  }
};

exports.getTopFoods = async (req, res) => {
  try {
    const [popularFoods] = await db.execute(`
      SELECT f.id, f.nama_makanan, f.kode_makanan, f.harga, c.nama_kategori as nama_kategori, COALESCE(SUM(td.jumlah), 0) as jumlah_terjual
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      GROUP BY f.id, f.nama_makanan, f.kode_makanan, f.harga, c.nama_kategori
      ORDER BY jumlah_terjual DESC
      LIMIT 10
    `);
    res.json({ success: true, data: popularFoods });
  } catch (error) {
    console.error('Get top foods error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil data menu terlaris' });
  }
};
