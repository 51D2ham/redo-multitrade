require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDb = require('../config/connectDb');
const Admin = require('../models/adminRegister');

const seedDeveloper = async () => {
  try {
    await connectDb();

    const email = process.env.DEVELOPER_EMAIL ;
    const plainPassword = process.env.DEVELOPER_PASSWORD ;
    const phone = process.env.DEVELOPER_PHONE ;
    const name = process.env.DEVELOPER_NAME ;

    // Check if developer admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { role: 'developer' }] 
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
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
    console.log('Admin created successfully');
    console.log(`Email: ${email}`);
    console.log(`Role: developer`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDeveloper();
}

module.exports = seedDeveloper;
