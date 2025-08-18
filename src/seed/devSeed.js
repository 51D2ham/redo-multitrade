require('dotenv').config();
const bcrypt = require('bcrypt');
const connectDb = require('../config/connectDb');
const Admin = require('../models/adminRegister');

const seedDeveloper = async () => {
  await connectDb();

  const email = process.env.DEVELOPER_EMAIL;
  const plainPassword = process.env.DEVELOPER_PASSWORD;
  // Used hardcoded fake values for phone and gender
  const phone = '1234567890';
  const gender = 'Other';

  if (!email || !plainPassword) {
    console.error('Please set DEVELOPER_EMAIL and DEVELOPER_PASSWORD in .env');
    return process.exit(1);
  }

  if (await Admin.findOne({ email })) {
    console.log(`Admin with ${email} already exists.`);
    return process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(plainPassword, salt);
  const dev = new Admin({
    name: 'The Creator',
    email,
    phone,
    gender,
    password: hashed,
    role: 'developer',
  });
  await dev.save();
  console.log('Created Dev Admin:', dev._id);
  process.exit(0);
};

seedDeveloper().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
