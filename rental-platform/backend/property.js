const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  propertyType: {
    type: String,
    required: true,
    enum: {
      values: ['bedsitter', 'studio', '1bedroom', '2bedroom', '3bedroom', '4bedroom', 'maisonette', 'villa'],
      message: 'Please select a valid property type'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  priceFrequency: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    neighborhood: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  specifications: {
    bedrooms: {
      type: Number,
      required: true,
      min: 0
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0
    },
    area: {
      value: Number,
      unit: {
        type: String,
        enum: ['sqft', 'sqm'],
        default: 'sqft'
      }
    },
    furnished: {
      type: Boolean,
      default: false
    }
  },
  amenities: [{
    type: String,
    enum: ['Water', 'Electricity', 'Internet', 'Parking', 'Security', 'Gym', 'Pool', 'Elevator', 'Balcony', 'Garden', 'CCTV', 'Generator']
  }],
  photos: [{
    url: {
      type: String,
      required: true
    },
    publicId: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: String,
    title: String
  }],
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    whatsapp: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ['phone', 'whatsapp', 'email'],
      default: 'phone'
    }
  },
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    availableFrom: Date,
    minimumStay: Number, // in months
    maximumStay: Number // in months
  },
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rented', 'inactive'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for search functionality
propertySchema.index({ 
  'location.city': 'text', 
  'location.neighborhood': 'text',
  title: 'text',
  description: 'text'
});

// Virtual for formatted price
propertySchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(this.price);
});

// Increment views method
propertySchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

module.exports = mongoose.model('Property', propertySchema);