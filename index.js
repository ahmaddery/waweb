const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Inisialisasi aplikasi Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Variabel untuk menyimpan status dan webhook URL
let whatsappClient = null;
let clientReady = false;
let webhookUrl = '';

// Inisialisasi WhatsApp client
const initWhatsappClient = () => {
  // Ensure session directory exists
  const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log('Session directory created');
  }
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('QR Code received');
    io.emit('qr', qr);
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp client is ready!');
    clientReady = true;
    io.emit('ready', { status: 'Connected' });
  });

  whatsappClient.on('disconnected', () => {
    console.log('WhatsApp client disconnected');
    clientReady = false;
    io.emit('disconnected', { status: 'Disconnected' });
  });

  whatsappClient.on('message', async (message) => {
    console.log(`Message received: ${message.body}`);
    
    // Forward message to webhook if set
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: message.from,
            body: message.body,
            timestamp: message.timestamp,
            type: message.type
          })
        });
        console.log(`Webhook notification sent: ${response.status}`);
      } catch (error) {
        console.error('Error sending webhook notification:', error);
      }
    }
  });

  whatsappClient.initialize();
};

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Emit current status to newly connected client
  socket.emit('status', { 
    status: clientReady ? 'Connected' : 'Disconnected' 
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: clientReady ? 'Connected' : 'Disconnected'
  });
});

// QR code endpoint
app.get('/api/qr', (req, res) => {
  if (!whatsappClient) {
    return res.status(404).json({ error: 'WhatsApp client not initialized' });
  }
  
  // Return the last QR code (will be handled by frontend)
  res.json({ message: 'QR code available through socket.io' });
});

// Start session endpoint
app.post('/api/session/start', (req, res) => {
  if (whatsappClient) {
    return res.status(400).json({ error: 'Session already exists' });
  }
  
  try {
    initWhatsappClient();
    res.json({ message: 'WhatsApp session started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session endpoint
app.post('/api/session/delete', async (req, res) => {
  if (!whatsappClient) {
    return res.status(404).json({ error: 'No active session' });
  }
  
  try {
    // Destroy the WhatsApp client
    await whatsappClient.destroy();
    whatsappClient = null;
    clientReady = false;
    
    // Delete all session files
    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log('All session files deleted successfully');
      } catch (fsError) {
        console.error('Error deleting session files:', fsError);
      }
    }
    
    res.json({ message: 'WhatsApp session deleted' });
    io.emit('disconnected', { status: 'Disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set webhook endpoint
app.post('/api/webhook', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }
  
  webhookUrl = url;
  res.json({ message: 'Webhook URL set successfully', url: webhookUrl });
});

// Get webhook endpoint
app.get('/api/webhook', (req, res) => {
  res.json({ url: webhookUrl });
});

// Send message endpoint
app.post('/api/send', async (req, res) => {
  if (!whatsappClient || !clientReady) {
    return res.status(400).json({ error: 'WhatsApp client not ready' });
  }
  
  const { number, message } = req.body;
  
  if (!number || !message) {
    return res.status(400).json({ error: 'Number and message are required' });
  }
  
  // Format the number (add @c.us suffix if not provided)
  const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
  
  try {
    const response = await whatsappClient.sendMessage(formattedNumber, message);
    res.json({ 
      message: 'Message sent successfully',
      messageId: response.id._serialized
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});