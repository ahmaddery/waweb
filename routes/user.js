const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user');
const WhatsappController = require('../controllers/whatsapp');
const { isAuthenticated, isUser } = require('../middleware/auth');

// User dashboard
router.get('/user/dashboard', isAuthenticated, isUser, UserController.renderDashboard);

// User profile
router.get('/user/profile', isAuthenticated, isUser, UserController.renderProfile);
router.post('/api/user/profile', isAuthenticated, isUser, UserController.updateProfile);

// WhatsApp sessions
router.get('/user/sessions', isAuthenticated, isUser, UserController.renderSessions);

// WhatsApp messages
router.get('/user/messages/:sessionId', isAuthenticated, isUser, UserController.renderMessages);

// WhatsApp API endpoints
router.post('/api/whatsapp/session/start', isAuthenticated, isUser, WhatsappController.startSession);
router.delete('/api/whatsapp/session/:id', isAuthenticated, isUser, WhatsappController.deleteSession);
router.post('/api/whatsapp/session/:id/webhook', isAuthenticated, isUser, WhatsappController.setWebhook);
router.get('/api/whatsapp/session/:id/status', isAuthenticated, isUser, WhatsappController.getStatus);
router.post('/api/whatsapp/session/:id/send', isAuthenticated, isUser, WhatsappController.sendMessage);

module.exports = router;