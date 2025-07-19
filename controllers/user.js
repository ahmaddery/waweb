const User = require('../models/user');
const WhatsappSession = require('../models/whatsapp-session');
const Message = require('../models/message');

class UserController {
  // Render user dashboard
  static async renderDashboard(req, res) {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
      
      // Get user's WhatsApp sessions
      const sessions = await WhatsappSession.findByUserId(userId);
      
      res.render('user/dashboard', { 
        title: 'User Dashboard - WhatsApp Web API',
        user,
        sessions,
        activePage: 'user-dashboard'
      });
    } catch (error) {
      console.error('Error rendering user dashboard:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the dashboard',
        error
      });
    }
  }

  // Render user profile
  static async renderProfile(req, res) {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
      
      res.render('user/profile', { 
        title: 'User Profile - WhatsApp Web API',
        user,
        activePage: 'user-profile'
      });
    } catch (error) {
      console.error('Error rendering user profile:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the profile',
        error
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.session.userId;
      const { username, email, currentPassword, newPassword } = req.body;
      
      // Get current user data
      const user = await User.findById(userId);
      
      // Validate current password if changing password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            success: false, 
            message: 'Current password is required to set a new password' 
          });
        }
        
        const isPasswordValid = await User.verifyPassword(currentPassword, user.password);
        
        if (!isPasswordValid) {
          return res.status(400).json({ 
            success: false, 
            message: 'Current password is incorrect' 
          });
        }
      }
      
      // Update user data
      const updateData = {};
      
      if (username && username !== user.username) {
        // Check if username is already taken
        const existingUser = await User.findByUsername(username);
        
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Username is already taken' 
          });
        }
        
        updateData.username = username;
        // Update session username
        req.session.username = username;
      }
      
      if (email && email !== user.email) {
        updateData.email = email;
      }
      
      if (newPassword) {
        updateData.password = newPassword;
      }
      
      // If there are updates, apply them
      if (Object.keys(updateData).length > 0) {
        await User.update(userId, updateData);
      }
      
      return res.json({ 
        success: true, 
        message: 'Profile updated successfully' 
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while updating the profile' 
      });
    }
  }

  // Render WhatsApp sessions page
  static async renderSessions(req, res) {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
      
      // Get user's WhatsApp sessions
      const sessions = await WhatsappSession.findByUserId(userId);
      
      res.render('user/sessions', { 
        title: 'WhatsApp Sessions - WhatsApp Web API',
        user,
        sessions,
        activePage: 'user-sessions'
      });
    } catch (error) {
      console.error('Error rendering WhatsApp sessions:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the sessions',
        error
      });
    }
  }

  // Render messages page
  static async renderMessages(req, res) {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
      const sessionId = req.params.sessionId;
      
      // Verify session belongs to user
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session || session.user_id !== userId) {
        return res.status(403).render('error', { 
          message: 'You do not have access to this session'
        });
      }
      
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = 20; // Messages per page
      const offset = (page - 1) * limit;
      
      // Get messages for this session
      const messages = await Message.findBySessionId(sessionId);
      
      // Calculate pagination
      const totalMessages = messages.length;
      const totalPages = Math.ceil(totalMessages / limit);
      const paginatedMessages = messages.slice(offset, offset + limit);
      
      // Get message statistics
      const stats = await Message.getStatsBySessionId(sessionId);
      
      res.render('user/messages', { 
        title: 'WhatsApp Messages - WhatsApp Web API',
        user,
        session,
        messages: paginatedMessages,
        stats,
        currentPage: page,
        totalPages: totalPages,
        totalMessages: totalMessages,
        activePage: 'user-messages'
      });
    } catch (error) {
      console.error('Error rendering messages:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the messages',
        error
      });
    }
  }
}

module.exports = UserController;