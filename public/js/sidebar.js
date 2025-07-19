/**
 * Sidebar and navigation functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Toggle sidebar
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  
  if (sidebarToggle && sidebar && content) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      content.classList.toggle('active');
      
      // Store sidebar state in localStorage
      const sidebarActive = sidebar.classList.contains('active');
      localStorage.setItem('sidebarActive', sidebarActive);
    });
    
    // Check localStorage for sidebar state on page load
    const sidebarActive = localStorage.getItem('sidebarActive') === 'true';
    if (sidebarActive) {
      sidebar.classList.add('active');
      content.classList.add('active');
    } else {
      // On mobile, sidebar should be hidden by default
      if (window.innerWidth < 768) {
        sidebar.classList.remove('active');
        content.classList.remove('active');
      } else {
        sidebar.classList.add('active');
        content.classList.add('active');
      }
    }
  }
  
  // Handle logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Show confirmation dialog
      if (confirm('Are you sure you want to logout?')) {
        // Submit the logout form
        document.getElementById('logout-form').submit();
      }
    });
  }
  
  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
  alerts.forEach(function(alert) {
    setTimeout(function() {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
  
  // Active link highlighting
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');
  
  sidebarLinks.forEach(function(link) {
    const href = link.getAttribute('href');
    
    // Check if the current path matches the link href
    if (href === currentPath || 
        (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
      
      // If the link is in a collapse, expand it
      const collapseElement = link.closest('.collapse');
      if (collapseElement) {
        collapseElement.classList.add('show');
        
        // Activate the parent button
        const collapseToggle = document.querySelector(`[data-bs-target="#${collapseElement.id}"]`);
        if (collapseToggle) {
          collapseToggle.classList.remove('collapsed');
          collapseToggle.setAttribute('aria-expanded', 'true');
        }
      }
    }
  });
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});