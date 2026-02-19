const { body, validationResult } = require('express-validator');

// Validation rules
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().trim().withMessage('Full name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['tenant', 'landlord']).withMessage('Role must be either tenant or landlord'),
  
  // Landlord specific validations
  body('companyName').if(body('role').equals('landlord')).notEmpty().withMessage('Company name is required for landlords'),
  body('businessAddress').if(body('role').equals('landlord')).notEmpty().withMessage('Business address is required for landlords')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateProperty = [
  body('title').notEmpty().trim().isLength({ max: 100 }).withMessage('Title is required and must be under 100 characters'),
  body('description').notEmpty().isLength({ max: 2000 }).withMessage('Description is required'),
  body('propertyType').isIn(['bedsitter', 'studio', '1bedroom', '2bedroom', '3bedroom', '4bedroom', 'maisonette', 'villa']),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('specifications.bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a positive number'),
  body('specifications.bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a positive number'),
  body('contactInfo.phone').notEmpty().withMessage('Phone number is required')
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateProperty,
  handleValidationErrors
};