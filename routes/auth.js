const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth');
const { isNotAuthenticated } = require('../middleware/auth');

// Render login page
router.get('/login', isNotAuthenticated, AuthController.renderLogin);

// Render register page
router.get('/register', isNotAuthenticated, AuthController.renderRegister);

// Login API
router.post('/api/login', AuthController.login);

// Register API
router.post('/api/register', AuthController.register);

// Logout API
router.post('/api/logout', AuthController.logout);

// Get current user info
router.get('/api/user', AuthController.getCurrentUser);

module.exports = router;