const db = require('../config/database');

class FoodModel {
  /**
   * Get all foods with optional filters
   * @param {Object} filters 
   * @returns {Promise<Array>}
   */
  static async findAll(filters = {}) {
    const { category_id, search, status } = filters;
    
    let query = `
      SELECT f.id, f.food_code, f.food_name, f.category_id, f.description, 
             f.price, f.stock, f.image, f.status, f.created_at, f.updated_at,
             c.category_name 
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
      query += ' AND f.food_name LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.food_name ASC';

    const [foods] = await db.execute(query, params);
    return foods;
  }

  /**
   * Find food by ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const [foods] = await db.execute(`
      SELECT f.id, f.food_code, f.food_name, f.category_id, f.description, 
             f.price, f.stock, f.image, f.status, f.created_at, f.updated_at,
             c.category_name 
      FROM foods f 
      LEFT JOIN categories c ON f.category_id = c.id 
      WHERE f.id = ?
    `, [id]);
    return foods.length > 0 ? foods[0] : null;
  }

  /**
   * Find food by food code
   * @param {string} foodCode 
   * @returns {Promise<Object|null>}
   */
  static async findByCode(foodCode) {
    const [foods] = await db.execute(
      'SELECT * FROM foods WHERE food_code = ?',
      [foodCode]
    );
    return foods.length > 0 ? foods[0] : null;
  }

  /**
   * Generate next food code
   * @returns {Promise<string>}
   */
  static async generateFoodCode() {
    const [rows] = await db.execute(
      "SELECT MAX(CAST(SUBSTRING(food_code, 4) AS UNSIGNED)) as maxnum FROM foods"
    );
    const nextNum = (rows[0].maxnum || 0) + 1;
    return `MKN${nextNum.toString().padStart(4, '0')}`;
  }

  /**
   * Create new food
   * @param {Object} foodData 
   * @returns {Promise<Object>}
   */
  static async create(foodData) {
    const { food_code, food_name, category_id, price, stock, description, status, image } = foodData;
    
    const [result] = await db.execute(
      `INSERT INTO foods (food_code, food_name, category_id, description, price, stock, image, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [food_code, food_name, category_id, description || null, price, stock || 0, image || null, status || 'available']
    );
    
    return { id: result.insertId, ...foodData };
  }

  /**
   * Update food
   * @param {number} id 
   * @param {Object} foodData 
   * @returns {Promise<boolean>}
   */
  static async update(id, foodData) {
    const { food_name, category_id, price, stock, description, status, image } = foodData;
    
    let query = `UPDATE foods SET food_name = ?, category_id = ?, price = ?, stock = ?, description = ?, status = ?`;
    let params = [food_name, category_id, price, stock || 0, description || null, status || 'available'];
    
    if (image !== undefined) {
      query += ', image = ?';
      params.push(image);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  /**
   * Delete food
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM foods WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      // Handle foreign key constraint error
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
        throw new Error('Cannot delete food: it is referenced in transaction details');
      }
      throw error;
    }
  }

  /**
   * Update stock
   * @param {number} id 
   * @param {number} quantity - positive to add, negative to subtract
   * @returns {Promise<boolean>}
   */
  static async updateStock(id, quantity) {
    const [result] = await db.execute(
      'UPDATE foods SET stock = stock + ? WHERE id = ? AND stock + ? >= 0',
      [quantity, id, quantity]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if food has transactions
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async hasTransactions(id) {
    const [transactions] = await db.execute(
      'SELECT id FROM transaction_details WHERE food_id = ? LIMIT 1',
      [id]
    );
    return transactions.length > 0;
  }

  /**
   * Get transaction count for a food
   * @param {number} id 
   * @returns {Promise<number>}
   */
  static async getTransactionCount(id) {
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM transaction_details WHERE food_id = ?',
      [id]
    );
    return result[0].count;
  }

  /**
   * Delete food with all its references (cascade delete)
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async deleteWithReferences(id) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete from transaction_details first
      await connection.execute(
        'DELETE FROM transaction_details WHERE food_id = ?',
        [id]
      );
      
      // Delete the food
      const [result] = await connection.execute(
        'DELETE FROM foods WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get top selling foods
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  static async getTopSelling(limit = 5) {
    const limitNum = parseInt(limit) || 5;
    const [foods] = await db.execute(`
      SELECT f.id, f.food_name, f.image, c.category_name, 
             COALESCE(SUM(td.quantity), 0) as quantity_sold
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN transaction_details td ON f.id = td.food_id
      LEFT JOIN transactions t ON td.transaction_id = t.id AND t.status = 'completed'
      GROUP BY f.id, f.food_name, f.image, c.category_name
      ORDER BY quantity_sold DESC
      LIMIT ${limitNum}
    `);
    return foods;
  }
}

module.exports = FoodModel;
