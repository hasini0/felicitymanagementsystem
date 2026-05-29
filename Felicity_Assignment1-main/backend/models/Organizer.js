const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const organizerSchema = new mongoose.Schema({
  organizerName: {
    type: String,
    required: [true, 'Organizer name is required'],
    unique: true,
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
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['CLUB', 'COUNCIL', 'FEST_TEAM']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    validate: [validator.isEmail, 'Please provide a valid contact email']
  },
  discordWebhook: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return validator.isURL(v);
      },
      message: 'Please provide a valid Discord webhook URL'
    }
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }],
  isApproved: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  role: {
    type: String,
    default: 'organizer'
  }
}, {
  timestamps: true
});

// Hash password before saving
organizerSchema.pre('save', async function(next) {
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
organizerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Organizer', organizerSchema);
