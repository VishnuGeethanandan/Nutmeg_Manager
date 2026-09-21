const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createProfile,
  getMyProfile,
  updateMyProfile,
  joinTeam,
  createProfileValidation,
  updateProfileValidation,
} = require('../controllers/playerController');

// All player routes require authentication + player role
router.use(protect, authorize('player'));

// GET /api/players/me — Get own profile
router.get('/me', getMyProfile);

// POST /api/players/profile — Create profile (with optional photo upload)
router.post(
  '/profile',
  upload.single('photo'),
  createProfileValidation,
  createProfile
);

// PUT /api/players/me — Update own profile (with optional photo upload)
router.put(
  '/me',
  upload.single('photo'),
  updateProfileValidation,
  updateMyProfile
);

// POST /api/players/join-team — Player selects a team
router.post('/join-team', joinTeam);

module.exports = router;
