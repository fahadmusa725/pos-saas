const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Restaurant = require('./src/models/Restaurant');
const User = require('./src/models/User');

const checkUsersData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pos-saas';
    await mongoose.connect(mongoUri);

    const users = await User.find({}).populate('restaurantId', 'name');
    console.log('--- ALL USERS IN DB ---');
    users.forEach((u) => {
      console.log({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        restaurantId: u.restaurantId ? (u.restaurantId._id ? u.restaurantId._id.toString() : u.restaurantId) : null,
        restaurantName: u.restaurantId ? u.restaurantId.name : 'NO RESTAURANT',
        permissions: u.permissions,
      });
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUsersData();
