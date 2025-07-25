// Global error handler agar server tidak mati jika ada error tidak tertangani
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  // Jangan process.exit, biarkan server tetap hidup
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Jangan process.exit, biarkan server tetap hidup
});
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Inisialisasi aplikasi Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Log when client receives QR event
  socket.on('qr_received_by_client', (data) => {
    console.log(`Client ${socket.id} received QR for session ${data.sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration before static files to ensure routes take precedence

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'whatsapp_web_api_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware to make user data available to all templates
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const User = require('./models/user');
      const user = await User.findById(req.session.userId);
      res.locals.user = user;
    } catch (error) {
      console.error('Error fetching user data for template:', error);
    }
  }
  next();
});

// Set up view engine for rendering pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use routes
app.use(authRoutes);
app.use(userRoutes);
app.use(adminRoutes);

// Serve static files after routes to ensure routes take precedence
app.use(express.static(path.join(__dirname, 'public')));

// Windows-friendly file cleanup utility
async function safeDeleteDirectory(dirPath, maxRetries = 3, delay = 2000) {
  if (!fs.existsSync(dirPath)) {
    return { success: true, message: 'Directory does not exist' };
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait before attempting deletion to allow file handles to be released
      if (attempt > 1) {
        console.log(`Cleanup attempt ${attempt}/${maxRetries} for ${dirPath}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Directory successfully deleted: ${dirPath}`);
      return { success: true, message: 'Directory deleted successfully' };
    } catch (error) {
      console.warn(`Cleanup attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`Final cleanup attempt failed for ${dirPath}:`, error);
        return { 
          success: false, 
          message: `Failed to delete directory after ${maxRetries} attempts: ${error.message}`,
          error 
        };
      }
    }
  }
}

// Variabel untuk menyimpan status dan webhook URL
let whatsappClients = {}; // Menyimpan client berdasarkan sessionId
let clientsReady = {}; // Menyimpan status ready berdasarkan sessionId
let webhookUrls = {}; // Menyimpan webhook URL berdasarkan sessionId
let qrCodes = {}; // Menyimpan QR code berdasarkan sessionId

// Expose to global scope for access by controllers
global.whatsappClients = whatsappClients;
global.clientsReady = clientsReady;

