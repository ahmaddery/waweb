/**
 * User Dashboard JavaScript
 * Handles dashboard functionality including charts, statistics, and session management
 */

document.addEventListener('DOMContentLoaded', function() {
  // Socket.io connection
  const socket = io();
  
  // Elements
  const qrcodeContainer = document.getElementById('qrcode-container');
  const qrcodeElement = document.getElementById('qrcode');
  const qrInstructions = document.getElementById('qr-instructions');
  const connectionStatus = document.getElementById('connection-status');
  const startSessionBtn = document.getElementById('start-session-btn');
  const deleteSessionBtn = document.getElementById('delete-session-btn');
  const webhookForm = document.getElementById('webhook-form');
  const webhookUrlInput = document.getElementById('webhook-url');
  const saveWebhookBtn = document.getElementById('save-webhook-btn');
  
  // Session name modal elements
  const sessionNameModal = new bootstrap.Modal(document.getElementById('session-name-modal'));
  const sessionNameInput = document.getElementById('session-name');
  const confirmSessionBtn = document.getElementById('confirm-session-btn');
  
  // Initialize message activity chart if it exists
  initializeChart();
  
  // Load webhook URL
  loadWebhookUrl();
  
  // Update status function
  function updateStatus(status) {
    if (!connectionStatus) return;
    
    connectionStatus.textContent = status;
    
    if (status === 'Connected') {
      connectionStatus.className = 'badge bg-success';
      startSessionBtn.disabled = true;
      startSessionBtn.innerHTML = 'WhatsApp Connected';
      qrcodeContainer.innerHTML = '<div class="alert alert-success">WhatsApp is connected!</div>';
    } else if (status === 'Disconnected') {
      connectionStatus.className = 'badge bg-secondary';
      startSessionBtn.disabled = false;
      startSessionBtn.innerHTML = 'Start Session';
    } else if (status === 'Pending') {
      connectionStatus.className = 'badge bg-warning';
    }
  }
  
  // Socket.io event listeners
  socket.on('qr', (qr) => {
    if (!qrcodeElement) return;
    
    // Clear previous QR code
    qrcodeElement.innerHTML = '';
    qrInstructions.style.display = 'block';
    
    // Generate QR code
    QRCode.toCanvas(qrcodeElement, qr, function (error) {
      if (error) {
        console.error('Error generating QR code:', error);
        
        // Fallback to other methods if canvas fails
        try {
          QRCode.toDataURL(qr, function (error, url) {
            if (error) throw error;
            
            const img = document.createElement('img');
            img.src = url;
            qrcodeElement.appendChild(img);
          });
        } catch (e) {
          // Last resort: text-based QR
          qrcodeElement.innerHTML = QRCode.toString(qr);
        }
      }
    });
    
    updateStatus('Pending');
  });
  
  socket.on('ready', () => {
    updateStatus('Connected');
    showToast('WhatsApp client is connected!', 'success');
    
    // Reload page after a short delay to show the new session
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });
  
  socket.on('disconnected', () => {
    updateStatus('Disconnected');
    showToast('WhatsApp client disconnected', 'error');
  });
  
  socket.on('status', (data) => {
    updateStatus(data.status);
  });
  
  // Start session button
  if (startSessionBtn) {
    startSessionBtn.addEventListener('click', () => {
      sessionNameModal.show();
    });
  }
  
  // Confirm session button
  if (confirmSessionBtn) {
    confirmSessionBtn.addEventListener('click', async () => {
      const sessionName = sessionNameInput.value.trim();
      
      if (!sessionName) {
        showToast('Session name is required', 'error');
        return;
      }
      
      try {
        startSessionBtn.disabled = true;
        startSessionBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
        
        const response = await fetch('/api/whatsapp/session/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sessionName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          sessionNameModal.hide();
          showToast(data.message, 'success');
        } else {
          showToast(data.message || 'Failed to start session', 'error');
          startSessionBtn.disabled = false;
          startSessionBtn.textContent = 'Start Session';
        }
      } catch (error) {
        console.error('Error starting session:', error);
        showToast('An error occurred while starting the session', 'error');
        startSessionBtn.disabled = false;
        startSessionBtn.textContent = 'Start Session';
      }
    });
  }
  
  // Delete session button
  if (deleteSessionBtn) {
    deleteSessionBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this session? This will log you out of WhatsApp.')) {
        return;
      }
      
      try {
        deleteSessionBtn.disabled = true;
        deleteSessionBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
        
        const response = await fetch('/api/session/delete', {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showToast(data.message, 'success');
          updateStatus('Disconnected');
          
          // Clear QR code container
          if (qrcodeElement) {
            qrcodeElement.innerHTML = '';
            qrInstructions.style.display = 'none';
          }
          
          // Reload page after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          showToast(data.message || 'Failed to delete session', 'error');
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        showToast('An error occurred while deleting the session', 'error');
      } finally {
        deleteSessionBtn.disabled = false;
        deleteSessionBtn.textContent = 'Delete Session';
      }
    });
  }
  
  // Webhook form
  if (webhookForm) {
    webhookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const webhookUrl = webhookUrlInput.value.trim();
      
      try {
        saveWebhookBtn.disabled = true;
        saveWebhookBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        const response = await fetch('/api/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: webhookUrl })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showToast(data.message, 'success');
        } else {
          showToast(data.message || 'Failed to save webhook URL', 'error');
        }
      } catch (error) {
        console.error('Error saving webhook URL:', error);
        showToast('An error occurred while saving the webhook URL', 'error');
      } finally {
        saveWebhookBtn.disabled = false;
        saveWebhookBtn.textContent = 'Save Webhook';
      }
    });
  }
  
  // Initialize chart if element exists
  function initializeChart() {
    const chartElement = document.getElementById('messageActivityChart');
    if (!chartElement) return;
    
    const ctx = chartElement.getContext('2d');
    
    // Get initial data from the element's data attributes or fetch from API
    fetch('/api/user/dashboard/chart?period=week')
      .then(response => response.json())
      .then(data => {
        const chartData = {
          labels: data.labels,
          datasets: [
            {
              label: 'Sent',
              data: data.sent,
              backgroundColor: 'rgba(13, 110, 253, 0.2)',
              borderColor: 'rgba(13, 110, 253, 1)',
              borderWidth: 1
            },
            {
              label: 'Received',
              data: data.received,
              backgroundColor: 'rgba(25, 135, 84, 0.2)',
              borderColor: 'rgba(25, 135, 84, 1)',
              borderWidth: 1
            }
          ]
        };
        
        const messageChart = new Chart(ctx, {
          type: 'bar',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              }
            }
          }
        });
        
        // Period selector buttons
        document.querySelectorAll('[data-period]').forEach(button => {
          button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('[data-period]').forEach(btn => {
              btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const period = this.getAttribute('data-period');
            
            // Update chart data based on selected period
            fetch(`/api/user/dashboard/chart?period=${period}`)
              .then(response => response.json())
              .then(data => {
                messageChart.data.labels = data.labels;
                messageChart.data.datasets[0].data = data.sent;
                messageChart.data.datasets[1].data = data.received;
                messageChart.update();
              })
              .catch(error => console.error(`Error fetching ${period} chart data:`, error));
          });
        });
      })
      .catch(error => console.error('Error initializing chart:', error));
  }
  
  // Load webhook URL from API
  function loadWebhookUrl() {
    if (!webhookUrlInput) return;
    
    fetch('/api/webhook')
      .then(response => response.json())
      .then(data => {
        if (data.url) {
          webhookUrlInput.value = data.url;
        }
      })
      .catch(error => console.error('Error loading webhook URL:', error));
  }
  
  // Helper function for showing toast messages
  function showToast(message, type = 'success') {
    const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white ${bgClass} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    
    // Remove the element when hidden
    toast.addEventListener('hidden.bs.toast', function () {
      document.body.removeChild(toast);
    });
  }
});