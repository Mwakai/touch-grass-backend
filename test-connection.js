require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  console.log('Testing MongoDB connection...');
  console.log('URI:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error('Error:', error.message);

    if (error.message.includes('bad auth')) {
      console.error('\n💡 Tip: Check your username and password in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your cluster URL');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('\n💡 Tip: Add your IP address to MongoDB Atlas Network Access');
    }

    process.exit(1);
  }
};

testConnection();
