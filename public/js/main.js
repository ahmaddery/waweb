// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const startSessionBtn = document.getElementById('start-session');
const deleteSessionBtn = document.getElementById('delete-session');
const qrcodeContainer = document.getElementById('qrcode-container');
const sendMessageForm = document.getElementById('send-message-form');
const sendMessageBtn = document.getElementById('send-message-btn');
const sendResult = document.getElementById('send-result');
const webhookForm = document.getElementById('webhook-form');
const webhookResult = document.getElementById('webhook-result');
const currentWebhook = document.getElementById('current-webhook');

// Socket.io connection
const socket = io();

// Initialize the app
function initApp() {
  // Check current status
  fetchStatus();
  
  // Get current webhook
  fetchWebhook();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup socket listeners
  setupSocketListeners();
}

// Fetch API status
async function fetchStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    updateStatus(data.status);
  } catch (error) {
    console.error('Error fetching status:', error);
    showError('Error connecting to the server');
  }
}

// Fetch current webhook URL
async function fetchWebhook() {
  try {
    const response = await fetch('/api/webhook');
    const data = await response.json();
    if (data.url) {
      currentWebhook.textContent = data.url;
      document.getElementById('webhook-url').value = data.url;
    } else {
      currentWebhook.textContent = 'None';
    }
  } catch (error) {
    console.error('Error fetching webhook:', error);
    currentWebhook.textContent = 'Error fetching webhook';
  }
}

// Update UI based on connection status
function updateStatus(status) {
  if (status === 'Connected') {
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger');
    connectionStatus.classList.add('bg-success');
    statusText.textContent = 'Connected';
    startSessionBtn.disabled = true;
    startSessionBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> WhatsApp Connected';
    deleteSessionBtn.disabled = false;
    sendMessageBtn.disabled = false;
    qrcodeContainer.innerHTML = '<p class="text-success">WhatsApp connected successfully!</p>';
  } else {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('bg-success');
    connectionStatus.classList.add('bg-danger');
    statusText.textContent = 'Disconnected';
    startSessionBtn.disabled = false;
    startSessionBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start Session';
    deleteSessionBtn.disabled = true;
    sendMessageBtn.disabled = true;
    qrcodeContainer.innerHTML = '<p class="text-muted">Start a session to generate QR code</p>';
  }
}

// Setup event listeners for buttons and forms
function setupEventListeners() {
  // Start session button
  startSessionBtn.addEventListener('click', async () => {
    try {
      startSessionBtn.disabled = true;
      startSessionBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Starting...';
      
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        qrcodeContainer.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-3">Waiting for QR code...</p>';
      } else {
        showError(data.error || 'Failed to start session');
        startSessionBtn.disabled = false;
        startSessionBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start Session';
      }
    } catch (error) {
      console.error('Error starting session:', error);
      showError('Error connecting to the server');
      startSessionBtn.disabled = false;
      startSessionBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start Session';
    }
  });
  
  // Delete session button
  deleteSessionBtn.addEventListener('click', async () => {
    try {
      deleteSessionBtn.disabled = true;
      deleteSessionBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
      
      const response = await fetch('/api/session/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Session deleted successfully');
        // Update UI to reflect disconnected state
        updateStatus('Disconnected');
      } else {
        showError(data.error || 'Failed to delete session');
      }
      
      deleteSessionBtn.innerHTML = '<i class="bi bi-stop-fill"></i> Delete Session';
    } catch (error) {
      console.error('Error deleting session:', error);
      showError('Error connecting to the server');
      deleteSessionBtn.innerHTML = '<i class="bi bi-stop-fill"></i> Delete Session';
      deleteSessionBtn.disabled = false;
    }
  });
  
  // Send message form
  sendMessageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const messageText = document.getElementById('message-text').value.trim();
    
    if (!phoneNumber || !messageText) {
      showError('Phone number and message are required', sendResult);
      return;
    }
    
    try {
      sendMessageBtn.disabled = true;
      sendMessageBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
      
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: phoneNumber,
          message: messageText
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Message sent successfully!', sendResult);
        document.getElementById('message-text').value = '';
      } else {
        showError(data.error || 'Failed to send message', sendResult);
      }
      
      sendMessageBtn.disabled = false;
      sendMessageBtn.innerHTML = '<i class="bi bi-send"></i> Send Message';
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Error connecting to the server', sendResult);
      sendMessageBtn.disabled = false;
      sendMessageBtn.innerHTML = '<i class="bi bi-send"></i> Send Message';
    }
  });
  
  // Webhook form
  webhookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    
    if (!webhookUrl) {
      showError('Webhook URL is required', webhookResult);
      return;
    }
    
    try {
      const submitBtn = webhookForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
      
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Webhook URL saved successfully!', webhookResult);
        currentWebhook.textContent = data.url;
      } else {
        showError(data.error || 'Failed to save webhook URL', webhookResult);
      }
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Webhook';
    } catch (error) {
      console.error('Error saving webhook:', error);
      showError('Error connecting to the server', webhookResult);
      const submitBtn = webhookForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Webhook';
    }
  });
  
  // Tab navigation - update URL hash
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
      window.location.hash = this.getAttribute('href');
    });
  });
  
  // Handle URL hash on page load
  if (window.location.hash) {
    const tab = document.querySelector(`.nav-link[href="${window.location.hash}"]`);
    if (tab) {
      const bsTab = new bootstrap.Tab(tab);
      bsTab.show();
    }
  }
}

