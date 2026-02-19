const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const User = require('../models/User');

// @desc    Create inquiry (Tenant only)
// @route   POST /api/inquiries
// @access  Private/Tenant
const createInquiry = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can create inquiries' });
    }

    const { propertyId, message, moveInDate, numberOfOccupants } = req.body;

    // Find property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if property is available
    if (!property.availability.isAvailable) {
      return res.status(400).json({ message: 'This property is not available' });
    }

    // Check if tenant already has a pending inquiry for this property
    const existingInquiry = await Inquiry.findOne({
      property: propertyId,
      tenant: req.user.id,
      status: { $in: ['pending', 'viewed', 'replied'] }
    });

    if (existingInquiry) {
      return res.status(400).json({ 
        message: 'You already have an active inquiry for this property' 
      });
    }

    // Create inquiry
    const inquiry = await Inquiry.create({
      property: propertyId,
      tenant: req.user.id,
      landlord: property.landlord,
      message,
      moveInDate,
      numberOfOccupants
    });

    // Increment property inquiries count
    await Property.findByIdAndUpdate(propertyId, {
      $inc: { inquiries: 1 }
    });

    res.status(201).json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ message: 'Server error while creating inquiry' });
  }
};

// @desc    Get user's inquiries
// @route   GET /api/inquiries
// @access  Private
const getInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};

    // Filter based on user role
    if (req.user.role === 'tenant') {
      filter.tenant = req.user.id;
    } else if (req.user.role === 'landlord') {
      filter.landlord = req.user.id;
    }

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const inquiries = await Inquiry.find(filter)
      .populate('property', 'title price location propertyType photos')
      .populate('tenant', 'fullName phone email')
      .populate('landlord', 'fullName phone email companyName')
      .populate('replies.sender', 'fullName role')
      .sort(req.query.sort || '-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Inquiry.countDocuments(filter);

    res.json({
      success: true,
      count: inquiries.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      inquiries
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Server error while fetching inquiries' });
  }
};

// @desc    Get single inquiry
// @route   GET /api/inquiries/:id
// @access  Private
const getInquiryById = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('property', 'title price location propertyType photos contactInfo')
      .populate('tenant', 'fullName phone email')
      .populate('landlord', 'fullName phone email companyName')
      .populate('replies.sender', 'fullName role');

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user is authorized to view this inquiry
    if (inquiry.tenant.toString() !== req.user.id && 
        inquiry.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this inquiry' });
    }

    // Mark as viewed based on role
    if (req.user.role === 'landlord' && !inquiry.viewedByLandlord) {
      inquiry.viewedByLandlord = true;
      await inquiry.save();
    } else if (req.user.role === 'tenant' && !inquiry.viewedByTenant) {
      inquiry.viewedByTenant = true;
      await inquiry.save();
    }

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ message: 'Server error while fetching inquiry' });
  }
};

// @desc    Reply to inquiry
// @route   POST /api/inquiries/:id/reply
// @access  Private
const replyToInquiry = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user is authorized to reply
    if (inquiry.tenant.toString() !== req.user.id && 
        inquiry.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reply to this inquiry' });
    }

    // Add reply
    inquiry.replies.push({
      sender: req.user.id,
      message,
      read: false
    });

    // Update status
    inquiry.status = 'replied';

    // Reset viewed flags so the other party knows there's a new message
    if (req.user.role === 'landlord') {
      inquiry.viewedByTenant = false;
    } else {
      inquiry.viewedByLandlord = false;
    }

    await inquiry.save();

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Reply to inquiry error:', error);
    res.status(500).json({ message: 'Server error while replying to inquiry' });
  }
};

// @desc    Schedule viewing (Landlord only)
// @route   POST /api/inquiries/:id/schedule
// @access  Private/Landlord
const scheduleViewing = async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Only landlords can schedule viewings' });
    }

    const { date, time, notes } = req.body;

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required' });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user owns this property
    if (inquiry.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to schedule viewing for this inquiry' });
    }

    // Update with viewing schedule
    inquiry.scheduledViewing = {
      date,
      time,
      notes,
      confirmed: false
    };

    inquiry.status = 'scheduled';
    await inquiry.save();

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Schedule viewing error:', error);
    res.status(500).json({ message: 'Server error while scheduling viewing' });
  }
};

// @desc    Confirm viewing (Tenant only)
// @route   PUT /api/inquiries/:id/confirm-viewing
// @access  Private/Tenant
const confirmViewing = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can confirm viewings' });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user is the tenant
    if (inquiry.tenant.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this viewing' });
    }

    if (!inquiry.scheduledViewing) {
      return res.status(400).json({ message: 'No viewing scheduled for this inquiry' });
    }

    inquiry.scheduledViewing.confirmed = true;
    inquiry.status = 'scheduled';
    await inquiry.save();

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Confirm viewing error:', error);
    res.status(500).json({ message: 'Server error while confirming viewing' });
  }
};

// @desc    Update inquiry status
// @route   PUT /api/inquiries/:id/status
// @access  Private
const updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Check if user is authorized
    if (inquiry.tenant.toString() !== req.user.id && 
        inquiry.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this inquiry' });
    }

    // Validate status transition
    const validStatuses = ['pending', 'viewed', 'replied', 'scheduled', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    inquiry.status = status;
    await inquiry.save();

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({ message: 'Server error while updating inquiry status' });
  }
};

module.exports = {
  createInquiry,
  getInquiries,
  getInquiryById,
  replyToInquiry,
  scheduleViewing,
  confirmViewing,
  updateInquiryStatus
};