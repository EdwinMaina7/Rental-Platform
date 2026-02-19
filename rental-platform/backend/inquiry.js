const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  moveInDate: {
    type: Date,
    required: true
  },
  numberOfOccupants: {
    type: Number,
    min: 1,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'viewed', 'replied', 'scheduled', 'cancelled', 'completed'],
    default: 'pending'
  },
  scheduledViewing: {
    date: Date,
    time: String,
    notes: String,
    confirmed: {
      type: Boolean,
      default: false
    }
  },
  replies: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  viewedByLandlord: {
    type: Boolean,
    default: false
  },
  viewedByTenant: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
inquirySchema.index({ property: 1, tenant: 1, landlord: 1 });
inquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);