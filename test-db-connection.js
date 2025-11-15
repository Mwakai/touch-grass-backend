require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'NOT FOUND!');

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    console.log('Connection State:', conn.connection.readyState); // 1 = connected

    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(col => console.log('  -', col.name));

    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testConnection();
