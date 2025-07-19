/**
 * Admin Dashboard functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize charts if we're on the admin dashboard page
  const messageChart = document.getElementById('messageChart');
  
  if (messageChart) {
    initializeMessageChart();
  }
  
  // Refresh dashboard data every 60 seconds
  if (document.getElementById('admin-dashboard')) {
    setInterval(refreshDashboardData, 60000); // 60 seconds
  }
});

/**
 * Initialize the message activity chart
 */
function initializeMessageChart() {
  const ctx = document.getElementById('messageChart').getContext('2d');
  
  // Get the chart data from the data attribute
  const chartContainer = document.getElementById('chart-container');
  let chartData = [];
  let chartLabels = [];
  
  try {
    if (chartContainer) {
      chartData = JSON.parse(chartContainer.getAttribute('data-values') || '[]');
      chartLabels = JSON.parse(chartContainer.getAttribute('data-labels') || '[]');
    }
  } catch (error) {
    console.error('Error parsing chart data:', error);
    chartData = [];
    chartLabels = [];
  }
  
  // If no data is available, use placeholder data
  if (chartData.length === 0 || chartLabels.length === 0) {
    chartLabels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    chartData = [0, 0, 0, 0, 0, 0, 0];
  }
  
  // Create the chart
  const messageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Messages',
        data: chartData,
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgba(0, 123, 255, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(0, 123, 255, 0.7)',
          borderWidth: 1,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Messages: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            precision: 0
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
  
  return messageChart;
}

/**
 * Refresh dashboard data via AJAX
 */
function refreshDashboardData() {
  fetch('/api/admin/dashboard/stats')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update statistics
        updateStatElement('total-users', data.stats.totalUsers);
        updateStatElement('active-sessions', data.stats.activeSessions);
        updateStatElement('total-messages', data.stats.totalMessages);
        
        // Update system status
        if (data.stats.systemStatus) {
          updateSystemStatus(data.stats.systemStatus);
        }
        
        // Update recent users table
        if (data.recentUsers && data.recentUsers.length > 0) {
          updateRecentUsersTable(data.recentUsers);
        }
        
        // Update recent sessions table
        if (data.recentSessions && data.recentSessions.length > 0) {
          updateRecentSessionsTable(data.recentSessions);
        }
        
        // Update message chart if data is available
        if (data.messageActivity && data.messageActivity.labels && data.messageActivity.values) {
          updateMessageChart(data.messageActivity.labels, data.messageActivity.values);
        }
      }
    })
    .catch(error => {
      console.error('Error refreshing dashboard data:', error);
    });
}

/**
 * Update a statistic element with new value
 */
function updateStatElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    // Animate the number change
    const currentValue = parseInt(element.textContent.replace(/,/g, ''), 10) || 0;
    animateValue(element, currentValue, value, 500);
  }
}

/**
 * Animate a value change
 */
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    element.textContent = currentValue.toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * Update system status indicators
 */
function updateSystemStatus(status) {
  // Update CPU usage
  const cpuElement = document.getElementById('cpu-usage');
  if (cpuElement && status.cpu) {
    cpuElement.textContent = `${status.cpu}%`;
    updateProgressBar('cpu-progress', status.cpu);
  }
  
  // Update memory usage
  const memoryElement = document.getElementById('memory-usage');
  if (memoryElement && status.memory) {
    memoryElement.textContent = `${status.memory}%`;
    updateProgressBar('memory-progress', status.memory);
  }
  
  // Update disk usage
  const diskElement = document.getElementById('disk-usage');
  if (diskElement && status.disk) {
    diskElement.textContent = `${status.disk}%`;
    updateProgressBar('disk-progress', status.disk);
  }
  
  // Update uptime
  const uptimeElement = document.getElementById('uptime');
  if (uptimeElement && status.uptime) {
    uptimeElement.textContent = status.uptime;
  }
}

/**
 * Update a progress bar with a new value
 */
function updateProgressBar(id, value) {
  const progressBar = document.getElementById(id);
  if (progressBar) {
    progressBar.style.width = `${value}%`;
    progressBar.setAttribute('aria-valuenow', value);
    
    // Update color based on value
    progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
    if (value < 50) {
      progressBar.classList.add('bg-success');
    } else if (value < 80) {
      progressBar.classList.add('bg-warning');
    } else {
      progressBar.classList.add('bg-danger');
    }
  }
}

/**
 * Update the recent users table
 */
function updateRecentUsersTable(users) {
  const tableBody = document.querySelector('#recent-users-table tbody');
  if (tableBody) {
    tableBody.innerHTML = '';
    
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td><span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span></td>
        <td>${new Date(user.createdAt).toLocaleString()}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

/**
 * Update the recent sessions table
 */
function updateRecentSessionsTable(sessions) {
  const tableBody = document.querySelector('#recent-sessions-table tbody');
  if (tableBody) {
    tableBody.innerHTML = '';
    
    sessions.forEach(session => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${session.id}</td>
        <td>${session.name || 'Default'}</td>
        <td>${session.username}</td>
        <td>
          <span class="badge ${session.status === 'connected' ? 'bg-success' : 'bg-danger'}">
            ${session.status === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </td>
        <td>${new Date(session.createdAt).toLocaleString()}</td>
        <td>${session.lastActive ? new Date(session.lastActive).toLocaleString() : 'N/A'}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

/**
 * Update the message activity chart
 */
function updateMessageChart(labels, values) {
  const chartElement = document.getElementById('messageChart');
  if (chartElement) {
    const chart = Chart.getChart(chartElement);
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.update();
    }
  }
}