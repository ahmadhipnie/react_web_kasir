const db = require('../config/database');

class TransactionModel {
  /**
   * Get all transactions with filters and pagination
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  static async findAll(filters = {}) {
    const { search, payment_method, start_date, end_date, page = 1, limit = 10 } = filters;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND t.transaction_code LIKE ?';
      params.push(`%${search}%`);
    }

    if (payment_method) {
      whereClause += ' AND t.payment_method = ?';
      params.push(payment_method);
    }

    if (start_date) {
      whereClause += ' AND DATE(t.transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(t.transaction_date) <= ?';
      params.push(end_date);
    }

    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total FROM transactions t ${whereClause}
    `, params);
    const total = countResult[0].total;

    // Get transactions - use string interpolation for LIMIT/OFFSET (safe since we control the values)
    const [transactions] = await db.execute(`
      SELECT t.*, u.full_name 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ${whereClause}
      ORDER BY t.transaction_date DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);

    return {
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Find transaction by ID with details
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const [transactions] = await db.execute(`
      SELECT t.*, u.full_name 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE t.id = ?
    `, [id]);

    if (transactions.length === 0) {
      return null;
    }

    const transaction = transactions[0];

    // Get transaction details
    const [details] = await db.execute(`
      SELECT td.*, f.food_code 
      FROM transaction_details td 
      LEFT JOIN foods f ON td.food_id = f.id 
      WHERE td.transaction_id = ?
    `, [id]);

    transaction.items = details;
    return transaction;
  }

  /**
   * Find transaction by code
   * @param {string} transactionCode 
   * @returns {Promise<Object|null>}
   */
  static async findByCode(transactionCode) {
    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE transaction_code = ?',
      [transactionCode]
    );
    return transactions.length > 0 ? transactions[0] : null;
  }

  /**
   * Generate next transaction code
   * @returns {Promise<string>}
   */
  static async generateTransactionCode() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const [rows] = await db.execute(`
      SELECT MAX(CAST(SUBSTRING(transaction_code, 13) AS UNSIGNED)) as maxnum 
      FROM transactions 
      WHERE transaction_code LIKE ?
    `, [`TRX${dateStr}%`]);
    
    const nextNum = (rows[0].maxnum || 0) + 1;
    return `TRX${dateStr}${nextNum.toString().padStart(4, '0')}`;
  }

  /**
   * Create transaction with details
   * @param {Object} transactionData 
   * @returns {Promise<Object>}
   */
  static async create(transactionData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { 
        transaction_code, user_id, total_item, subtotal, tax, discount, 
        total_payment, money_received, change_money, payment_method, notes, items 
      } = transactionData;

      // Insert transaction
      const [transactionResult] = await connection.execute(`
        INSERT INTO transactions 
        (transaction_code, transaction_date, user_id, total_item, subtotal, tax, discount, 
         total_payment, money_received, change_money, payment_method, notes, status)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [
        transaction_code, user_id, total_item, subtotal, tax || 0, discount || 0,
        total_payment, money_received, change_money, payment_method, notes || null
      ]);

      const transactionId = transactionResult.insertId;

      // Insert transaction details and update stock
      for (const item of items) {
        // Insert detail
        await connection.execute(`
          INSERT INTO transaction_details 
          (transaction_id, food_id, food_name, unit_price, quantity, subtotal, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          transactionId, item.food_id, item.food_name, item.unit_price, 
          item.quantity, item.subtotal, item.notes || null
        ]);

        // Update stock
        await connection.execute(
          'UPDATE foods SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.food_id]
        );
      }

      await connection.commit();

      return {
        id: transactionId,
        transaction_code,
        total_payment,
        payment_method
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get today's transactions count
   * @returns {Promise<number>}
   */
  static async getTodayCount() {
    const [result] = await db.execute(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE DATE(transaction_date) = CURDATE() AND status = 'completed'
    `);
    return result[0].count;
  }

  /**
   * Get today's revenue
   * @returns {Promise<number>}
   */
  static async getTodayRevenue() {
    const [result] = await db.execute(`
      SELECT COALESCE(SUM(total_payment), 0) as revenue FROM transactions 
      WHERE DATE(transaction_date) = CURDATE() AND status = 'completed'
    `);
    return result[0].revenue;
  }

  /**
   * Get monthly revenue
   * @returns {Promise<number>}
   */
  static async getMonthlyRevenue() {
    const [result] = await db.execute(`
      SELECT COALESCE(SUM(total_payment), 0) as revenue FROM transactions 
      WHERE MONTH(transaction_date) = MONTH(CURDATE()) 
      AND YEAR(transaction_date) = YEAR(CURDATE())
      AND status = 'completed'
    `);
    return result[0].revenue;
  }

  /**
   * Get weekly sales data for chart
   * @returns {Promise<Array>}
   */
  static async getWeeklySales() {
    const [result] = await db.execute(`
      SELECT 
        DATE(transaction_date) as date,
        DAYNAME(transaction_date) as day_name,
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_payment), 0) as total_revenue
      FROM transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      AND status = 'completed'
      GROUP BY DATE(transaction_date), DAYNAME(transaction_date)
      ORDER BY date ASC
    `);
    return result;
  }
}

module.exports = TransactionModel;
