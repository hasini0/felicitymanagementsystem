const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Organizer = require('../models/Organizer');

dotenv.config();

const resetOrganizerPassword = async (email, newPassword) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const organizer = await Organizer.findOne({ email });
    
    if (!organizer) {
      console.log('Organizer not found with email:', email);
      process.exit(1);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    organizer.password = await bcrypt.hash(newPassword, salt);
    
    await organizer.save();
    
    console.log('✓ Password updated successfully for:', email);
    console.log('New password:', newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node resetOrganizerPassword.js <email> <new-password>');
  console.log('Example: node resetOrganizerPassword.js organizer@example.com MyNewPass123');
  process.exit(1);
}

resetOrganizerPassword(email, newPassword);
