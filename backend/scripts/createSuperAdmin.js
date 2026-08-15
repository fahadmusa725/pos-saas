require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const createSuperAdmin = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Super Admin';

  if (!email || !password) {
    console.error(
      '❌ ERROR: Please set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in your .env file before running this script.'
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pos-saas';

  try {
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Check if super-admin already exists
    const existing = await User.findOne({ role: 'super-admin' });

    if (existing) {
      console.log(`⚠️ Super Admin user already exists with email: ${existing.email}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create Super Admin user
    const superAdmin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: password.trim(),
      role: 'super-admin',
      restaurantId: null,
      isActive: true,
      permissions: [],
    });

    console.log('✅ Super Admin account successfully created!');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   ID: ${superAdmin._id}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createSuperAdmin();