// Inisialisasi WhatsApp client
const initWhatsappClient = (sessionId) => {
  console.log(`Starting initWhatsappClient for session ${sessionId}`);
  
  // Ensure session directory exists
  const sessionDir = path.join(__dirname, '.wwebjs_auth', sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log(`Session directory created for ${sessionId}`);
  }
  
  console.log(`Creating WhatsApp client for session ${sessionId}`);
  whatsappClients[sessionId] = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps'
      ],
      timeout: 60000, // 60 seconds timeout
      dumpio: false // Set to true for debugging browser output
    }
  });
  
  console.log(`WhatsApp client created for session ${sessionId}, setting up event listeners`);

  // Add auth_failure event listener
  whatsappClients[sessionId].on('auth_failure', (msg) => {
    console.error(`Authentication failure for session ${sessionId}:`, msg);
    io.emit('auth_failure', { sessionId: sessionId.toString(), error: msg });
  });

  // Add loading event listener
  whatsappClients[sessionId].on('loading_screen', (percent, message) => {
    console.log(`Loading screen for session ${sessionId}: ${percent}% - ${message}`);
  });

  // Add authenticated event listener
  whatsappClients[sessionId].on('authenticated', () => {
    console.log(`WhatsApp client authenticated for session ${sessionId}`);
  });

  whatsappClients[sessionId].on('qr', (qr) => {
    console.log(`QR Code received for session ${sessionId}`);
    console.log(`QR Code length: ${qr.length} characters`);
    console.log(`QR Code data preview: ${qr.substring(0, 50)}...`);
    
    // Store QR code in memory
    qrCodes[sessionId] = qr;
    console.log(`QR code stored in memory for session ${sessionId}`);
    
    console.log(`Emitting QR code to all connected clients for session ${sessionId}`);
    io.emit('qr', { sessionId: sessionId.toString(), qr });
    console.log(`QR code emitted successfully for session ${sessionId}`);
  });

  whatsappClients[sessionId].on('ready', async () => {
    console.log(`WhatsApp client is ready for session ${sessionId}!`);
    clientsReady[sessionId] = true;
    
    // Clear QR code from memory when connected
    delete qrCodes[sessionId];
    
    io.emit('ready', { sessionId, status: 'Connected' });
    
    // Update session status in database
    try {
      const WhatsappSession = require('./models/whatsapp-session');
      await WhatsappSession.update(sessionId, { isActive: true });
    } catch (error) {
      console.error(`Error updating session status for ${sessionId}:`, error);
    }
  });

  whatsappClients[sessionId].on('disconnected', async () => {
    console.log(`WhatsApp client disconnected for session ${sessionId}`);
    clientsReady[sessionId] = false;
    
    // Keep QR code in memory for potential reconnection
    // delete qrCodes[sessionId]; // Don't delete QR code on disconnect
    
    io.emit('disconnected', { sessionId, status: 'Disconnected' });
    
    // Update session status in database
    try {
      const WhatsappSession = require('./models/whatsapp-session');
      await WhatsappSession.update(sessionId, { isActive: false });
    } catch (error) {
      console.error(`Error updating session status for ${sessionId}:`, error);
    }
  });

  whatsappClients[sessionId].on('message', async (message) => {
    console.log(`Message received for session ${sessionId}: ${message.body}`);
    
    try {
      // Save message to database
      const Message = require('./models/message');
      await Message.create({
        sessionId,
        messageId: message.id._serialized,
        fromNumber: message.from,
        toNumber: message.to,
        messageType: message.type,
        messageBody: message.body,
        mediaUrl: message.hasMedia ? await message.downloadMedia() : null,
        timestamp: new Date(message.timestamp * 1000)
      });
      
      // Forward message to webhook if set
      if (webhookUrls[sessionId]) {
        try {
          const response = await fetch(webhookUrls[sessionId], {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId,
              from: message.from,
              body: message.body,
              timestamp: message.timestamp,
              type: message.type
            })
          });
          console.log(`Webhook notification sent for session ${sessionId}: ${response.status}`);
        } catch (error) {
          console.error(`Error sending webhook notification for session ${sessionId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing message for session ${sessionId}:`, error);
    }
  });

  console.log(`Calling initialize() for WhatsApp client session ${sessionId}`);
  
  // Set a timeout for QR code generation (increase to 60 seconds)
  const qrTimeout = setTimeout(() => {
    console.log(`QR code timeout for session ${sessionId} - no QR received within 60 seconds`);
    io.emit('qr_timeout', { sessionId: sessionId.toString(), message: 'QR code generation timeout. Please try again.' });
  }, 60000); // Increase to 60 seconds
  
  // Clear timeout when QR is received
  whatsappClients[sessionId].once('qr', () => {
    console.log(`QR code received for session ${sessionId}, clearing timeout`);
    clearTimeout(qrTimeout);
  });
  
  // Clear timeout on ready
  whatsappClients[sessionId].once('ready', () => {
    console.log(`Client ready for session ${sessionId}, clearing timeout`);
    clearTimeout(qrTimeout);
  });
  
  // Clear timeout on auth failure
  whatsappClients[sessionId].once('auth_failure', () => {
    console.log(`Auth failure for session ${sessionId}, clearing timeout`);
    clearTimeout(qrTimeout);
  });
  
  // Initialize the client
  console.log(`Calling whatsappClients[${sessionId}].initialize()`);
  whatsappClients[sessionId].initialize().then(() => {
    console.log(`WhatsApp client initialize() completed successfully for session ${sessionId}`);
  }).catch(err => {
    console.error(`Error in initialize() for session ${sessionId}:`, err);
    clearTimeout(qrTimeout);
    io.emit('init_error', { sessionId: sessionId.toString(), error: err.message });
    
    // Clean up failed client
    if (whatsappClients[sessionId]) {
      try {
        whatsappClients[sessionId].destroy();
      } catch (destroyError) {
        console.error(`Error destroying failed client for session ${sessionId}:`, destroyError);
      }
      delete whatsappClients[sessionId];
      delete clientsReady[sessionId];
    }
  });
};

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Emit current status to newly connected client for all sessions
  const WhatsappSession = require('./models/whatsapp-session');
  WhatsappSession.getAll().then(sessions => {
    sessions.forEach(session => {
      socket.emit('status', { 
        sessionId: session.id,
        status: clientsReady[session.id] ? 'Connected' : 'Disconnected' 
      });
    });
  }).catch(error => {
    console.error('Error fetching sessions for socket connection:', error);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes

// Status endpoint for specific session
app.get('/api/whatsapp/session/:id/status', (req, res) => {
  const sessionId = req.params.id;
  res.json({
    sessionId,
    status: clientsReady[sessionId] ? 'Connected' : 'Disconnected'
  });
});

// QR code endpoint - returns QR code as PNG image
app.get('/api/whatsapp/session/:id/qr', async (req, res) => {
  const sessionId = req.params.id;
  
  if (!whatsappClients[sessionId]) {
    return res.status(404).json({ error: 'WhatsApp client not initialized for this session' });
  }
  
  if (!qrCodes[sessionId]) {
    return res.status(404).json({ error: 'QR code not available for this session' });
  }
  
  try {
    // Generate QR code as PNG buffer
    const qrBuffer = await qrcode.toBuffer(qrCodes[sessionId], {
      type: 'png',
      width: 256,
      margin: 2
    });
    
    // Set response headers for PNG image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', qrBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the QR code image
    res.send(qrBuffer);
  } catch (error) {
    console.error('Error generating QR code image:', error);
    res.status(500).json({ error: 'Failed to generate QR code image' });
  }
});

// QR code endpoint as JSON (for backward compatibility)
app.get('/api/whatsapp/session/:id/qr/json', (req, res) => {
  const sessionId = req.params.id;
  
  if (!whatsappClients[sessionId]) {
    return res.status(404).json({ error: 'WhatsApp client not initialized for this session' });
  }
  
  if (!qrCodes[sessionId]) {
    return res.status(404).json({ error: 'QR code not available for this session' });
  }
  
  res.json({ 
    success: true,
    sessionId,
    qr: qrCodes[sessionId]
  });
});

// Start session endpoint
app.post('/api/whatsapp/session/start', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  if (whatsappClients[sessionId]) {
    return res.status(400).json({ error: 'Session already exists' });
  }
  
  try {
    // Initialize WhatsApp client for this session
    initWhatsappClient(sessionId);
    res.json({ 
      success: true,
      message: 'WhatsApp session started',
      sessionId
    });
  } catch (error) {
    console.error('Error starting WhatsApp session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete session endpoint
app.delete('/api/whatsapp/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  
  if (!whatsappClients[sessionId]) {
    return res.status(404).json({ error: 'No active session with this ID' });
  }
  
  try {
    // Destroy the WhatsApp client with graceful cleanup
    console.log(`Starting graceful cleanup for session ${sessionId}`);
    
    // First, try to gracefully disconnect
    if (whatsappClients[sessionId] && whatsappClients[sessionId].info) {
      try {
        await whatsappClients[sessionId].logout();
        console.log(`Session ${sessionId} logged out successfully`);
      } catch (logoutError) {
        console.warn(`Logout warning for session ${sessionId}:`, logoutError.message);
        // Don't throw error here, continue with destroy
      }
    }
    
    // Add delay to allow file handles to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now destroy the client
    await whatsappClients[sessionId].destroy();
    console.log(`Client destroyed for session ${sessionId}`);
    
    delete whatsappClients[sessionId];
    delete clientsReady[sessionId];
    
    // Clean up QR code from memory
    delete qrCodes[sessionId];

    // Delete session files with retry mechanism for Windows
    const sessionDir = path.join(__dirname, '.wwebjs_auth', sessionId);
    const deleteResult = await safeDeleteDirectory(sessionDir);
    
    if (!deleteResult.success) {
      console.warn(`Session ${sessionId} cleanup warning: ${deleteResult.message}`);
    }
    
    // Update session status in database
    const WhatsappSession = require('./models/whatsapp-session');
    await WhatsappSession.update(sessionId, { isActive: false });
    
    res.json({ 
      success: true,
      message: 'WhatsApp session deleted',
      sessionId 
    });
    io.emit('disconnected', { sessionId, status: 'Disconnected' });
  } catch (error) {
    console.error('Error deleting WhatsApp session:', error);
    
    // Even if there's an error, try to clean up what we can
    try {
      if (whatsappClients[sessionId]) {
        delete whatsappClients[sessionId];
        delete clientsReady[sessionId];
        delete qrCodes[sessionId];
      }
      
      // Update database status regardless of cleanup errors
      const WhatsappSession = require('./models/whatsapp-session');
      await WhatsappSession.update(sessionId, { isActive: false });
      
      io.emit('disconnected', { sessionId, status: 'Disconnected' });
    } catch (cleanupError) {
      console.error('Error in cleanup during error handling:', cleanupError);
    }
    
    // Return appropriate error based on error type
    if (error.message && error.message.includes('EBUSY')) {
      res.status(500).json({ 
        error: 'Session is busy. Files may still be in use. Please try again in a few moments.',
        code: 'EBUSY',
        sessionId 
      });
    } else {
      res.status(500).json({ 
        error: error.message,
        sessionId 
      });
    }
  }
});

// Set webhook endpoint for specific session
app.post('/api/whatsapp/webhook/:id', async (req, res) => {
  const sessionId = req.params.id;
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }
  
  // Store webhook URL in memory
  webhookUrls[sessionId] = url;
  
  // Update webhook URL in database
  try {
    const WhatsappSession = require('./models/whatsapp-session');
    await WhatsappSession.update(sessionId, { webhookUrl: url });
    
    res.json({ 
      success: true,
      message: 'Webhook URL set successfully', 
      sessionId,
      url: webhookUrls[sessionId] 
    });
  } catch (error) {
    console.error('Error setting webhook URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get webhook endpoint for specific session
app.get('/api/whatsapp/session/:id/webhook', async (req, res) => {
  const sessionId = req.params.id;
  
  try {
    // Get webhook URL from database
    const WhatsappSession = require('./models/whatsapp-session');
    const session = await WhatsappSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update in-memory webhook URL
    if (session.webhook_url) {
      webhookUrls[sessionId] = session.webhook_url;
    }
    
    res.json({ 
      success: true,
      sessionId,
      url: webhookUrls[sessionId] || session.webhook_url || null 
    });
  } catch (error) {
    console.error('Error getting webhook URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global webhook endpoints (seperti di waweb-referensi untuk backward compatibility)
app.post('/api/webhook', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    // Import Settings model
    const Settings = require('./models/settings');
    
    // Save to database
    await Settings.setGlobalWebhookUrl(url);
    
    // Log for debugging
    console.log('[DEBUG] Global webhook URL set:', url);
    
    res.json({ 
      message: 'Webhook URL saved successfully', 
      url: url 
    });
  } catch (error) {
    console.error('[ERROR] Global webhook POST error:', error);
    res.status(500).json({ error: 'Failed to save webhook URL' });
  }
});

app.get('/api/webhook', async (req, res) => {
  try {
    // Import Settings model
    const Settings = require('./models/settings');
    
    // Get from database
    const webhookUrl = await Settings.getGlobalWebhookUrl();
    
    // Log for debugging
    console.log('[DEBUG] Global webhook GET requested, URL:', webhookUrl);
    
    res.json({ url: webhookUrl || '' });
  } catch (error) {
    console.error('[ERROR] Global webhook GET error:', error);
    res.status(500).json({ error: 'Failed to get webhook URL' });
  }
});

// Send message endpoint is now handled by WhatsappController in user routes

// Create session endpoint
app.post('/api/sessions', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name: sessionName } = req.body;
    
    // Validate input
    if (!sessionName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session name is required' 
      });
    }
    
    // Create session record in database
    const WhatsappSession = require('./models/whatsapp-session');
    const sessionId = await WhatsappSession.create({
      userId,
      sessionName
    });
    
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
});

// Start session endpoint
app.post('/api/sessions/:id/start', async (req, res) => {
  try {
    const sessionId = req.params.id;
    console.log(`Starting session for ID: ${sessionId}`);
    
    // Check if client already exists and is ready
    if (whatsappClients[sessionId] && clientsReady[sessionId]) {
      console.log(`Session ${sessionId} is already connected`);
      return res.json({ 
        success: true,
        message: 'WhatsApp session is already connected',
        sessionId,
        status: 'already_connected'
      });
    }
    
    // Check if client exists but not ready (still initializing)
    if (whatsappClients[sessionId] && !clientsReady[sessionId]) {
      console.log(`Session ${sessionId} is already initializing`);
      return res.json({ 
        success: true,
        message: 'WhatsApp session is initializing, please wait for QR code',
        sessionId,
        status: 'initializing'
      });
    }
    
    // If client doesn't exist, create and initialize it
    if (!whatsappClients[sessionId]) {
      console.log(`Initializing WhatsApp client for session ${sessionId}`);
      initWhatsappClient(sessionId);
    }
    
    console.log(`Sending success response for session ${sessionId}`);
    res.json({ 
      success: true,
      message: 'WhatsApp session started',
      sessionId,
      status: 'starting'
    });
  } catch (error) {
    console.error('Error starting WhatsApp session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Restart session endpoint for disconnected sessions
app.post('/api/sessions/:id/restart', async (req, res) => {
  try {
    const sessionId = req.params.id;
    console.log(`Restarting session for ID: ${sessionId}`);
    
    // Clean up existing client if it exists
    if (whatsappClients[sessionId]) {
      try {
        await whatsappClients[sessionId].destroy();
      } catch (destroyError) {
        console.error(`Error destroying existing client for session ${sessionId}:`, destroyError);
      }
      delete whatsappClients[sessionId];
      delete clientsReady[sessionId];
    }
    
    // Initialize WhatsApp client for this session
    console.log(`Initializing WhatsApp client for session ${sessionId}`);
    initWhatsappClient(sessionId);
    
    // Add error handler before initializing
    whatsappClients[sessionId].on('auth_failure', (msg) => {
      console.error(`Authentication failure for session ${sessionId}:`, msg);
      io.emit('auth_failure', { sessionId, error: msg });
    });
    
    whatsappClients[sessionId].on('disconnected', (reason) => {
      console.log(`WhatsApp client disconnected for session ${sessionId}: ${reason}`);
      io.emit('disconnected', { sessionId, status: 'Disconnected', reason });
    });
    
    // Initialize the client with error handling
    console.log(`Calling initialize() for session ${sessionId}`);
    whatsappClients[sessionId].initialize().catch(err => {
      console.error(`Error initializing WhatsApp client for session ${sessionId}:`, err);
      io.emit('error', { sessionId, error: err.message });
    });
    
    console.log(`Sending success response for restarted session ${sessionId}`);
    res.json({ 
      success: true,
      message: 'WhatsApp session restarted successfully',
      sessionId
    });
  } catch (error) {
    console.error('Error restarting WhatsApp session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Redirect root to login page
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    // Redirect based on role
    if (req.session.userRole === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/user/dashboard');
    }
  }
  res.redirect('/login');
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: { status: 404 }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Function to sync database session status with actual client status
async function syncSessionStatus() {
  try {
    console.log('Syncing session status with database...');
    const WhatsappSession = require('./models/whatsapp-session');
    
    // Get all sessions from database
    const sessions = await WhatsappSession.getAll();
    
    for (const session of sessions) {
      const sessionId = session.id.toString();
      
      // Check if client actually exists and is ready
      const isClientReady = whatsappClients[sessionId] && clientsReady[sessionId];
      
      // If database shows active but client doesn't exist, update database
      if (session.is_active && !isClientReady) {
        console.log(`Session ${sessionId} marked as active in database but client not found. Updating status to inactive.`);
        await WhatsappSession.update(sessionId, { isActive: false });
        
        // Emit disconnected status to all clients
        io.emit('disconnected', { sessionId, status: 'Disconnected' });
      }
      
      // If client exists but database shows inactive, update database
      if (!session.is_active && isClientReady) {
        console.log(`Session ${sessionId} has active client but database shows inactive. Updating status to active.`);
        await WhatsappSession.update(sessionId, { isActive: true });
        
        // Emit connected status to all clients
        io.emit('ready', { sessionId, status: 'Connected' });
      }
    }
    
    console.log('Session status sync completed.');
  } catch (error) {
    console.error('Error syncing session status:', error);
  }
}

// Start the server
const PORT = process.env.PORT || 3003;

// Test database connection before starting server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    // Auto-restart all active WhatsApp sessions with retry logic
    try {
      const WhatsappSession = require('./models/whatsapp-session');
      const sessions = await WhatsappSession.getAll();
      let restartedCount = 0;
      for (const session of sessions) {
        const sessionId = session.id.toString();
        console.log(`[Auto-Restart] Mencoba inisialisasi WhatsApp client untuk session ${sessionId} (status: ${session.is_active ? 'active' : 'inactive'})`);
        let success = false;
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await new Promise(resolve => setTimeout(resolve, attempt > 1 ? 2000 : 0));
            initWhatsappClient(sessionId);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            console.warn(`[Auto-Restart] Percobaan ${attempt} gagal untuk session ${sessionId}:`, err.message);
          }
        }
        if (success) {
          restartedCount++;
        } else {
          console.error(`[Auto-Restart] Gagal inisialisasi session ${sessionId} setelah 3x percobaan. Tandai sebagai inactive.`);
          try {
            await WhatsappSession.update(sessionId, { isActive: false });
          } catch (dbErr) {
            console.error(`[Auto-Restart] Error update status session ${sessionId}:`, dbErr);
          }
        }
      }
      console.log(`[Auto-Restart] ${restartedCount} WhatsApp session berhasil diinisialisasi pada server startup.`);
    } catch (autoError) {
      console.error('[Auto-Restart] Error initializing active sessions:', autoError);
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`- Admin login: username=admin, password=admin123`);
      console.log(`- User login: username=user, password=user123`);
      
      // Sync session status after server starts
      setTimeout(() => {
        syncSessionStatus();
      }, 2000); // Wait 2 seconds for server to fully initialize
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();