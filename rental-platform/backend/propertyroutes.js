const express = require('express');
const router = express.Router();
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  saveProperty,
  unsaveProperty,
  uploadPropertyPhotos
} = require('../controllers/propertyController');
const { protect, landlordOnly, tenantOnly } = require('../middleware/auth');
const { validateProperty, handleValidationErrors } = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');

// All routes are protected
router.use(protect);

// Public routes (accessible by both roles with restrictions)
router.get('/', getProperties);
router.get('/:id', getPropertyById);

// Landlord only routes
router.post('/', landlordOnly, validateProperty, handleValidationErrors, createProperty);
router.put('/:id', landlordOnly, updateProperty);
router.delete('/:id', landlordOnly, deleteProperty);
router.post('/:id/photos', landlordOnly, uploadMultiple, uploadPropertyPhotos);

// Tenant only routes
router.post('/:id/save', tenantOnly, saveProperty);
router.delete('/:id/save', tenantOnly, unsaveProperty);

module.exports = router;