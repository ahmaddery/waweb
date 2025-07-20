const { pool } = require('../config/database');

class Settings {
  static async getSetting(key) {
    try {
      const query = 'SELECT setting_value FROM settings WHERE setting_key = ?';
      const [rows] = await pool.execute(query, [key]);
      return rows.length > 0 ? rows[0].setting_value : null;
    } catch (error) {
      console.error('[ERROR] Settings.getSetting:', error);
      throw error;
    }
  }

  static async setSetting(key, value) {
    try {
      const query = `
        INSERT INTO settings (setting_key, setting_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value),
        updated_at = CURRENT_TIMESTAMP
      `;
      const [result] = await pool.execute(query, [key, value]);
      return result;
    } catch (error) {
      console.error('[ERROR] Settings.setSetting:', error);
      throw error;
    }
  }

  static async deleteSetting(key) {
    try {
      const query = 'DELETE FROM settings WHERE setting_key = ?';
      const [result] = await pool.execute(query, [key]);
      return result;
    } catch (error) {
      console.error('[ERROR] Settings.deleteSetting:', error);
      throw error;
    }
  }

  static async getAllSettings() {
    try {
      const query = 'SELECT setting_key, setting_value FROM settings ORDER BY setting_key';
      const [rows] = await pool.execute(query);
      
      // Convert to object for easier access
      const settings = {};
      rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      return settings;
    } catch (error) {
      console.error('[ERROR] Settings.getAllSettings:', error);
      throw error;
    }
  }

  // Specific methods for common settings
  static async getGlobalWebhookUrl() {
    return await this.getSetting('global_webhook_url');
  }

  static async setGlobalWebhookUrl(url) {
    return await this.setSetting('global_webhook_url', url);
  }

  static async getDefaultSessionName() {
    return await this.getSetting('default_session_name') || 'default';
  }

  static async setDefaultSessionName(name) {
    return await this.setSetting('default_session_name', name);
  }
}

module.exports = Settings;
