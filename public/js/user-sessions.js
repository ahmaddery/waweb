/**
 * User Sessions Management functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the sessions page
  if (document.getElementById('user-sessions-page')) {
    initializeSessionManagement();
  }
});

// Global variables
let currentSessionId = null;
let socket = null;

/**
 * Initialize session management functionality
 */
function initializeSessionManagement() {
  // Initialize Socket.io connection
  socket = io();
  
  // Setup socket event listeners
  setupSocketListeners();
  
  // Start session button
  const startSessionBtn = document.getElementById('start-session-btn');
  if (startSessionBtn) {
    startSessionBtn.addEventListener('click', showStartSessionModal);
  }
  
  // Start session form submission
  const startSessionForm = document.getElementById('start-session-form');
  if (startSessionForm) {
    startSessionForm.addEventListener('submit', handleStartSession);
  }
  
  // Delete session buttons
  document.querySelectorAll('[data-action="delete-session"]').forEach(button => {
    button.addEventListener('click', handleDeleteSession);
  });
  
  // Configure webhook buttons
  document.querySelectorAll('[data-action="configure-webhook"]').forEach(button => {
    button.addEventListener('click', loadSessionForWebhook);
  });
  
  // Webhook form submission
  const webhookForm = document.getElementById('webhook-form');
  if (webhookForm) {
    webhookForm.addEventListener('submit', handleWebhookConfiguration);
  }
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Setup Socket.io event listeners
 */
function setupSocketListeners() {
  // QR code received
  socket.on('qr', (data) => {
    console.log('QR code received:', data.sessionId);
    if (data.sessionId === currentSessionId) {
      console.log('Updating QR code for current session');
      updateQRCode(data.qr);
      updateSessionStatus('connecting');
    }
  });
  
  // WhatsApp client ready
  socket.on('ready', (data) => {
    console.log('WhatsApp client ready:', data.sessionId);
    if (data.sessionId === currentSessionId) {
      hideQRCode();
      updateSessionStatus('connected');
      showToast('WhatsApp connected successfully!', 'success');
      
      // Reload the page after a short delay to show updated session status
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  });
  
  // WhatsApp client authenticated
  socket.on('authenticated', (data) => {
    console.log('WhatsApp client authenticated:', data.sessionId);
    if (data.sessionId === currentSessionId) {
      updateSessionStatus('connected');
      showToast('WhatsApp authenticated!', 'success');
    }
  });
  
  // WhatsApp client disconnected
  socket.on('disconnected', (data) => {
    console.log('WhatsApp client disconnected:', data.sessionId);
    if (data.sessionId === currentSessionId) {
      updateSessionStatus('disconnected');
      showToast('WhatsApp disconnected' + (data.reason ? ': ' + data.reason : ''), 'error');
    }
  });
  
  // Error event
  socket.on('error', (data) => {
    console.error('WhatsApp client error:', data);
    if (data.sessionId === currentSessionId) {
      updateSessionStatus('error');
      showToast('Error: ' + data.error, 'error');
    }
  });
  
  // Authentication failure
  socket.on('auth_failure', (data) => {
    console.error('WhatsApp authentication failure:', data);
    if (data.sessionId === currentSessionId) {
      updateSessionStatus('auth_failure');
      showToast('Authentication failure: ' + data.error, 'error');
    }
  });
}

/**
 * Show the start session modal
 */
function showStartSessionModal() {
  const modal = new bootstrap.Modal(document.getElementById('start-session-modal'));
  modal.show();
}

/**
 * Handle start session form submission
 * @param {Event} e - The form submit event
 */
async function handleStartSession(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const sessionName = formData.get('session_name');
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Starting...';
  
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: sessionName
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Set current session ID for socket events
      currentSessionId = data.sessionId;
      
      // Update QR code container
      const qrContainer = document.getElementById('qrcode-container');
      if (qrContainer) {
        qrContainer.innerHTML = `
          <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Initializing WhatsApp session...</p>
          </div>
        `;
      }
      
      // Update modal title
      const modalTitle = document.querySelector('#start-session-modal .modal-title');
      if (modalTitle) {
        modalTitle.textContent = `Starting Session: ${sessionName || 'Default'}`;
      }
      
      // Hide the form and show the QR code container
      form.style.display = 'none';
      document.getElementById('qrcode-container').style.display = 'block';
      
      // Start the session
      const startResponse = await fetch(`/api/sessions/${currentSessionId}/start`, {
        method: 'POST'
      });
      
      const startData = await startResponse.json();
      
      if (!startResponse.ok) {
        throw new Error(startData.message || 'Failed to start session');
      }
    } else {
      throw new Error(data.message || 'Failed to create session');
    }
  } catch (error) {
    console.error('Error starting session:', error);
    showToast(error.message || 'An error occurred while starting the session', 'error');
    
    // Reset form
    form.style.display = 'block';
    document.getElementById('qrcode-container').style.display = 'none';
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Start Session';
  }
}

/**
 * Update the QR code display
 * @param {string} qrData - The QR code data
 */
