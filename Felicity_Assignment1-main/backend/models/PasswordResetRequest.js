const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Participant', 'Organizer']
  },
  email: {
    type: String,
    required: true
  },
  clubName: {
    type: String
  },
  reason: {
    type: String,
    required: [true, 'Reason for password reset is required'],
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  newPassword: {
    type: String,
    select: false
  },
  adminComments: {
    type: String,
    trim: true,
    maxlength: 500
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
