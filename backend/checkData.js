// Quick data check script
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function checkData() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected successfully!\n');

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📦 Total Collections Found: ${collections.length}\n`);
    
    if (collections.length === 0) {
      console.log('❌ NO COLLECTIONS FOUND - Database appears empty!');
      console.log('   This means data might be in a different database or was never saved to Atlas.');
    } else {
      console.log('='.repeat(50));
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        const icon = count > 0 ? '✅' : '⚠️ ';
        console.log(`${icon} ${col.name.padEnd(25)} → ${count} records`);
      }
      console.log('='.repeat(50));
    }
    
    // Also check what database we're connected to
    console.log(`\n📁 Database Name: ${db.databaseName}`);
    
  } catch (err) {
    console.error('❌ Connection Error:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed.');
  }
}

checkData();