function updateQRCode(qrData) {
  const qrContainer = document.getElementById('qrcode-container');
  
  if (qrContainer) {
    // Clear previous content
    qrContainer.innerHTML = '';
    
    // Create QR code element
    const qrElement = document.createElement('div');
    qrElement.className = 'qr-code';
    qrContainer.appendChild(qrElement);
    
    // Generate QR code
    new QRCode(qrElement, {
      text: qrData,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    // Add instructions
    const instructions = document.createElement('p');
    instructions.className = 'mt-3 text-muted';
    instructions.textContent = 'Scan this QR code with WhatsApp on your phone';
    qrContainer.appendChild(instructions);
    
    // Add status indicator
    const statusElement = document.createElement('div');
    statusElement.className = 'mt-2';
    statusElement.innerHTML = `
      <span class="badge bg-warning" id="session-status">
        <i class="bi bi-arrow-repeat"></i> Connecting...
      </span>
    `;
    qrContainer.appendChild(statusElement);
  }
}

/**
 * Hide the QR code
 */
function hideQRCode() {
  const qrContainer = document.getElementById('qrcode-container');
  
  if (qrContainer) {
    qrContainer.innerHTML = `
      <div class="text-center p-4">
        <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
        <p class="mt-3">WhatsApp connected successfully!</p>
      </div>
    `;
  }
}

/**
 * Update the session status display
 * @param {string} status - The session status (connected, connecting, disconnected)
 */
function updateSessionStatus(status) {
  const statusElement = document.getElementById('session-status');
  
  if (statusElement) {
    statusElement.className = 'badge';
    
    switch (status) {
      case 'connected':
        statusElement.classList.add('bg-success');
        statusElement.innerHTML = '<i class="bi bi-check-circle"></i> Connected';
        break;
      case 'connecting':
        statusElement.classList.add('bg-warning');
        statusElement.innerHTML = '<i class="bi bi-arrow-repeat"></i> Connecting...';
        break;
      case 'disconnected':
        statusElement.classList.add('bg-danger');
        statusElement.innerHTML = '<i class="bi bi-x-circle"></i> Disconnected';
        break;
      default:
        statusElement.classList.add('bg-secondary');
        statusElement.innerHTML = '<i class="bi bi-question-circle"></i> Unknown';
    }
  }
}

/**
 * Handle delete session action
 * @param {Event} e - The click event
 */
async function handleDeleteSession(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const sessionId = button.getAttribute('data-session-id');
  
  if (!sessionId) {
    showToast('Session ID not found', 'error');
    return;
  }
  
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this WhatsApp session? This action cannot be undone.')) {
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Session deleted successfully', 'success');
      
      // Remove the session row from the table
      const sessionRow = button.closest('tr');
      if (sessionRow) {
        sessionRow.remove();
      } else {
        // Reload page if row can't be found
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      showToast(data.message || 'Failed to delete session', 'error');
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    showToast('An error occurred while deleting the session', 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Load session data for webhook configuration
 * @param {Event} e - The click event
 */
async function loadSessionForWebhook(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const sessionId = button.getAttribute('data-session-id');
  const sessionName = button.getAttribute('data-session-name') || 'Default';
  
  if (!sessionId) {
    showToast('Session ID not found', 'error');
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  
  try {
    const response = await fetch(`/api/sessions/${sessionId}/webhook`);
    const data = await response.json();
    
    // Populate the webhook form
    const form = document.getElementById('webhook-form');
    if (form) {
      form.querySelector('[name="session_id"]').value = sessionId;
      
      // Set session name in the modal title
      const modalTitle = document.querySelector('#webhook-modal .modal-title');
      if (modalTitle) {
        modalTitle.textContent = `Configure Webhook for ${sessionName}`;
      }
      
      // Set webhook URL if available
      const webhookUrlInput = form.querySelector('[name="webhook_url"]');
      if (webhookUrlInput) {
        webhookUrlInput.value = data.webhookUrl || '';
      }
      
      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('webhook-modal'));
      modal.show();
    }
  } catch (error) {
    console.error('Error loading webhook data:', error);
    showToast('An error occurred while loading webhook data', 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Handle webhook configuration form submission
 * @param {Event} e - The form submit event
 */
async function handleWebhookConfiguration(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const sessionId = formData.get('session_id');
  const webhookUrl = formData.get('webhook_url');
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  
  try {
    const response = await fetch(`/api/sessions/${sessionId}/webhook`, {
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
      showToast('Webhook configured successfully', 'success');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('webhook-modal'));
      if (modal) {
        modal.hide();
      }
    } else {
      showToast(data.message || 'Failed to configure webhook', 'error');
    }
  } catch (error) {
    console.error('Error configuring webhook:', error);
    showToast('An error occurred while configuring the webhook', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Save Webhook';
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 */
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  // Set background color based on type
  let bgColor = 'bg-info';
  let icon = 'bi-info-circle';
  
  switch (type) {
    case 'success':
      bgColor = 'bg-success';
      icon = 'bi-check-circle';
      break;
    case 'error':
      bgColor = 'bg-danger';
      icon = 'bi-exclamation-circle';
      break;
    case 'warning':
      bgColor = 'bg-warning';
      icon = 'bi-exclamation-triangle';
      break;
  }
  
  // Set toast content
  toast.innerHTML = `
    <div class="toast-header ${bgColor} text-white">
      <i class="bi ${icon} me-2"></i>
      <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Initialize and show toast
  const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
  bsToast.show();
  
  // Remove toast from DOM after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
    
    // Remove container if empty
    if (toastContainer.children.length === 0) {
      toastContainer.remove();
    }
  });
}