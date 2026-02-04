const db = require('../config/database');

class UserModel {
  /**
   * Find user by username
   * @param {string} username 
   * @returns {Promise<Object|null>}
   */
  static async findByUsername(username) {
    const [users] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Find user by ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const [users] = await db.execute(
      'SELECT id, username, full_name, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Get all users
   * @returns {Promise<Array>}
   */
  static async findAll() {
    const [users] = await db.execute(
      'SELECT id, username, full_name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return users;
  }

  /**
   * Create new user
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  static async create(userData) {
    const { username, password, full_name, role } = userData;
    const [result] = await db.execute(
      'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
      [username, password, full_name, role || 'cashier']
    );
    return { id: result.insertId, username, full_name, role: role || 'cashier' };
  }

  /**
   * Update user
   * @param {number} id 
   * @param {Object} userData 
   * @returns {Promise<boolean>}
   */
  static async update(id, userData) {
    const { username, password, full_name, role } = userData;
    
    let query = 'UPDATE users SET username = ?, full_name = ?, role = ?';
    let params = [username, full_name, role];
    
    if (password) {
      query += ', password = ?';
      params.push(password);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  /**
   * Delete user
   * @param {number} id 
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if username exists (excluding specific user)
   * @param {string} username 
   * @param {number|null} excludeId 
   * @returns {Promise<boolean>}
   */
  static async usernameExists(username, excludeId = null) {
    let query = 'SELECT id FROM users WHERE username = ?';
    let params = [username];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [users] = await db.execute(query, params);
    return users.length > 0;
  }
}

module.exports = UserModel;
