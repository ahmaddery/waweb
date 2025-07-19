const { pool } = require('../config/database');

class WhatsappSession {
  // Create new WhatsApp session
  static async create(sessionData) {
    try {
      const [result] = await pool.query(
        'INSERT INTO whatsapp_sessions (user_id, session_name, webhook_url) VALUES (?, ?, ?)',
        [sessionData.userId, sessionData.sessionName, sessionData.webhookUrl || null]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating WhatsApp session:', error.message);
      throw error;
    }
  }

  // Find session by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE id = ?', [id]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding WhatsApp session by ID:', error.message);
      throw error;
    }
  }

  // Find sessions by user ID
  static async findByUserId(userId) {
    try {
      const [rows] = await pool.query('SELECT * FROM whatsapp_sessions WHERE user_id = ?', [userId]);
      return rows;
    } catch (error) {
      console.error('Error finding WhatsApp sessions by user ID:', error.message);
      throw error;
    }
  }

  // Update session
  static async update(id, sessionData) {
    try {
      let query = 'UPDATE whatsapp_sessions SET ';
      const values = [];
      const updateFields = [];

      if (sessionData.sessionName) {
        updateFields.push('session_name = ?');
        values.push(sessionData.sessionName);
      }

      if (sessionData.webhookUrl !== undefined) {
        updateFields.push('webhook_url = ?');
        values.push(sessionData.webhookUrl);
      }

      if (sessionData.isActive !== undefined) {
        updateFields.push('is_active = ?');
        values.push(sessionData.isActive);
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
      console.error('Error updating WhatsApp session:', error.message);
      throw error;
    }
  }

  // Delete session
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM whatsapp_sessions WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting WhatsApp session:', error.message);
      throw error;
    }
  }

  // Set session active status
  static async setActiveStatus(id, isActive) {
    try {
      const [result] = await pool.query(
        'UPDATE whatsapp_sessions SET is_active = ? WHERE id = ?',
        [isActive, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error setting WhatsApp session active status:', error.message);
      throw error;
    }
  }

  // Get all sessions
  static async getAll() {
    try {
      const [rows] = await pool.query(
        `SELECT ws.*, u.username 
         FROM whatsapp_sessions ws 
         JOIN users u ON ws.user_id = u.id`
      );
      return rows;
    } catch (error) {
      console.error('Error getting all WhatsApp sessions:', error.message);
      throw error;
    }
  }
}

module.exports = WhatsappSession;