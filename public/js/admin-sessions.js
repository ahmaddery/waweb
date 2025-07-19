/**
 * Admin Sessions Management functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the sessions page
  if (document.getElementById('admin-sessions-page')) {
    initializeSessionManagement();
  }
});

/**
 * Initialize session management functionality
 */
function initializeSessionManagement() {
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
  
  // Search form
  const searchForm = document.getElementById('session-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSessionSearch);
  }
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
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
    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
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
    const response = await fetch(`/api/admin/sessions/${sessionId}/webhook`);
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
    const response = await fetch(`/api/admin/sessions/${sessionId}/webhook`, {
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
 * Handle session search form submission
 * @param {Event} e - The form submit event
 */
function handleSessionSearch(e) {
  e.preventDefault();
  
  const form = e.target;
  const searchInput = form.querySelector('[name="search"]');
  const searchTerm = searchInput.value.trim();
  
  // If search term is empty, reload the page to show all sessions
  if (!searchTerm) {
    window.location.href = '/admin/sessions';
    return;
  }
  
  // Add search term to URL and navigate
  window.location.href = `/admin/sessions?search=${encodeURIComponent(searchTerm)}`;
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