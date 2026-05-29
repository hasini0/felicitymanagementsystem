const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  teamCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: [true, 'Team leader is required']
  },
  members: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    email: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date
    }
  }],
  maxMembers: {
    type: Number,
    default: 5
  },
  minMembers: {
    type: Number,
    default: 2
  },
  status: {
    type: String,
    enum: ['DRAFT', 'REGISTERED', 'COMPLETE', 'DISBANDED'],
    default: 'DRAFT'
  },
  ticketGenerated: {
    type: Boolean,
    default: false
  },
  tickets: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    ticketId: String,
    qrCode: String,
    generatedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique team code
teamSchema.pre('save', async function(next) {
  if (!this.teamCode) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.teamCode = code;
  }
  this.updatedAt = Date.now();
  next();
});

// Method to check if team is full
teamSchema.methods.isFull = function() {
  const acceptedMembers = this.members.filter(m => m.status === 'ACCEPTED').length;
  return acceptedMembers >= this.maxMembers;
};

// Method to check if team meets minimum requirements
teamSchema.methods.meetsMinimum = function() {
  const acceptedMembers = this.members.filter(m => m.status === 'ACCEPTED').length;
  return acceptedMembers >= this.minMembers;
};

// Method to check if all invited members have responded
teamSchema.methods.allResponded = function() {
  return this.members.every(m => m.status !== 'PENDING');
};

// Method to check if team can be finalized
teamSchema.methods.canFinalize = function() {
  const acceptedMembers = this.members.filter(m => m.status === 'ACCEPTED').length;
  return acceptedMembers >= this.minMembers && acceptedMembers <= this.maxMembers;
};

// Method to check if team is complete
teamSchema.methods.isComplete = function() {
  return this.status === 'COMPLETE' && this.ticketGenerated;
};

module.exports = mongoose.model('Team', teamSchema);
