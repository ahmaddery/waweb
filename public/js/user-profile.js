/**
 * User Profile functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the profile page
  if (document.getElementById('user-profile-page')) {
    initializeProfilePage();
  }
});

/**
 * Initialize profile page functionality
 */
function initializeProfilePage() {
  // Update profile form submission
  const updateProfileForm = document.getElementById('update-profile-form');
  if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', handleUpdateProfile);
  }
  
  // Change password form submission
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handleChangePassword);
  }
  
  // Password toggle in forms
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', togglePasswordVisibility);
  });
  
  // Password match validation
  const passwordConfirmFields = document.querySelectorAll('[data-match-password]');
  passwordConfirmFields.forEach(field => {
    field.addEventListener('input', validatePasswordMatch);
  });
}

/**
 * Handle update profile form submission
 * @param {Event} e - The form submit event
 */
async function handleUpdateProfile(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';
  
  try {
    const response = await fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: formData.get('username'),
        email: formData.get('email')
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Profile updated successfully', 'success');
      
      // Update displayed username if it's shown in the UI
      const usernameDisplay = document.getElementById('username-display');
      if (usernameDisplay) {
        usernameDisplay.textContent = formData.get('username');
      }
    } else {
      showToast(data.message || 'Failed to update profile', 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('An error occurred while updating your profile', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Update Profile';
  }
}

/**
 * Handle change password form submission
 * @param {Event} e - The form submit event
 */
async function handleChangePassword(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  const currentPassword = formData.get('current_password');
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');
  
  // Validate passwords
  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('All password fields are required', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';
  
  try {
    const response = await fetch('/api/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Password changed successfully', 'success');
      form.reset();
    } else {
      showToast(data.message || 'Failed to change password', 'error');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    showToast('An error occurred while changing your password', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Change Password';
  }
}

/**
 * Toggle password visibility
 * @param {Event} e - The click event
 */
function togglePasswordVisibility(e) {
  const button = e.currentTarget;
  const targetId = button.getAttribute('data-target');
  const passwordField = document.getElementById(targetId);
  
  if (passwordField) {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    
    // Toggle icon
    const icon = button.querySelector('i');
    if (icon) {
      if (type === 'text') {
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      } else {
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      }
    }
  }
}

/**
 * Validate password match
 * @param {Event} e - The input event
 */
function validatePasswordMatch(e) {
  const confirmField = e.target;
  const passwordFieldId = confirmField.getAttribute('data-match-password');
  const passwordField = document.getElementById(passwordFieldId);
  
  if (passwordField) {
    const password = passwordField.value;
    const confirmPassword = confirmField.value;
    
    if (password !== confirmPassword) {
      confirmField.setCustomValidity('Passwords do not match');
    } else {
      confirmField.setCustomValidity('');
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