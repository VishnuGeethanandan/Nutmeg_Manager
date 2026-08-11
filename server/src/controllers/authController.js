const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult, body } = require('express-validator');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// --- Helper: Generate JWT and set HttpOnly cookie ---
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  // Safe user object (toJSON transform already strips passwordHash)
  const safeUser = user.toJSON();

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    user: safeUser,
  });
};

// --- Validation rules ---
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phoneNumber')
    .optional()
    .trim(),
  body('role')
    .optional()
    .isIn(['player', 'spectator', 'admin'])
    .withMessage('Role must be player, spectator, or admin'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// --- Controllers ---

/**
 * @desc    Register a new user (player or spectator only)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, password, phoneNumber, role } = req.body;

    // SECURITY: Block admin registration from public endpoint
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin registration is not allowed through this endpoint.',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user — passwordHash field receives the plain password,
    // the pre-save hook will hash it automatically
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      phoneNumber,
      role: role || 'spectator',
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // Find user with passwordHash (select: false by default, so we must explicitly select it)
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      // Generic message to prevent account enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (clear cookie)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = (_req, res) => {
  res
    .status(200)
    .cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    })
    .json({
      success: true,
      message: 'Logged out successfully.',
    });
};

/**
 * @desc    Get currently authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const user = await User.findOne({ email: req.body.email });

    // For security reasons, we send a generic response whether the user exists or not
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    // Save token & expiration to database
    await user.save({ validateBeforeSave: false });

    // Create reset url
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const message = `We received a request to reset your password.\n\nPlease go to this link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Nutmeg Manager - Password Reset Request',
        message,
      });

      res.status(200).json(genericResponse);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/resetpassword/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    // Get hashed token from URL token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user with this token and check if it's not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has expired.',
      });
    }

    // Set new password
    user.passwordHash = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Save user - the pre-save hook will hash the new password
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
