/**
 * Admin Users Management functionality for WhatsApp Web API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners for the users page
  if (document.getElementById('admin-users-page')) {
    initializeUserManagement();
  }
});

/**
 * Initialize user management functionality
 */
function initializeUserManagement() {
  // Add user form submission
  const addUserForm = document.getElementById('add-user-form');
  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUser);
  }
  
  // Edit user form submission
  const editUserForm = document.getElementById('edit-user-form');
  if (editUserForm) {
    editUserForm.addEventListener('submit', handleEditUser);
  }
  
  // Delete user buttons
  document.querySelectorAll('[data-action="delete-user"]').forEach(button => {
    button.addEventListener('click', handleDeleteUser);
  });
  
  // Edit user buttons - to load user data into the edit form
  document.querySelectorAll('[data-action="edit-user"]').forEach(button => {
    button.addEventListener('click', loadUserForEditing);
  });
  
  // Search form
  const searchForm = document.getElementById('user-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleUserSearch);
  }
  
  // Password toggle in add/edit forms
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
 * Handle add user form submission
 * @param {Event} e - The form submit event
 */
async function handleAddUser(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  // Validate password match
  const password = formData.get('password');
  const passwordConfirm = formData.get('password_confirm');
  
  if (password !== passwordConfirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';
  
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('User added successfully', 'success');
      
      // Reset form
      form.reset();
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('add-user-modal'));
      if (modal) {
        modal.hide();
      }
      
      // Reload page to show new user
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast(data.message || 'Failed to add user', 'error');
    }
  } catch (error) {
    console.error('Error adding user:', error);
    showToast('An error occurred while adding the user', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Add User';
  }
}

/**
 * Handle edit user form submission
 * @param {Event} e - The form submit event
 */
async function handleEditUser(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const userId = formData.get('user_id');
  
  // Check if password is being updated
  const password = formData.get('password');
  const passwordConfirm = formData.get('password_confirm');
  
  if (password && password !== passwordConfirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  // Disable button and show loading state
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  
  // Prepare request body
  const requestBody = {
    username: formData.get('username'),
    email: formData.get('email'),
    role: formData.get('role')
  };
  
  // Only include password if it's provided
  if (password) {
    requestBody.password = password;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('User updated successfully', 'success');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('edit-user-modal'));
      if (modal) {
        modal.hide();
      }
      
      // Reload page to show updated user
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast(data.message || 'Failed to update user', 'error');
    }
  } catch (error) {
    console.error('Error updating user:', error);
    showToast('An error occurred while updating the user', 'error');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.innerHTML = 'Save Changes';
  }
}

/**
 * Handle delete user action
 * @param {Event} e - The click event
 */
async function handleDeleteUser(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const userId = button.getAttribute('data-user-id');
  
  if (!userId) {
    showToast('User ID not found', 'error');
    return;
  }
  
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('User deleted successfully', 'success');
      
      // Remove the user row from the table
      const userRow = button.closest('tr');
      if (userRow) {
        userRow.remove();
      } else {
        // Reload page if row can't be found
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      showToast(data.message || 'Failed to delete user', 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('An error occurred while deleting the user', 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Load user data for editing
 * @param {Event} e - The click event
 */
async function loadUserForEditing(e) {
  e.preventDefault();
  
  const button = e.currentTarget;
  const userId = button.getAttribute('data-user-id');
  
  if (!userId) {
    showToast('User ID not found', 'error');
    return;
  }
  
  // Disable button and show loading state
  button.disabled = true;
  const originalContent = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  
  try {
    const response = await fetch(`/api/admin/users/${userId}`);
    const data = await response.json();
    
    if (response.ok && data.user) {
      // Populate the edit form
      const form = document.getElementById('edit-user-form');
      if (form) {
        form.querySelector('[name="user_id"]').value = data.user.id;
        form.querySelector('[name="username"]').value = data.user.username;
        form.querySelector('[name="email"]').value = data.user.email;
        
        // Set role
        const roleSelect = form.querySelector('[name="role"]');
        if (roleSelect) {
          roleSelect.value = data.user.role;
        }
        
        // Clear password fields
        form.querySelector('[name="password"]').value = '';
        form.querySelector('[name="password_confirm"]').value = '';
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('edit-user-modal'));
        modal.show();
      }
    } else {
      showToast(data.message || 'Failed to load user data', 'error');
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showToast('An error occurred while loading user data', 'error');
  } finally {
    // Reset button state
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/**
 * Handle user search form submission
 * @param {Event} e - The form submit event
 */
async function handleUserSearch(e) {
  e.preventDefault();
  
  const form = e.target;
  const searchInput = form.querySelector('[name="search"]');
  const searchTerm = searchInput.value.trim();
  
  // If search term is empty, reload the page to show all users
  if (!searchTerm) {
    window.location.href = '/admin/users';
    return;
  }
  
  // Add search term to URL and navigate
  window.location.href = `/admin/users?search=${encodeURIComponent(searchTerm)}`;
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