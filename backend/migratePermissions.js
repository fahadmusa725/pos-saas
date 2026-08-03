const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const { DEFAULT_ROLE_PERMISSIONS } = require('./src/config/modules');

const migrateStaffPermissions = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pos-saas';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    const staffMembers = await User.find({
      role: { $in: ['cashier', 'waiter', 'kitchen'] },
    });

    console.log(`Found ${staffMembers.length} staff member accounts.`);

    let updatedCount = 0;
    for (let member of staffMembers) {
      if (!member.permissions || member.permissions.length === 0) {
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[member.role] || [];
        member.permissions = defaultPerms;
        await member.save();
        console.log(`Updated permissions for ${member.name} (${member.email}, ${member.role}):`, defaultPerms);
        updatedCount++;
      } else {
        console.log(`Staff member ${member.name} already has permissions:`, member.permissions);
      }
    }

    console.log(`Migration complete. Successfully updated ${updatedCount} staff records.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateStaffPermissions();
