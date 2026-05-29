const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

// Create admin user if it doesn't exist
const createAdminUser = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      
      const admin = new Admin({
        email: adminEmail,
        password: adminPassword,
        isFirstUser: true
      });
      
      await admin.save();
      console.log('✓ Admin user created successfully');
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log('  Please change the password after first login!');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

module.exports = createAdminUser;
