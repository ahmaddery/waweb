/**
 * Admin Settings functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the settings page
  if (document.getElementById('admin-settings-page')) {
    initializeSettingsPage();
  }
});

/**
 * Initialize settings page functionality
 */
function initializeSettingsPage() {
  // Settings form submission
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
  }
  
  // Maintenance actions
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', handleMaintenanceAction);
  });
  
  // Toggle switches for boolean settings
  document.querySelectorAll('.form-check-input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const hiddenInput = document.getElementById(`${this.id}-value`);
      if (hiddenInput) {
        hiddenInput.value = this.checked ? '1' : '0';
      }
    });
  });
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Initialize log viewer
  initializeLogViewer();
}

/**
 * Handle settings form submission
 * @param {Event} e - The form submit event
 */
async function handleSaveSettings(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  
  try {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Settings saved successfully', 'success');
    } else {
      showToast(data.message || 'Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('An error occurred while saving settings', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Save Settings';
  }
}

/**
 * Handle maintenance actions
 * @param {Event} e - The click event
 */
async function handleMaintenanceAction(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const action = button.getAttribute('data-action');
  
  if (!action) {
    showToast('Action not specified', 'error');
    return;
  }
  
  // Confirm action
  const confirmMessage = button.getAttribute('data-confirm') || 'Are you sure you want to perform this action?';
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
  
  try {
    const response = await fetch(`/api/admin/maintenance/${action}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message || 'Action completed successfully', 'success');
      
      // Handle specific actions
      if (action === 'backup') {
        // If backup was successful and we have a download URL, trigger download
        if (data.downloadUrl) {
          window.location.href = data.downloadUrl;
        }
      } else if (action === 'logs') {
        // If logs action, update the log viewer
        if (data.logs) {
          updateLogViewer(data.logs);
        }
      } else if (action === 'maintenance-mode') {
        // If toggling maintenance mode, update UI
        const maintenanceModeStatus = document.getElementById('maintenance-mode-status');
        if (maintenanceModeStatus) {
          if (data.enabled) {
            maintenanceModeStatus.textContent = 'Enabled';
            maintenanceModeStatus.className = 'badge bg-danger';
            button.textContent = 'Disable Maintenance Mode';
          } else {
            maintenanceModeStatus.textContent = 'Disabled';
            maintenanceModeStatus.className = 'badge bg-success';
            button.textContent = 'Enable Maintenance Mode';
          }
        }
      }
    } else {
      showToast(data.message || 'Failed to perform action', 'error');
    }
  } catch (error) {
    console.error(`Error performing ${action}:`, error);
    showToast(`An error occurred while performing ${action}`, 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Initialize log viewer
 */
function initializeLogViewer() {
  const logViewerTab = document.getElementById('logs-tab');
  if (logViewerTab) {
    logViewerTab.addEventListener('shown.bs.tab', function() {
      // Load logs when the tab is shown
      fetchLogs();
    });
  }
  
  // Log level filter
  const logLevelFilter = document.getElementById('log-level-filter');
  if (logLevelFilter) {
    logLevelFilter.addEventListener('change', function() {
      filterLogs(this.value);
    });
  }
  
  // Log search
  const logSearch = document.getElementById('log-search');
  if (logSearch) {
    logSearch.addEventListener('input', function() {
      searchLogs(this.value);
    });
  }
  
  // Log download button
  const downloadLogsBtn = document.getElementById('download-logs-btn');
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener('click', function() {
      downloadLogs();
    });
  }
  
  // Log refresh button
  const refreshLogsBtn = document.getElementById('refresh-logs-btn');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', function() {
      fetchLogs();
    });
  }
}

/**
 * Fetch logs from the server
 */
async function fetchLogs() {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;
  
  // Show loading state
  logContainer.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div><p class="mt-3">Loading logs...</p></div>';
  
  try {
    const response = await fetch('/api/admin/logs');
    const data = await response.json();
    
    if (response.ok && data.logs) {
      updateLogViewer(data.logs);
    } else {
      logContainer.innerHTML = '<div class="alert alert-danger">Failed to load logs</div>';
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    logContainer.innerHTML = '<div class="alert alert-danger">An error occurred while loading logs</div>';
  }
}

/**
 * Update the log viewer with log data
 * @param {Array} logs - Array of log entries
 */
function updateLogViewer(logs) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;
  
  if (!logs || logs.length === 0) {
    logContainer.innerHTML = '<div class="alert alert-info">No logs available</div>';
    return;
  }
  
  // Create log table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover log-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Level</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  
  // Add log entries
  logs.forEach(log => {
    const row = document.createElement('tr');
    row.dataset.level = log.level.toLowerCase();
    row.dataset.timestamp = log.timestamp;
    row.dataset.message = log.message;
    
    // Set row class based on log level
    switch (log.level.toLowerCase()) {
      case 'error':
        row.className = 'table-danger';
        break;
      case 'warn':
        row.className = 'table-warning';
        break;
      case 'info':
        row.className = 'table-info';
        break;
      case 'debug':
        row.className = 'table-light';
        break;
    }
    
    row.innerHTML = `
      <td>${new Date(log.timestamp).toLocaleString()}</td>
      <td><span class="badge ${getBadgeClassForLogLevel(log.level)}">${log.level}</span></td>
      <td>${escapeHtml(log.message)}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Clear and add the table
  logContainer.innerHTML = '';
  logContainer.appendChild(table);
  
  // Apply current filter
  const logLevelFilter = document.getElementById('log-level-filter');
  if (logLevelFilter) {
    filterLogs(logLevelFilter.value);
  }
  
  // Apply current search
  const logSearch = document.getElementById('log-search');
  if (logSearch && logSearch.value) {
    searchLogs(logSearch.value);
  }
}

/**
 * Filter logs by level
 * @param {string} level - Log level to filter by
 */
function filterLogs(level) {
  const rows = document.querySelectorAll('.log-table tbody tr');
  
  rows.forEach(row => {
    if (level === 'all' || row.dataset.level === level.toLowerCase()) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Search logs by text
 * @param {string} searchText - Text to search for
 */
function searchLogs(searchText) {
  const rows = document.querySelectorAll('.log-table tbody tr');
  const searchLower = searchText.toLowerCase();
  
  rows.forEach(row => {
    const message = row.dataset.message.toLowerCase();
    const timestamp = row.dataset.timestamp.toLowerCase();
    
    if (message.includes(searchLower) || timestamp.includes(searchLower)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Download logs as a file
 */
async function downloadLogs() {
  try {
    const response = await fetch('/api/admin/logs/download');
    
    if (response.ok) {
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a temporary link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `waweb-logs-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      showToast('Failed to download logs', 'error');
    }
  } catch (error) {
    console.error('Error downloading logs:', error);
    showToast('An error occurred while downloading logs', 'error');
  }
}

/**
 * Get Bootstrap badge class for log level
 * @param {string} level - Log level
 * @returns {string} - Badge class
 */
function getBadgeClassForLogLevel(level) {
  switch (level.toLowerCase()) {
    case 'error':
      return 'bg-danger';
    case 'warn':
      return 'bg-warning';
    case 'info':
      return 'bg-info';
    case 'debug':
      return 'bg-secondary';
    default:
      return 'bg-light text-dark';
  }
}

/**
 * Escape HTML special characters
 * @param {string} html - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
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