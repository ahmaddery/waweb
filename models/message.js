const { pool } = require('../config/database');

class Message {
  // Create new message
  static async create(messageData) {
    try {
      const [result] = await pool.query(
        `INSERT INTO messages (
          session_id, message_id, from_number, to_number, 
          message_type, message_body, media_url, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          messageData.sessionId,
          messageData.messageId,
          messageData.fromNumber,
          messageData.toNumber,
          messageData.messageType,
          messageData.messageBody,
          messageData.mediaUrl || null,
          messageData.timestamp || new Date()
        ]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating message record:', error.message);
      throw error;
    }
  }

  // Find message by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [id]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding message by ID:', error.message);
      throw error;
    }
  }

  // Find messages by session ID
  static async findBySessionId(sessionId, limit = 100, offset = 0) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [sessionId, limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error finding messages by session ID:', error.message);
      throw error;
    }
  }

  // Find messages by phone number
  static async findByPhoneNumber(phoneNumber, limit = 100, offset = 0) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM messages WHERE from_number = ? OR to_number = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [phoneNumber, phoneNumber, limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error finding messages by phone number:', error.message);
      throw error;
    }
  }

  // Get message count by session ID
  static async getCountBySessionId(sessionId) {
    try {
      const [rows] = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
        [sessionId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error getting message count by session ID:', error.message);
      throw error;
    }
  }

  // Delete messages by session ID
  static async deleteBySessionId(sessionId) {
    try {
      const [result] = await pool.query('DELETE FROM messages WHERE session_id = ?', [sessionId]);
      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting messages by session ID:', error.message);
      throw error;
    }
  }

  // Get message statistics by session ID
  static async getStatsBySessionId(sessionId) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN message_type = 'video' THEN 1 END) as video_messages,
          COUNT(CASE WHEN message_type = 'document' THEN 1 END) as document_messages,
          COUNT(CASE WHEN message_type = 'audio' THEN 1 END) as audio_messages,
          COUNT(DISTINCT from_number) as unique_senders
        FROM messages 
        WHERE session_id = ?`,
        [sessionId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting message statistics by session ID:', error.message);
      throw error;
    }
  }
}

module.exports = Message;