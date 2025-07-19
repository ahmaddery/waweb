/**
 * API Documentation JavaScript
 * Handles API documentation page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize API documentation page
  if (document.getElementById('api-docs-page')) {
    initializeApiDocsPage();
  }
});

/**
 * Initialize API documentation page
 */
function initializeApiDocsPage() {
  // Initialize code highlighting
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  }

  // Initialize copy code buttons
  initializeCopyButtons();
  
  // Initialize API endpoint tabs
  initializeEndpointTabs();
  
  // Initialize API endpoint collapsible sections
  initializeCollapsibleSections();
  
  // Initialize API endpoint search
  initializeEndpointSearch();
}

/**
 * Initialize copy code buttons
 */
function initializeCopyButtons() {
  // Add copy button to each code block
  document.querySelectorAll('pre code').forEach((codeBlock) => {
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-sm btn-outline-secondary copy-btn';
    copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
    copyButton.title = 'Copy to clipboard';
    
    // Add button to code block container
    const pre = codeBlock.parentNode;
    pre.style.position = 'relative';
    pre.appendChild(copyButton);
    
    // Add click event to copy code
    copyButton.addEventListener('click', () => {
      const code = codeBlock.textContent;
      navigator.clipboard.writeText(code).then(() => {
        // Change button icon temporarily
        copyButton.innerHTML = '<i class="bi bi-check"></i>';
        setTimeout(() => {
          copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
        }, 2000);
        
        showToast('Code copied to clipboard', 'success');
      }).catch(err => {
        console.error('Failed to copy code:', err);
        showToast('Failed to copy code', 'error');
      });
    });
  });
}

/**
 * Initialize API endpoint tabs
 */
function initializeEndpointTabs() {
  // Handle tab clicks
  document.querySelectorAll('.api-category-tabs .nav-link').forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get target category
      const target = this.getAttribute('data-target');
      
      // Hide all categories
      document.querySelectorAll('.api-category').forEach(category => {
        category.style.display = 'none';
      });
      
      // Show target category
      if (target === 'all') {
        document.querySelectorAll('.api-category').forEach(category => {
          category.style.display = 'block';
        });
      } else {
        document.querySelector(`.api-category[data-category="${target}"]`).style.display = 'block';
      }
      
      // Update active tab
      document.querySelectorAll('.api-category-tabs .nav-link').forEach(t => {
        t.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
}

/**
 * Initialize API endpoint collapsible sections
 */
function initializeCollapsibleSections() {
  // Handle endpoint header clicks
  document.querySelectorAll('.api-endpoint-header').forEach(header => {
    header.addEventListener('click', function() {
      // Toggle endpoint details
      const details = this.nextElementSibling;
      if (details.classList.contains('api-endpoint-details')) {
        details.classList.toggle('show');
        
        // Toggle icon
        const icon = this.querySelector('.bi');
        if (icon) {
          if (details.classList.contains('show')) {
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
          } else {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
          }
        }
      }
    });
  });
}

/**
 * Initialize API endpoint search
 */
function initializeEndpointSearch() {
  const searchInput = document.getElementById('api-search');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    
    // Show all endpoints if search is empty
    if (!searchTerm) {
      document.querySelectorAll('.api-endpoint').forEach(endpoint => {
        endpoint.style.display = 'block';
      });
      document.querySelectorAll('.api-category').forEach(category => {
        category.style.display = 'block';
      });
      return;
    }
    
    // Filter endpoints based on search term
    document.querySelectorAll('.api-endpoint').forEach(endpoint => {
      const endpointText = endpoint.textContent.toLowerCase();
      const endpointPath = endpoint.querySelector('.endpoint-path')?.textContent.toLowerCase() || '';
      const endpointMethod = endpoint.querySelector('.endpoint-method')?.textContent.toLowerCase() || '';
      const endpointDesc = endpoint.querySelector('.endpoint-description')?.textContent.toLowerCase() || '';
      
      if (endpointText.includes(searchTerm) || 
          endpointPath.includes(searchTerm) || 
          endpointMethod.includes(searchTerm) || 
          endpointDesc.includes(searchTerm)) {
        endpoint.style.display = 'block';
        
        // Show parent category
        const category = endpoint.closest('.api-category');
        if (category) {
          category.style.display = 'block';
        }
      } else {
        endpoint.style.display = 'none';
      }
    });
    
    // Hide empty categories
    document.querySelectorAll('.api-category').forEach(category => {
      const visibleEndpoints = category.querySelectorAll('.api-endpoint[style="display: block"]');
      if (visibleEndpoints.length === 0) {
        category.style.display = 'none';
      }
    });
  });
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