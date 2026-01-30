const db = require('../config/database');

exports.getSummary = async (req, res) => {
  try {
    // Get summary from view
    const [summary] = await db.execute('SELECT * FROM v_dashboard_summary');

    // Get today's transactions
    const [todayTrans] = await db.execute(`
      SELECT COUNT(*) as total_transaksi, COALESCE(SUM(total), 0) as pendapatan_hari_ini
      FROM transactions 
      WHERE DATE(created_at) = CURDATE()
    `);

    // Get popular foods from view
    const [popularFoods] = await db.execute('SELECT * FROM v_makanan_terlaris LIMIT 5');

    // Get recent transactions
    const [recentTrans] = await db.execute(`
      SELECT t.*, u.nama as user_nama 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC 
      LIMIT 5
    `);

    // Get monthly sales data for chart (last 6 months)
    const [monthlySales] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        DATE_FORMAT(created_at, '%b') as month_name,
        COUNT(*) as total_transaksi,
        SUM(total) as total_pendapatan
      FROM transactions 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month ASC
    `);

    // Get category stats
    const [categoryStats] = await db.execute(`
      SELECT 
        c.nama as category,
        COUNT(DISTINCT f.id) as total_foods,
        COALESCE(SUM(td.qty), 0) as total_sold
      FROM categories c
      LEFT JOIN foods f ON c.id = f.category_id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      GROUP BY c.id, c.nama
      ORDER BY total_sold DESC
    `);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {
          total_kategori: 0,
          total_makanan: 0,
          total_transaksi: 0,
          total_pendapatan: 0
        },
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
