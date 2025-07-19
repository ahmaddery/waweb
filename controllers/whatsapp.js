const fs = require('fs');
const path = require('path');
const WhatsappSession = require('../models/whatsapp-session');
const Message = require('../models/message');

class WhatsappController {
  // Start a new WhatsApp session
  static async startSession(req, res) {
    try {
      const userId = req.session.userId;
      const { sessionName } = req.body;
      
      // Validate input
      if (!sessionName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Session name is required' 
        });
      }
      
      // Create session record in database
      const sessionId = await WhatsappSession.create({
        userId,
        sessionName
      });
      
      // The actual WhatsApp client initialization will be triggered
      // when the user scans the QR code via the Socket.io connection
      
      return res.json({ 
        success: true, 
        message: 'WhatsApp session created successfully',
        sessionId
      });
    } catch (error) {
      console.error('Error creating WhatsApp session:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while creating the session' 
      });
    }
  }

  // Delete WhatsApp session
  static async deleteSession(req, res) {
    try {
      const userId = req.session.userId;
      const sessionId = req.params.id;
      
      // Check if session exists and belongs to user (or user is admin)
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      // If not admin, verify ownership
      if (req.session.userRole !== 'admin' && session.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to delete this session' 
        });
      }
      
      // Delete session from database
      await WhatsappSession.delete(sessionId);
      
      // Delete associated messages
      await Message.deleteBySessionId(sessionId);
      
      // The WhatsApp client destruction and session file deletion
      // will be handled by the /api/whatsapp/session/:id DELETE endpoint in index.js
      
      return res.json({ 
        success: true, 
        message: 'WhatsApp session deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting WhatsApp session:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while deleting the session' 
      });
    }
  }

  // Set webhook URL for session
  static async setWebhook(req, res) {
    try {
      const userId = req.session.userId;
      const sessionId = req.params.id;
      const { url: webhookUrl } = req.body;
      
      // Check if session exists and belongs to user (or user is admin)
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      // If not admin, verify ownership
      if (req.session.userRole !== 'admin' && session.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to update this session' 
        });
      }
      
      // Update webhook URL in the database
      await WhatsappSession.update(sessionId, { webhookUrl });
      
      // The actual webhook URL will be stored in memory in index.js
      // via the /api/whatsapp/session/:id/webhook endpoint
      
      return res.json({ 
        success: true, 
        message: 'Webhook URL updated successfully' 
      });
    } catch (error) {
      console.error('Error setting webhook URL:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while setting the webhook URL' 
      });
    }
  }

  // Get session status
  static async getStatus(req, res) {
    try {
      const userId = req.session.userId;
      const sessionId = req.params.id;
      
      // Check if session exists and belongs to user (or user is admin)
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      // If not admin, verify ownership
      if (req.session.userRole !== 'admin' && session.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this session' 
        });
      }
      
      // Forward the request to index.js which manages the WhatsApp client status
      // This will be handled by the /api/whatsapp/session/:id/status endpoint in index.js
      
      return res.json({ 
        success: true, 
        status: session.is_active ? 'Connected' : 'Disconnected',
        session
      });
    } catch (error) {
      console.error('Error getting session status:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while getting the session status' 
      });
    }
  }

  // Send message
  static async sendMessage(req, res) {
    try {
      const userId = req.session.userId;
      const sessionId = req.params.id;
      const { to, message, mediaUrl } = req.body;
      
      // Validate input
      if (!to || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'Recipient and message are required' 
        });
      }
      
      // Check if session exists and belongs to user (or user is admin)
      const session = await WhatsappSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      // If not admin, verify ownership
      if (req.session.userRole !== 'admin' && session.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to use this session' 
        });
      }
      
      // Get WhatsApp clients from global scope (set by index.js)
      const whatsappClients = global.whatsappClients || {};
      const clientsReady = global.clientsReady || {};
      
      // Check if WhatsApp client exists for this session
      if (!whatsappClients[sessionId]) {
        return res.status(404).json({ 
          success: false, 
          message: 'WhatsApp client not found for this session' 
        });
      }
      
      // Check if WhatsApp client is ready
      if (!clientsReady[sessionId]) {
        return res.status(400).json({ 
          success: false, 
          message: 'WhatsApp client not ready for this session' 
        });
      }
      
      // Format the number (add @c.us suffix if not provided)
      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      
      try {
        // Check if client is still connected before sending
        const client = whatsappClients[sessionId];
        
        // Verify client state
        if (!clientsReady[sessionId] || (client.pupPage && client.pupPage.isClosed())) {
          clientsReady[sessionId] = false;
          return res.status(400).json({ 
            success: false, 
            message: 'WhatsApp session is disconnected. Please reconnect your session.' 
          });
        }
        
        // Send message through WhatsApp client
        const response = await whatsappClients[sessionId].sendMessage(formattedNumber, message);
        
        // Log message in database
        await Message.create({
          sessionId,
          messageId: response.id._serialized,
          fromNumber: 'self',
          toNumber: formattedNumber,
          messageType: mediaUrl ? 'media' : 'text',
          messageBody: message,
          mediaUrl,
          timestamp: new Date()
        });
        
        return res.json({ 
          success: true, 
          message: 'Message sent successfully',
          messageId: response.id._serialized
        });
      } catch (sendError) {
        console.error('Error sending WhatsApp message:', sendError);
        
        // Check if error is related to session closure
        if (sendError.message.includes('Session closed') || 
            sendError.message.includes('Protocol error') ||
            sendError.message.includes('Target closed')) {
          clientsReady[sessionId] = false;
          
          // Update session status in database
          await WhatsappSession.update(sessionId, { isActive: false });
          
          return res.status(400).json({ 
            success: false, 
            message: 'WhatsApp session is disconnected. Please reconnect your session to send messages.' 
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send message: ' + sendError.message 
        });
      }
    } catch (error) {
      console.error('Error in sendMessage controller:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while sending the message' 
      });
    }
  }
}

module.exports = WhatsappController;