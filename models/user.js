const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Find user by username
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by username:', error.message);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error.message);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insert user into database
      const [result] = await pool.query(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        [userData.username, hashedPassword, userData.email, userData.role || 'user']
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    try {
      let query = 'UPDATE users SET ';
      const values = [];
      const updateFields = [];

      if (userData.username) {
        updateFields.push('username = ?');
        values.push(userData.username);
      }

      if (userData.email) {
        updateFields.push('email = ?');
        values.push(userData.email);
      }

      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        updateFields.push('password = ?');
        values.push(hashedPassword);
      }

      if (userData.role) {
        updateFields.push('role = ?');
        values.push(userData.role);
      }

      if (updateFields.length === 0) {
        return false; // Nothing to update
      }

      query += updateFields.join(', ');
      query += ' WHERE id = ?';
      values.push(id);

      const [result] = await pool.query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user:', error.message);
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error.message);
      throw error;
    }
  }

  // Get all users
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT id, username, email, role, created_at, updated_at FROM users');
      return rows;
    } catch (error) {
      console.error('Error getting all users:', error.message);
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;