const express = require('express');
const router = express.Router();
const {
  createInquiry,
  getInquiries,
  getInquiryById,
  replyToInquiry,
  scheduleViewing,
  confirmViewing,
  updateInquiryStatus
} = require('../controllers/inquiryController');
const { protect, tenantOnly, landlordOnly } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Routes accessible by both roles
router.get('/', getInquiries);
router.get('/:id', getInquiryById);
router.post('/:id/reply', replyToInquiry);
router.put('/:id/status', updateInquiryStatus);

// Tenant only routes
router.post('/', tenantOnly, createInquiry);
router.put('/:id/confirm-viewing', tenantOnly, confirmViewing);

// Landlord only routes
router.post('/:id/schedule', landlordOnly, scheduleViewing);

module.exports = router;