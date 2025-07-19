/**
 * Home Page JavaScript
 * Handles home page functionality including animations, scroll effects, and demo features
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize home page functionality
  if (document.getElementById('home-page')) {
    initializeHomePage();
  }
});

/**
 * Initialize home page functionality
 */
function initializeHomePage() {
  // Initialize scroll animations
  initializeScrollAnimations();
  
  // Initialize feature tabs
  initializeFeatureTabs();
  
  // Initialize demo form
  initializeDemoForm();
  
  // Initialize scroll spy
  initializeScrollSpy();
  
  // Initialize testimonial carousel
  initializeTestimonialCarousel();
}

/**
 * Initialize scroll animations
 */
function initializeScrollAnimations() {
  // Animate elements on scroll
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length > 0) {
    // Check if element is in viewport
    function isInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
        rect.bottom >= 0
      );
    }
    
    // Add animation class when element is in viewport
    function handleScroll() {
      animatedElements.forEach(element => {
        if (isInViewport(element) && !element.classList.contains('animated')) {
          element.classList.add('animated');
        }
      });
    }
    
    // Initial check
    handleScroll();
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
  }
}

/**
 * Initialize feature tabs
 */
function initializeFeatureTabs() {
  const featureTabs = document.querySelectorAll('.feature-tab');
  
  if (featureTabs.length > 0) {
    featureTabs.forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs
        featureTabs.forEach(t => {
          t.classList.remove('active');
        });
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Get target content
        const target = this.getAttribute('data-target');
        
        // Hide all content
        document.querySelectorAll('.feature-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Show target content
        document.querySelector(`.feature-content[data-content="${target}"]`).classList.add('active');
      });
    });
  }
}

/**
 * Initialize demo form
 */
function initializeDemoForm() {
  const demoForm = document.getElementById('demo-form');
  
  if (demoForm) {
    demoForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const submitButton = demoForm.querySelector('button[type="submit"]');
      const formData = new FormData(demoForm);
      
      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
      
      // Simulate form submission
      setTimeout(() => {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = 'Request Demo';
        
        // Show success message
        showToast('Thank you for your interest! We will contact you shortly.', 'success');
        
        // Reset form
        demoForm.reset();
      }, 1500);
    });
  }
}

/**
 * Initialize scroll spy
 */
function initializeScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  
  if (sections.length > 0 && navLinks.length > 0) {
    // Add scroll event listener
    window.addEventListener('scroll', () => {
      let current = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        
        if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
          current = section.getAttribute('id');
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    });
  }
}

/**
 * Initialize testimonial carousel
 */
function initializeTestimonialCarousel() {
  const testimonialCarousel = document.getElementById('testimonial-carousel');
  
  if (testimonialCarousel) {
    // If Bootstrap carousel is available, initialize it
    if (typeof bootstrap !== 'undefined') {
      new bootstrap.Carousel(testimonialCarousel, {
        interval: 5000,
        pause: 'hover'
      });
    }
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