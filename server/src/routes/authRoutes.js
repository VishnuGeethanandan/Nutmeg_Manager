const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgotpassword', forgotPasswordValidation, forgotPassword);
router.post('/resetpassword/:token', resetPasswordValidation, resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
