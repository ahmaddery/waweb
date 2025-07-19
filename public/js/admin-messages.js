/**
 * Admin Messages Management functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the messages page
  if (document.getElementById('admin-messages-page')) {
    initializeMessageManagement();
  }
});

/**
 * Initialize message management functionality
 */
function initializeMessageManagement() {
  // Send message form submission
  const sendMessageForm = document.getElementById('send-message-form');
  if (sendMessageForm) {
    sendMessageForm.addEventListener('submit', handleSendMessage);
  }
  
  // View message details buttons
  document.querySelectorAll('[data-action="view-message"]').forEach(button => {
    button.addEventListener('click', loadMessageDetails);
  });
  
  // Search form
  const searchForm = document.getElementById('message-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleMessageSearch);
  }
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Initialize date range picker if available
  const dateRangePicker = document.getElementById('date-range');
  if (dateRangePicker && typeof flatpickr !== 'undefined') {
    flatpickr(dateRangePicker, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      maxDate: 'today',
      defaultDate: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]
    });
  }
}

/**
 * Handle send message form submission
 * @param {Event} e - The form submit event
 */
async function handleSendMessage(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  const sessionId = formData.get('session_id');
  const phoneNumber = formData.get('phone_number');
  const messageText = formData.get('message');
  
  if (!phoneNumber || !messageText) {
    showToast('Phone number and message are required', 'error');
    return;
  }
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
  
  try {
    const response = await fetch('/api/admin/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        number: phoneNumber,
        message: messageText
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Message sent successfully', 'success');
      
      // Reset form
      form.querySelector('[name="message"]').value = '';
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('send-message-modal'));
      if (modal) {
        modal.hide();
      }
      
      // Reload page after a short delay to show the new message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast(data.message || 'Failed to send message', 'error');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showToast('An error occurred while sending the message', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send Message';
  }
}

/**
 * Load message details
 * @param {Event} e - The click event
 */
async function loadMessageDetails(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const messageId = button.getAttribute('data-message-id');
  
  if (!messageId) {
    showToast('Message ID not found', 'error');
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  
  try {
    const response = await fetch(`/api/admin/messages/${messageId}`);
    const data = await response.json();
    
    if (response.ok && data.message) {
      // Populate the message details modal
      const modal = document.getElementById('message-details-modal');
      if (modal) {
        // Set message details
        modal.querySelector('#message-id').textContent = data.message.id;
        modal.querySelector('#message-session').textContent = data.message.sessionName || 'Default';
        modal.querySelector('#message-user').textContent = data.message.username || 'Unknown';
        modal.querySelector('#message-phone').textContent = data.message.number;
        modal.querySelector('#message-type').textContent = data.message.type === 'incoming' ? 'Incoming' : 'Outgoing';
        modal.querySelector('#message-status').textContent = data.message.status || 'Unknown';
        modal.querySelector('#message-timestamp').textContent = new Date(data.message.timestamp).toLocaleString();
        
        // Set message content
        const contentElement = modal.querySelector('#message-content');
        if (contentElement) {
          // Handle different message types (text, image, document, etc.)
          if (data.message.mediaType) {
            switch (data.message.mediaType) {
              case 'image':
                contentElement.innerHTML = data.message.mediaUrl ? 
                  `<img src="${data.message.mediaUrl}" class="img-fluid" alt="Image message">` : 
                  '<p><i class="bi bi-image"></i> Image (not available)</p>';
                break;
              case 'video':
                contentElement.innerHTML = data.message.mediaUrl ? 
                  `<video src="${data.message.mediaUrl}" controls class="img-fluid"></video>` : 
                  '<p><i class="bi bi-camera-video"></i> Video (not available)</p>';
                break;
              case 'audio':
                contentElement.innerHTML = data.message.mediaUrl ? 
                  `<audio src="${data.message.mediaUrl}" controls></audio>` : 
                  '<p><i class="bi bi-music-note"></i> Audio (not available)</p>';
                break;
              case 'document':
                contentElement.innerHTML = data.message.mediaUrl ? 
                  `<p><i class="bi bi-file-earmark"></i> <a href="${data.message.mediaUrl}" target="_blank">${data.message.fileName || 'Document'}</a></p>` : 
                  '<p><i class="bi bi-file-earmark"></i> Document (not available)</p>';
                break;
              default:
                contentElement.textContent = data.message.content || '(No content)';
            }
          } else {
            contentElement.textContent = data.message.content || '(No content)';
          }
        }
        
        // Show the modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
      }
    } else {
      showToast(data.message || 'Failed to load message details', 'error');
    }
  } catch (error) {
    console.error('Error loading message details:', error);
    showToast('An error occurred while loading message details', 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Handle message search form submission
 * @param {Event} e - The form submit event
 */
function handleMessageSearch(e) {
  e.preventDefault();
  
  const form = e.target;
  const searchParams = new URLSearchParams();
  
  // Get search term
  const searchInput = form.querySelector('[name="search"]');
  if (searchInput && searchInput.value.trim()) {
    searchParams.append('search', searchInput.value.trim());
  }
  
  // Get message type filter
  const typeSelect = form.querySelector('[name="type"]');
  if (typeSelect && typeSelect.value) {
    searchParams.append('type', typeSelect.value);
  }
  
  // Get date range
  const dateRange = form.querySelector('[name="date_range"]');
  if (dateRange && dateRange.value) {
    searchParams.append('date_range', dateRange.value);
  }
  
  // Get session filter
  const sessionSelect = form.querySelector('[name="session_id"]');
  if (sessionSelect && sessionSelect.value) {
    searchParams.append('session_id', sessionSelect.value);
  }
  
  // If all parameters are empty, reload the page to show all messages
  if (searchParams.toString() === '') {
    window.location.href = '/admin/messages';
    return;
  }
  
  // Add search parameters to URL and navigate
  window.location.href = `/admin/messages?${searchParams.toString()}`;
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