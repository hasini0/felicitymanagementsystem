const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const participantSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  participantType: {
    type: String,
    required: [true, 'Participant type is required'],
    enum: ['IIIT_STUDENT', 'NON_IIIT']
  },
  college: {
    type: String,
    required: function () {
      return this.participantType === 'NON_IIIT';
    }
  },
  organizationName: {
    type: String
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required']
  },
  areasOfInterest: [{
    type: String
  }],
  followedClubs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer'
  }],
  registeredEvents: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'CANCELLED', 'COMPLETED', 'REJECTED'],
      default: 'REGISTERED'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    teamName: String,
    ticketId: String,
    qrCode: String,
    customFormData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    },
    paymentProof: {
      type: String, // base64 encoded document
      default: null
    },
    merchandiseItems: [{
      itemName: String,
      quantity: Number,
      price: Number,
      variant: String
    }]
  }],
  role: {
    type: String,
    default: 'participant'
  }
}, {
  timestamps: true
});

// Hash password before saving
participantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
participantSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Validate IIIT email domain
participantSchema.pre('validate', function (next) {
  if (this.participantType === 'IIIT_STUDENT') {
    const iiitDomain = '@iiit.ac.in';
    if (!this.email.endsWith(iiitDomain)) {
      next(new Error('IIIT students must use IIIT-issued email ID'));
    }
  }
  next();
});

module.exports = mongoose.model('Participant', participantSchema);
