const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin');
const WhatsappController = require('../controllers/whatsapp');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/admin/dashboard', isAuthenticated, isAdmin, AdminController.renderDashboard);

// User management
router.get('/admin/users', isAuthenticated, isAdmin, AdminController.renderUsers);
router.post('/api/admin/users', isAuthenticated, isAdmin, AdminController.createUser);
router.put('/api/admin/users/:id', isAuthenticated, isAdmin, AdminController.updateUser);
router.delete('/api/admin/users/:id', isAuthenticated, isAdmin, AdminController.deleteUser);

// Session management
router.get('/admin/sessions', isAuthenticated, isAdmin, AdminController.renderSessions);
router.get('/admin/messages/:sessionId', isAuthenticated, isAdmin, AdminController.renderMessages);

// System settings
router.get('/admin/settings', isAuthenticated, isAdmin, AdminController.renderSettings);

// WhatsApp API endpoints (admin has access to all sessions)
router.post('/api/admin/whatsapp/session/start', isAuthenticated, isAdmin, WhatsappController.startSession);
router.delete('/api/admin/whatsapp/session/:id', isAuthenticated, isAdmin, WhatsappController.deleteSession);
router.post('/api/admin/whatsapp/session/:id/webhook', isAuthenticated, isAdmin, WhatsappController.setWebhook);
router.get('/api/admin/whatsapp/session/:id/status', isAuthenticated, isAdmin, WhatsappController.getStatus);
router.post('/api/admin/whatsapp/session/:id/send', isAuthenticated, isAdmin, WhatsappController.sendMessage);

module.exports = router;