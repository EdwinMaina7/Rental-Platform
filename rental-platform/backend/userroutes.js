const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('savedProperties');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, phone, preferredLocations, maxBudget, moveInDate } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    
    // Update tenant specific fields
    if (user.role === 'tenant') {
      if (preferredLocations) user.preferredLocations = preferredLocations;
      if (maxBudget) user.maxBudget = maxBudget;
      if (moveInDate) user.moveInDate = moveInDate;
    }
    
    await user.save();
    
    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get saved properties (Tenant only)
// @route   GET /api/users/saved-properties
// @access  Private/Tenant
router.get('/saved-properties', protect, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants have saved properties' });
    }
    
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedProperties',
        match: { 'availability.isAvailable': true }
      });
    
    res.json({
      success: true,
      savedProperties: user.savedProperties
    });
  } catch (error) {
    console.error('Get saved properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;