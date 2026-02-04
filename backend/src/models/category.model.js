const db = require('../config/database');

class CategoryModel {
  /**
   * Get all categories with food count
   * @returns {Promise<Array>}
   */
  static async findAll() {
    const [categories] = await db.execute(`
      SELECT c.*, COUNT(f.id) as food_count 
      FROM categories c 
      LEFT JOIN foods f ON c.id = f.category_id 
      GROUP BY c.id 
      ORDER BY c.category_name ASC
    `);
    return categories;
  }

  /**
   * Find category by ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const [categories] = await db.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return categories.length > 0 ? categories[0] : null;
  }

  /**
   * Find category by name
   * @param {string} categoryName 
   * @param {number|null} excludeId 
   * @returns {Promise<Object|null>}
   */
  static async findByName(categoryName, excludeId = null) {
    let query = 'SELECT * FROM categories WHERE category_name = ?';
    let params = [categoryName];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [categories] = await db.execute(query, params);
    return categories.length > 0 ? categories[0] : null;
  }

  /**
   * Create new category
   * @param {Object} categoryData 
   * @returns {Promise<Object>}
   */
  static async create(categoryData) {
    const { category_name, description } = categoryData;
    const [result] = await db.execute(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [category_name, description || null]
    );
    return { id: result.insertId, category_name, description };
  }

  /**
   * Update category
   * @param {number} id 
   * @param {Object} categoryData 
   * @returns {Promise<boolean>}
   */
  static async update(id, categoryData) {
    const { category_name, description } = categoryData;
    const [result] = await db.execute(
      'UPDATE categories SET category_name = ?, description = ? WHERE id = ?',
      [category_name, description || null, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete category
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if category has foods
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async hasFoods(id) {
    const [foods] = await db.execute(
      'SELECT id FROM foods WHERE category_id = ? LIMIT 1',
      [id]
    );
    return foods.length > 0;
  }
}

module.exports = CategoryModel;
