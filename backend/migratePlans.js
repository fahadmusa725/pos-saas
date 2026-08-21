const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Restaurant = require('./src/models/Restaurant');

const migratePlans = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pos-saas';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Starting Subscription Plan Migration...');

    // 1. Grandfather ALL existing restaurants to 'pro' plan so existing tenants retain full access
    const proResult = await Restaurant.updateMany(
      {},
      { $set: { subscriptionPlan: 'pro' } }
    );
    console.log(`Grandfathered ${proResult.modifiedCount} existing restaurants to 'pro' plan.`);

    // 2. Fix invalid/missing subscriptionPlan values to 'basic' if not set
    const missingPlanResult = await Restaurant.updateMany(
      { subscriptionPlan: { $nin: ['basic', 'pro'] } },
      { $set: { subscriptionPlan: 'basic' } }
    );
    console.log(`Fixed ${missingPlanResult.modifiedCount} invalid/missing subscriptionPlan records to 'basic'.`);

    // 3. Ensure subscriptionStatus is clean
    const missingStatusResult = await Restaurant.updateMany(
      { subscriptionStatus: { $exists: false } },
      { $set: { subscriptionStatus: 'trial' } }
    );
    console.log(`Fixed ${missingStatusResult.modifiedCount} missing subscriptionStatus records to 'trial'.`);

    const allRestaurants = await Restaurant.find().select('name slug subscriptionPlan subscriptionStatus trialEndsAt');
    console.log('\n--- Current Restaurants Summary ---');
    allRestaurants.forEach((r) => {
      console.log(`- ${r.name} (${r.slug}): Plan = ${r.subscriptionPlan}, Status = ${r.subscriptionStatus}, TrialEndsAt = ${r.trialEndsAt || 'null'}`);
    });

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migratePlans();
