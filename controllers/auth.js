const User = require('../models/user');

class AuthController {
  // Login handler
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }
      
      // Find user by username
      const user = await User.findByUsername(username);
      
      // Check if user exists
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      
      // Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      
      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.userRole = user.role;
      
      // Determine redirect URL based on user role
      const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
      
      // Return success response
      return res.json({ 
        success: true, 
        message: 'Login successful', 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        redirectUrl
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'An error occurred during login' });
    }
  }

  // Register handler
  static async register(req, res) {
    try {
      const { username, password, email, role } = req.body;
      
      // Validate input
      if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: 'Username, password, and email are required' });
      }
      
      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
      
      // Create new user (only admins can create admin accounts)
      const userRole = req.session && req.session.userRole === 'admin' ? (role || 'user') : 'user';
      
      const userId = await User.create({
        username,
        password,
        email,
        role: userRole
      });
      
      // Return success response
      return res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        userId
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, message: 'An error occurred during registration' });
    }
  }

  // Logout handler
  static async logout(req, res) {
    try {
      // Destroy session
      req.session.destroy(err => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ success: false, message: 'An error occurred during logout' });
        }
        
        // Clear cookie
        res.clearCookie('connect.sid');
        
        // Return success response
        return res.json({ success: true, message: 'Logout successful' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ success: false, message: 'An error occurred during logout' });
    }
  }

  // Get current user info
  static async getCurrentUser(req, res) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      const user = await User.findById(req.session.userId);
      
      if (!user) {
        // Clear invalid session
        req.session.destroy();
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      // Return user info (excluding password)
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ success: false, message: 'An error occurred while fetching user data' });
    }
  }

  // Render login page
  static renderLogin(req, res) {
    res.render('login', { title: 'Login - WhatsApp Web API', activePage: 'login' });
  }

  // Render register page
  static renderRegister(req, res) {
    res.render('register', { title: 'Register - WhatsApp Web API', activePage: 'register' });
  }
}

module.exports = AuthController;