// Setup Socket.io event listeners
function setupSocketListeners() {
  // QR code received
  socket.on('qr', (qr) => {
    // Generate QR code image
    qrcodeContainer.innerHTML = '';
    
    // Create a canvas element first
    const canvas = document.createElement('canvas');
    qrcodeContainer.appendChild(canvas);
    
    // Generate QR code on the canvas
    QRCode.toCanvas(canvas, qr, { width: 250 }, function (error) {
      if (error) {
        console.error('Error generating QR code with canvas:', error);
        
        // Try alternative method using QRCode.toDataURL() as fallback
        try {
          QRCode.toDataURL(qr, { width: 250 }, function (err, dataUrl) {
            if (err) {
              console.error('Error generating QR code with dataURL:', err);
              
              // Try second fallback with toString
              try {
                QRCode.toString(qr, { type: 'svg', width: 250 }, function (err2, svgString) {
                  if (err2) {
                    console.error('Error generating QR code with SVG:', err2);
                    qrcodeContainer.innerHTML = '<p class="text-danger">Error generating QR code</p>';
                  } else {
                    qrcodeContainer.innerHTML = svgString;
                  }
                });
              } catch (fallbackError2) {
                console.error('Second fallback QR generation failed:', fallbackError2);
                qrcodeContainer.innerHTML = '<p class="text-danger">Error generating QR code</p>';
              }
            } else {
              // Create an image element and set the data URL
              const img = document.createElement('img');
              img.src = dataUrl;
              img.alt = 'WhatsApp QR Code';
              img.style.maxWidth = '100%';
              qrcodeContainer.innerHTML = '';
              qrcodeContainer.appendChild(img);
            }
          });
        } catch (fallbackError) {
          console.error('Fallback QR generation failed:', fallbackError);
          qrcodeContainer.innerHTML = '<p class="text-danger">Error generating QR code</p>';
        }
      }
    });
    
    // Add instructions
    const instructions = document.createElement('p');
    instructions.className = 'mt-3';
    instructions.textContent = 'Scan this QR code with WhatsApp on your phone';
    qrcodeContainer.appendChild(instructions);
    
    // Update button
    startSessionBtn.disabled = false;
    startSessionBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start Session';
  });
  
  // WhatsApp client ready
  socket.on('ready', (data) => {
    updateStatus('Connected');
    showSuccess('WhatsApp connected successfully!');
    // Update start session button to show connected state
    startSessionBtn.disabled = true;
    startSessionBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> WhatsApp Connected';
  });
  
  // WhatsApp client disconnected
  socket.on('disconnected', (data) => {
    updateStatus('Disconnected');
    showError('WhatsApp disconnected');
    // Update start session button to show disconnected state
    startSessionBtn.disabled = false;
    startSessionBtn.innerHTML = '<i class="bi bi-play-fill"></i> Start Session';
  });
  
  // Status update
  socket.on('status', (data) => {
    updateStatus(data.status);
  });
}

// Show success message
function showSuccess(message, element = null) {
  const alertElement = document.createElement('div');
  alertElement.className = 'alert alert-success';
  alertElement.textContent = message;
  
  if (element) {
    element.innerHTML = '';
    element.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      alertElement.remove();
    }, 5000);
  } else {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'toast position-fixed top-0 end-0 m-3';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-header bg-success text-white">
        <strong class="me-auto">Success</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }
}

// Show error message
function showError(message, element = null) {
  const alertElement = document.createElement('div');
  alertElement.className = 'alert alert-danger';
  alertElement.textContent = message;
  
  if (element) {
    element.innerHTML = '';
    element.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      alertElement.remove();
    }, 5000);
  } else {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'toast position-fixed top-0 end-0 m-3';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-header bg-danger text-white">
        <strong class="me-auto">Error</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);