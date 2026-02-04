const { TransactionModel, FoodModel, CategoryModel } = require('../models');
const db = require('../config/database');

exports.getSummary = async (req, res) => {
  try {
    // Get today's stats using model
    const todayTransactions = await TransactionModel.getTodayCount();
    const todayRevenue = await TransactionModel.getTodayRevenue();

    // Get today's sold items (still need direct query for this specific stat)
    const [todayItems] = await db.execute(`
      SELECT COALESCE(SUM(td.quantity), 0) as total_items_sold
      FROM transactions t
      LEFT JOIN transaction_details td ON t.id = td.transaction_id
      WHERE DATE(t.transaction_date) = CURDATE() AND t.status = 'completed'
    `);

    // Get total foods count
    const foods = await FoodModel.findAll();
    const totalFoods = foods.length;

    // Get total categories count
    const categories = await CategoryModel.findAll();
    const totalCategories = categories.length;

    // Get popular foods using model
    const popularFoods = await FoodModel.getTopSelling(5);

    // Get recent transactions
    const recentResult = await TransactionModel.findAll({ page: 1, limit: 5 });

    // Get weekly sales data using model
    const weeklySales = await TransactionModel.getWeeklySales();

    // Get category stats (still need direct query for aggregation)
    const [categoryStats] = await db.execute(`
      SELECT 
        c.category_name,
        COUNT(DISTINCT f.id) as total_foods,
        COALESCE(SUM(td.quantity), 0) as total_sold
      FROM categories c
      LEFT JOIN foods f ON c.id = f.category_id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      LEFT JOIN transactions t ON td.transaction_id = t.id AND t.status = 'completed'
      GROUP BY c.id, c.category_name
      ORDER BY total_sold DESC
    `);

    const summary = {
      today_revenue: todayRevenue || 0,
      today_transactions: todayTransactions || 0,
      today_items_sold: todayItems[0]?.total_items_sold || 0,
      total_foods: totalFoods || 0,
      total_categories: totalCategories || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        popular_foods: popularFoods,
        recent_transactions: recentResult.data,
        weekly_sales: weeklySales,
        category_stats: categoryStats
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching dashboard data'
    });
  }
};

exports.getTopFoods = async (req, res) => {
  try {
    const popularFoods = await FoodModel.getTopSelling(10);

    res.json({ 
      success: true, 
      data: popularFoods 
    });
  } catch (error) {
    console.error('Get top foods error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while fetching top foods' 
    });
  }
};
