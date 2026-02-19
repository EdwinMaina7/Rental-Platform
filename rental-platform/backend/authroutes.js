const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration, validateLogin, handleValidationErrors } = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, registerUser);
router.post('/login', validateLogin, handleValidationErrors, loginUser);

// Private routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);

module.exports = router;