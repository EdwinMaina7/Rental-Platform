const Property = require('../models/Property');
const User = require('../models/User');

// @desc    Create new property (Landlord only)
// @route   POST /api/properties
// @access  Private/Landlord
const createProperty = async (req, res) => {
  try {
    // Check if user is landlord
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Only landlords can list properties' });
    }

    const propertyData = {
      ...req.body,
      landlord: req.user.id
    };

    // Handle coordinates if provided
    if (req.body.latitude && req.body.longitude) {
      propertyData.location = {
        ...propertyData.location,
        coordinates: {
          lat: req.body.latitude,
          lng: req.body.longitude
        }
      };
    }

    const property = await Property.create(propertyData);

    // Update landlord's total listings count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalListings: 1 }
    });

    res.status(201).json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error while creating property' });
  }
};

// @desc    Get all properties (Tenants/Landlords)
// @route   GET /api/properties
// @access  Private
const getProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Different filters based on user role
    if (req.user.role === 'landlord') {
      // Landlords see their own properties
      filter.landlord = req.user.id;
    } else {
      // Tenants see available properties
      filter['availability.isAvailable'] = true;
      filter.status = 'active';
    }

    // Apply search filters
    if (req.query.propertyType) {
      filter.propertyType = req.query.propertyType;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
    }

    if (req.query.city) {
      filter['location.city'] = new RegExp(req.query.city, 'i');
    }

    if (req.query.bedrooms) {
      filter['specifications.bedrooms'] = parseInt(req.query.bedrooms);
    }

    if (req.query.furnished) {
      filter['specifications.furnished'] = req.query.furnished === 'true';
    }

    // Text search
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Execute query
    const properties = await Property.find(filter)
      .populate('landlord', 'fullName phone email companyName')
      .sort(req.query.sort || '-createdAt')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Property.countDocuments(filter);

    // For tenants, increment view count
    if (req.user.role === 'tenant') {
      properties.forEach(async (property) => {
        await property.incrementViews();
      });
    }

    res.json({
      success: true,
      count: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error while fetching properties' });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Private
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'fullName phone email companyName createdAt');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if tenant can view this property
    if (req.user.role === 'tenant' && !property.availability.isAvailable) {
      return res.status(403).json({ message: 'This property is not available' });
    }

    // Increment view count
    await property.incrementViews();

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error while fetching property' });
  }
};

// @desc    Update property (Landlord only)
// @route   PUT /api/properties/:id
// @access  Private/Landlord
const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns this property
    if (property.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own properties' });
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error while updating property' });
  }
};

// @desc    Delete property (Landlord only)
// @route   DELETE /api/properties/:id
// @access  Private/Landlord
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns this property
    if (property.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own properties' });
    }

    await property.deleteOne();

    // Update landlord's total listings count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalListings: -1 }
    });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error while deleting property' });
  }
};

// @desc    Save property to favorites (Tenant only)
// @route   POST /api/properties/:id/save
// @access  Private/Tenant
const saveProperty = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can save properties' });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const user = await User.findById(req.user.id);

    // Check if already saved
    if (user.savedProperties.includes(property._id)) {
      return res.status(400).json({ message: 'Property already saved' });
    }

    user.savedProperties.push(property._id);
    await user.save();

    res.json({
      success: true,
      message: 'Property saved successfully'
    });
  } catch (error) {
    console.error('Save property error:', error);
    res.status(500).json({ message: 'Server error while saving property' });
  }
};

// @desc    Remove property from favorites (Tenant only)
// @route   DELETE /api/properties/:id/save
// @access  Private/Tenant
const unsaveProperty = async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can unsave properties' });
    }

    const user = await User.findById(req.user.id);

    user.savedProperties = user.savedProperties.filter(
      id => id.toString() !== req.params.id
    );

    await user.save();

    res.json({
      success: true,
      message: 'Property removed from saved'
    });
  } catch (error) {
    console.error('Unsave property error:', error);
    res.status(500).json({ message: 'Server error while removing saved property' });
  }
};

// @desc    Upload property photos (Landlord only)
// @route   POST /api/properties/:id/photos
// @access  Private/Landlord
const uploadPropertyPhotos = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns this property
    if (property.landlord.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only add photos to your own properties' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one photo' });
    }

    // Process uploaded files
    const photos = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      isPrimary: index === 0 // First photo is primary
    }));

    property.photos.push(...photos);
    await property.save();

    res.json({
      success: true,
      photos: property.photos
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ message: 'Server error while uploading photos' });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  saveProperty,
  unsaveProperty,
  uploadPropertyPhotos
};