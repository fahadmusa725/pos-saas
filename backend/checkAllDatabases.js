// Check all databases in the Atlas cluster
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function checkAllDatabases() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.listDatabases();
    
    console.log('='.repeat(60));
    console.log('📁 ALL DATABASES IN YOUR ATLAS CLUSTER:');
    console.log('='.repeat(60));
    
    for (const db of result.databases) {
      const sizeInMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      console.log(`\n🗄️  Database: "${db.name}" (${sizeInMB} MB)`);
      
      // List collections in each DB
      const dbObj = mongoose.connection.client.db(db.name);
      const collections = await dbObj.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log('   (no collections)');
      } else {
        for (const col of collections) {
          const count = await dbObj.collection(col.name).countDocuments();
          const icon = count > 0 ? '  ✅' : '  ⚠️ ';
          console.log(`${icon} ${col.name.padEnd(25)} → ${count} records`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
  }
}

checkAllDatabases();
