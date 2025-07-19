/**
 * Authentication middleware
 */

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Store the original URL they were trying to access
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  res.redirect('/login');
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  
  // If user is logged in but not admin, redirect to user dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/user/dashboard');
  }
  
  // If not logged in, redirect to login page
  res.redirect('/login');
};

// Check if user is a regular user (not admin)
const isUser = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'user') {
    return next();
  }
  
  // If user is logged in but is admin, redirect to admin dashboard
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  
  // If not logged in, redirect to login page
  res.redirect('/login');
};

// Check if user is not authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    // Redirect based on role
    if (req.session.userRole === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/user/dashboard');
    }
  }
  
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isUser,
  isNotAuthenticated
};