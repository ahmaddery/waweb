/**
 * User Messages Management functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the messages page
  initializeMessagesPage();
});

/**
 * Initialize messages page functionality
 */
function initializeMessagesPage() {
  // Elements
  const sendMessageForm = document.getElementById('send-message-form');
  const phoneNumberInput = document.getElementById('phone-number');
  const messageTextInput = document.getElementById('message-text');
  const sendMessageBtn = document.getElementById('send-message-btn');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const viewMessageBtns = document.querySelectorAll('.view-message-btn');
  const messageDetails = document.getElementById('message-details');
  
  // Send message button
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', handleSendMessage);
  }
  
  // Search button
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }
  
  // Search input enter key
  if (searchInput) {
    searchInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        handleSearch();
      }
    });
  }
  
  // View message buttons
  if (viewMessageBtns) {
    viewMessageBtns.forEach(button => {
      button.addEventListener('click', function() {
        const messageId = this.getAttribute('data-message-id');
        loadMessageDetails(messageId);
      });
    });
  }
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Handle send message form submission
 * @returns {Promise<void>}
 */
async function handleSendMessage() {
  const sendMessageForm = document.getElementById('send-message-form');
  const phoneNumberInput = document.getElementById('phone-number');
  const messageTextInput = document.getElementById('message-text');
  const sendMessageBtn = document.getElementById('send-message-btn');
  
  const phoneNumber = phoneNumberInput.value.trim();
  const messageText = messageTextInput.value.trim();
  
  if (!phoneNumber) {
    showToast('Phone number is required', 'error');
    return;
  }
  
  if (!messageText) {
    showToast('Message text is required', 'error');
    return;
  }
  
  try {
    sendMessageBtn.disabled = true;
    sendMessageBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
    
    // Get session ID from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || '';
    
    if (!sessionId) {
      showToast('Session ID is required', 'error');
      return;
    }
    
    const response = await fetch(`/api/whatsapp/session/${sessionId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: messageText
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message || 'Message sent successfully', 'success');
      
      // Reset form
      sendMessageForm.reset();
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('send-message-modal'));
      if (modal) {
        modal.hide();
      }
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showToast(data.message || 'Failed to send message', 'error');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showToast('An error occurred while sending the message', 'error');
  } finally {
    sendMessageBtn.disabled = false;
    sendMessageBtn.textContent = 'Send Message';
  }
}

/**
 * Handle search functionality
 */
function handleSearch() {
  const searchInput = document.getElementById('search-input');
  const searchTerm = searchInput.value.trim();
  
  if (searchTerm) {
    // Preserve existing query parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('search', searchTerm);
    
    // Redirect to the search URL
    window.location.href = window.location.pathname + '?' + urlParams.toString();
  }
}

/**
 * Load message details
 * @param {string} messageId - The ID of the message to load
 * @returns {Promise<void>}
 */
async function loadMessageDetails(messageId) {
  const messageDetails = document.getElementById('message-details');
  
  if (!messageDetails || !messageId) {
    return;
  }
  
  try {
    // Show loading spinner
    messageDetails.innerHTML = `
      <div class="d-flex justify-content-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
    
    const response = await fetch(`/api/whatsapp/message/${messageId}`);
    const data = await response.json();
    
    if (response.ok) {
      const message = data.message;
      
      let messageContent = '';
      
      if (message.message_type === 'text') {
        messageContent = `<p class="message-text">${message.message_body}</p>`;
      } else if (message.message_type === 'image') {
        messageContent = `<div class="text-center"><img src="${message.media_url}" class="img-fluid rounded" alt="Image"></div>`;
      } else if (message.message_type === 'document') {
        messageContent = `
          <div class="d-grid gap-2">
            <a href="${message.media_url}" class="btn btn-outline-primary" target="_blank">
              <i class="bi bi-file-earmark"></i> Download Document
            </a>
          </div>
        `;
      } else if (message.message_type === 'audio') {
        messageContent = `
          <div class="text-center">
            <audio controls>
              <source src="${message.media_url}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>
          </div>
        `;
      } else if (message.message_type === 'video') {
        messageContent = `
          <div class="text-center">
            <video controls class="img-fluid rounded">
              <source src="${message.media_url}" type="video/mp4">
              Your browser does not support the video element.
            </video>
          </div>
        `;
      } else {
        messageContent = `<p class="text-muted">Unsupported message type: ${message.message_type}</p>`;
      }
      
      messageDetails.innerHTML = `
        <div class="mb-3">
          <strong>Phone Number:</strong>
          <p>${message.phone_number}</p>
        </div>
        
        <div class="mb-3">
          <strong>Direction:</strong>
          <p>
            ${message.direction === 'outgoing' ? 
              '<span class="badge bg-primary">Sent</span>' : 
              '<span class="badge bg-success">Received</span>'}
          </p>
        </div>
        
        <div class="mb-3">
          <strong>Status:</strong>
          <p>
            ${getStatusBadge(message.status)}
          </p>
        </div>
        
        <div class="mb-3">
          <strong>Timestamp:</strong>
          <p>${new Date(message.created_at).toLocaleString()}</p>
        </div>
        
        <div class="mb-3">
          <strong>Content:</strong>
          ${messageContent}
        </div>
      `;
    } else {
      messageDetails.innerHTML = `
        <div class="alert alert-danger">
          ${data.message || 'Failed to load message details'}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading message details:', error);
    messageDetails.innerHTML = `
      <div class="alert alert-danger">
        An error occurred while loading message details
      </div>
    `;
  }
}

/**
 * Get status badge HTML
 * @param {string} status - The message status
 * @returns {string} - HTML for the status badge
 */
function getStatusBadge(status) {
  switch (status) {
    case 'sent':
      return '<span class="badge bg-info">Sent</span>';
    case 'delivered':
      return '<span class="badge bg-primary">Delivered</span>';
    case 'read':
      return '<span class="badge bg-success">Read</span>';
    case 'failed':
      return '<span class="badge bg-danger">Failed</span>';
    default:
      return `<span class="badge bg-secondary">${status}</span>`;
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
  toast.className = 'toast align-items-center text-white border-0';
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
  
  toast.classList.add(bgColor);
  
  // Set toast content
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${icon} me-2"></i>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
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