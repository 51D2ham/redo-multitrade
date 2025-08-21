require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDb = require('../config/connectDb');
const Admin = require('../models/adminRegister');

const seedDeveloper = async () => {
  try {
    await connectDb();
    console.log('🔗 Database connected for seeding...');

    const email = process.env.DEVELOPER_EMAIL || 'admin@multitrade.com';
    const plainPassword = process.env.DEVELOPER_PASSWORD || 'SecureAdminPass123';
    const phone = process.env.DEVELOPER_PHONE || '9800000000';
    const name = process.env.DEVELOPER_NAME || 'System Administrator';

    // Check if developer admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { role: 'developer' }] 
    });

    if (existingAdmin) {
      console.log(`✅ Developer admin already exists: ${existingAdmin.email}`);
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`🔑 Role: ${existingAdmin.role}`);
      return process.exit(0);
    }

    // Create developer admin
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    const developerAdmin = new Admin({
      username: 'developer',
      email,
      fullname: name,
      phone,
      password: hashedPassword,
      gender: 'other',
      dob: new Date('1990-01-01'),
      role: 'developer',
      status: 'active',
      tokenVersion: 0
    });

    await developerAdmin.save();
    
    console.log('🎉 Developer admin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', plainPassword);
    console.log('👤 Role: developer');
    console.log('🆔 ID:', developerAdmin._id);
    console.log('\n🚀 You can now login at: http://localhost:9001/admin/v1/staff/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDeveloper();
}

module.exports = seedDeveloper;
