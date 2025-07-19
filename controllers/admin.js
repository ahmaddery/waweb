const User = require('../models/user');
const WhatsappSession = require('../models/whatsapp-session');
const Message = require('../models/message');

class AdminController {
  // Render admin dashboard
  static async renderDashboard(req, res) {
    try {
      // Get counts for dashboard
      const [users, sessions, userSessions] = await Promise.all([
        User.getAll(),
        WhatsappSession.getAll(),
        WhatsappSession.findByUserId(req.session.userId)
      ]);
      
      // Calculate statistics
      const stats = {
        totalUsers: users.length,
        totalSessions: sessions.length,
        adminUsers: users.filter(user => user.role === 'admin').length,
        regularUsers: users.filter(user => user.role === 'user').length,
        activeSessions: sessions.filter(session => session.is_active).length,
        inactiveSessions: sessions.filter(session => !session.is_active).length
      };
      
      // Generate sample message activity data for the chart
      const messageActivity = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        messageActivity.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          incoming: Math.floor(Math.random() * 50),
          outgoing: Math.floor(Math.random() * 30)
        });
      }

      res.render('admin/dashboard', { 
        title: 'Admin Dashboard - WhatsApp Web API',
        stats,
        userSessions,
        recentUsers: users.slice(0, 5), // Add recent users for the dashboard table
        recentSessions: sessions.slice(0, 5), // Add recent sessions for the dashboard table
        messageActivity, // Add message activity data for the chart
        currentUser: {
          id: req.session.userId,
          username: req.session.username,
          role: req.session.userRole
        },
        activePage: 'admin-dashboard'
      });
    } catch (error) {
      console.error('Error rendering admin dashboard:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the dashboard',
        error
      });
    }
  }

  // Render users management page
  static async renderUsers(req, res) {
    try {
      const users = await User.getAll();
      
      res.render('admin/users', { 
        title: 'User Management - WhatsApp Web API',
        users,
        currentUserId: req.session.userId,
        currentUser: {
          id: req.session.userId,
          username: req.session.username,
          role: req.session.userRole
        },
        activePage: 'admin-users',
        totalPages: 1,
        currentPage: 1,
        search: req.query.search || ''
      });
    } catch (error) {
      console.error('Error rendering users management:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the users',
        error
      });
    }
  }

  // Create user
  static async createUser(req, res) {
    try {
      const { username, password, email, role } = req.body;
      
      // Validate input
      if (!username || !password || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username, password, and email are required' 
        });
      }
      
      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already exists' 
        });
      }
      
      // Create new user
      const userId = await User.create({
        username,
        password,
        email,
        role: role || 'user'
      });
      
      return res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        userId
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while creating the user' 
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const { username, email, password, role } = req.body;
      
      // Prevent updating own role (admin can't demote themselves)
      if (userId == req.session.userId && role && role !== 'admin') {
        return res.status(400).json({ 
          success: false, 
          message: 'You cannot change your own admin role' 
        });
      }
      
      // Check if user exists
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // If changing username, check if new username is available
      if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        
        if (existingUser && existingUser.id != userId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Username is already taken' 
          });
        }
      }
      
      // Update user
      const updateData = {};
      
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      if (role) updateData.role = role;
      
      await User.update(userId, updateData);
      
      // If updating current user, update session data
      if (userId == req.session.userId) {
        if (username) req.session.username = username;
        if (role) req.session.userRole = role;
      }
      
      return res.json({ 
        success: true, 
        message: 'User updated successfully' 
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while updating the user' 
      });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      
      // Prevent deleting own account
      if (userId == req.session.userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'You cannot delete your own account' 
        });
      }
      
      // Delete user
      const deleted = await User.delete(userId);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while deleting the user' 
      });
    }
  }

  // Render sessions management page
  static async renderSessions(req, res) {
    try {
      const sessions = await WhatsappSession.getAll();
      
      // Calculate session statistics
      const activeSessions = sessions.filter(session => session.is_active).length;
      const stats = {
        totalSessions: sessions.length,
        activeSessions: activeSessions,
        inactiveSessions: sessions.length - activeSessions
      };
      
      res.render('admin/sessions', { 
        title: 'Session Management - WhatsApp Web API',
        sessions,
        stats,
        currentUser: {
          id: req.session.userId,
          username: req.session.username,
          role: req.session.userRole
        },
        activePage: 'admin-sessions',
        totalPages: 1,
        currentPage: 1,
        search: req.query.search || ''
      });
    } catch (error) {
      console.error('Error rendering sessions management:', error);
      res.status(500).render('error', { 
        message: 'An error occurred while loading the sessions',
        error
      });
    }
  }

  // Render system settings page
  static renderSettings(req, res) {
    // Get WhatsApp Web.js version from package.json
    const packageJson = require('../package.json');
    const waWebVersion = packageJson.dependencies['whatsapp-web.js'] || 'Unknown';
    
    // System information
    const systemInfo = {
      nodeVersion: process.version,
      waWebVersion: waWebVersion,
      dbType: process.env.DB_TYPE || 'MySQL',
      osType: process.platform,
      uptime: Math.floor(process.uptime() / 3600) + ' hours'
    };
    
    res.render('admin/settings', { 
      title: 'System Settings - WhatsApp Web API',
      settings: {
        port: process.env.PORT || 3002,
        environment: process.env.NODE_ENV || 'development',
        dbHost: process.env.DB_HOST || 'localhost',
        dbName: process.env.DB_NAME || 'waweb_db',
        qrRefreshInterval: 30
      },
      systemInfo,
      currentUser: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.userRole
      },
      activePage: 'admin-settings'
    });
  }

  // Render messages for a specific session
  static async renderMessages(req, res) {
    try {
      const sessionId = req.params.sessionId;
      
      // Get session details
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).render('error', { 
          message: 'Session not found'
        });
      }
      
      // Get messages for this session
      const messages = await Message.findBySessionId(sessionId);
      
      // Get message statistics
      const stats = await Message.getStatsBySessionId(sessionId);
      
      res.render('admin/messages', { 
        title: 'WhatsApp Messages - WhatsApp Web API',
        sessionName: session.session_name,
        session,
        messages,
        stats,
        currentUser: {
          id: req.session.userId,
          username: req.session.username,
          role: req.session.userRole
        },
        activePage: 'admin-sessions'
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

module.exports = AdminController;