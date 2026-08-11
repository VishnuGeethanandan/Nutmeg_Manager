const express = require('express');
const {
  createCaptainRequest,
  getMyCaptainRequests,
  getCaptainRequests,
  approveCaptainRequest,
  rejectCaptainRequest,
} = require('../controllers/captainRequestController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Player routes
router.post('/', protect, authorize('player'), createCaptainRequest);
router.get('/me', protect, authorize('player'), getMyCaptainRequests);

// Admin routes
router.get('/', protect, authorize('admin'), getCaptainRequests);
router.patch('/:id/approve', protect, authorize('admin'), approveCaptainRequest);
router.patch('/:id/reject', protect, authorize('admin'), rejectCaptainRequest);

module.exports = router;
