const mongoose = require('mongoose');

const customFormFieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true
  },
  fieldType: {
    type: String,
    enum: ['text', 'textarea', 'number', 'email', 'dropdown', 'checkbox', 'file'],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  options: [String], // For dropdown/checkbox
  validation: {
    min: Number,
    max: Number,
    pattern: String
  }
});

const merchandiseItemSchema = new mongoose.Schema({
  itemName: String,
  size: String,
  color: String,
  variants: [String],
  stockQuantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: ['NORMAL', 'MERCHANDISE']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: [true, 'Organizer is required']
  },
  organizerId: {
    type: String,
    required: true
  },
  eligibility: {
    type: String,
    enum: ['IIIT_ONLY', 'NON_IIIT_ONLY', 'ALL'],
    default: 'ALL'
  },
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required']
  },
  eventStartDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  eventEndDate: {
    type: Date,
    required: [true, 'Event end date is required']
  },
  registrationLimit: {
    type: Number,
    default: null // null means unlimited
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  eventTags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CLOSED'],
    default: 'DRAFT'
  },
  // For Normal Events
  customRegistrationForm: [customFormFieldSchema],
  
  // For Merchandise Events
  merchandiseItems: [merchandiseItemSchema],
  purchaseLimitPerParticipant: {
    type: Number,
    default: null
  },
  
  // Analytics
  registrationCount: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  attendanceCount: {
    type: Number,
    default: 0
  },
  
  // Attendance Tracking
  attendanceRecords: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer'
    },
    scanMethod: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL'],
      default: 'QR_SCAN'
    },
    notes: String
  }],
  
  // Team-based event settings
  isTeamEvent: {
    type: Boolean,
    default: false
  },
  teamSize: {
    min: {
      type: Number,
      default: 1
    },
    max: {
      type: Number,
      default: 5
    }
  },
  
  // Image/Media
  imageUrl: String,
  
  // Trending score (based on registrations in last 24h)
  trendingScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Validate dates
eventSchema.pre('validate', function(next) {
  if (this.registrationDeadline >= this.eventStartDate) {
    next(new Error('Registration deadline must be before event start date'));
  }
  if (this.eventStartDate >= this.eventEndDate) {
    next(new Error('Event start date must be before event end date'));
  }
  next();
});

// Index for better search performance
eventSchema.index({ eventName: 'text', description: 'text', eventTags: 'text' });
eventSchema.index({ status: 1, eventStartDate: 1 });
eventSchema.index({ organizer: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
