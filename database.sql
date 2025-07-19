-- Database schema for WhatsApp Web API with authentication

-- Create database
CREATE DATABASE IF NOT EXISTS waweb_db;
USE waweb_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create whatsapp_sessions table to track sessions per user
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  webhook_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_session (user_id, session_name)
);

-- Create messages table to log messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  message_id VARCHAR(100) NOT NULL,
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  media_url VARCHAR(255),
  timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE
);

-- Add index to media_url column for better query performance
CREATE INDEX IF NOT EXISTS idx_media_url ON messages(media_url(191));

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, email, role) VALUES
('admin', '$2b$10$eCQDljoYhOq0Js9XiGBnWOHQwxVsKLjw3S8GZnC2Ou.e9ynpxZfXW', 'admin@example.com', 'admin');

-- Insert default regular user (password: user123)
INSERT INTO users (username, password, email, role) VALUES
('user', '$2b$10$qPNjUU7qVQhS4I5D1tZ3UuByz8zcgPYEQZIgWVBk2XwUXcNwvgQnC', 'user@example.com', 'user');

-- Insert sample WhatsApp session for demo purposes
INSERT INTO whatsapp_sessions (user_id, session_name, is_active, webhook_url) VALUES
(1, 'demo_session', TRUE, 'https://example.com/webhook');

-- Insert sample media messages for demo purposes
INSERT INTO messages (session_id, message_id, from_number, to_number, message_type, message_body, media_url, timestamp, status) VALUES
(1, 'sample_msg_001', '123456789', '987654321', 'image', 'Check out this image!', 'https://example.com/sample-image.jpg', NOW(), 'sent'),
(1, 'sample_msg_002', '123456789', '987654321', 'video', 'Watch this video', 'https://example.com/sample-video.mp4', NOW(), 'sent'),
(1, 'sample_msg_003', '123456789', '987654321', 'document', 'Important document', 'https://example.com/sample-document.pdf', NOW(), 'sent'),
(1, 'sample_msg_004', '123456789', '987654321', 'audio', 'Listen to this audio', 'https://example.com/sample-audio.mp3', NOW(), 'sent');