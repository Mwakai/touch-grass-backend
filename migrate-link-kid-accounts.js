require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Kid = require('./src/models/Kid');

/**
 * One-off migration: link kid accounts created before User.kidProfile /
 * Kid.account existed. Matches each unlinked kid account to an unlinked
 * profile with the same parent and name. Safe to run more than once.
 */
const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Build the sparse unique index on Kid.account
  await Kid.syncIndexes();

  const accounts = await User.find({ role: 'kid', kidProfile: { $exists: false } });
  let linked = 0;

  for (const account of accounts) {
    const profile = await Kid.findOne({
      parent: account.parent,
      name: account.name,
      account: { $exists: false }
    }).sort({ createdAt: 1 });

    if (!profile) {
      console.log(`No profile found for ${account.email}`);
      continue;
    }

    profile.account = account._id;
    await profile.save();
    await User.updateOne({ _id: account._id }, { kidProfile: profile._id });
    linked++;
    console.log(`Linked ${account.email} -> profile ${profile._id}`);
  }

  console.log(`\nLinked ${linked} of ${accounts.length} kid accounts`);
  await mongoose.connection.close();
};

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
