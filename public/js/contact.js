/**
 * Contact Page JavaScript
 * Handles contact form submission and validation
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize contact page functionality
  if (document.getElementById('contact-page')) {
    initializeContactPage();
  }
});

/**
 * Initialize contact page functionality
 */
function initializeContactPage() {
  // Initialize contact form
  initializeContactForm();
  
  // Initialize Google Maps if available
  initializeMap();
}

/**
 * Initialize contact form
 */
function initializeContactForm() {
  const contactForm = document.getElementById('contact-form');
  
  if (contactForm) {
    // Add form validation
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form elements
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const subjectInput = document.getElementById('subject');
      const messageInput = document.getElementById('message');
      const submitButton = contactForm.querySelector('button[type="submit"]');
      
      // Validate form
      let isValid = true;
      
      // Validate name
      if (!nameInput.value.trim()) {
        showInputError(nameInput, 'Please enter your name');
        isValid = false;
      } else {
        clearInputError(nameInput);
      }
      
      // Validate email
      if (!emailInput.value.trim()) {
        showInputError(emailInput, 'Please enter your email');
        isValid = false;
      } else if (!isValidEmail(emailInput.value.trim())) {
        showInputError(emailInput, 'Please enter a valid email address');
        isValid = false;
      } else {
        clearInputError(emailInput);
      }
      
      // Validate subject
      if (!subjectInput.value.trim()) {
        showInputError(subjectInput, 'Please enter a subject');
        isValid = false;
      } else {
        clearInputError(subjectInput);
      }
      
      // Validate message
      if (!messageInput.value.trim()) {
        showInputError(messageInput, 'Please enter your message');
        isValid = false;
      } else {
        clearInputError(messageInput);
      }
      
      // If form is valid, submit it
      if (isValid) {
        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
        
        // Simulate form submission
        setTimeout(() => {
          // Reset button state
          submitButton.disabled = false;
          submitButton.innerHTML = 'Send Message';
          
          // Show success message
          showToast('Your message has been sent successfully. We will get back to you soon!', 'success');
          
          // Reset form
          contactForm.reset();
        }, 1500);
      }
    });
  }
}

/**
 * Initialize Google Maps
 */
function initializeMap() {
  const mapContainer = document.getElementById('contact-map');
  
  if (mapContainer) {
    // If Google Maps API is available, initialize the map
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
      const mapOptions = {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
        zoom: 14,
        styles: [
          {
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#444444"
              }
            ]
          },
          {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [
              {
                "color": "#f2f2f2"
              }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "all",
            "stylers": [
              {
                "saturation": -100
              },
              {
                "lightness": 45
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [
              {
                "visibility": "simplified"
              }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "all",
            "stylers": [
              {
                "color": "#4e73df"
              },
              {
                "visibility": "on"
              }
            ]
          }
        ]
      };
      
      const map = new google.maps.Map(mapContainer, mapOptions);
      
      // Add marker
      const marker = new google.maps.Marker({
        position: mapOptions.center,
        map: map,
        title: 'Our Office'
      });
    } else {
      // If Google Maps API is not available, show a fallback
      mapContainer.innerHTML = '<div class="bg-light p-5 text-center">Map loading...</div>';
    }
  }
}

/**
 * Show input error message
 * @param {HTMLElement} input - The input element
 * @param {string} message - The error message
 */
function showInputError(input, message) {
  const formGroup = input.closest('.form-group');
  formGroup.classList.add('has-error');
  
  // Remove existing error message if any
  const existingError = formGroup.querySelector('.invalid-feedback');
  if (existingError) {
    existingError.remove();
  }
  
  // Add error message
  const errorMessage = document.createElement('div');
  errorMessage.className = 'invalid-feedback';
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  
  // Add error class to input
  input.classList.add('is-invalid');
  
  // Append error message after input
  input.parentNode.appendChild(errorMessage);
}

/**
 * Clear input error
 * @param {HTMLElement} input - The input element
 */
function clearInputError(input) {
  const formGroup = input.closest('.form-group');
  formGroup.classList.remove('has-error');
  
  // Remove error message if any
  const errorMessage = formGroup.querySelector('.invalid-feedback');
  if (errorMessage) {
    errorMessage.remove();
  }
  
  // Remove error class from input
  input.classList.remove('is-invalid');
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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