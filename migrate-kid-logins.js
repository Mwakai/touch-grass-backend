require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

/**
 * One-off migration for kid logins without email:
 * - rebuilds the User indexes, swapping the old unique email index for one
 *   that ignores accounts without an email, and adding the per-family
 *   username index
 * - lists kid accounts that still have an email, so their parents can set a
 *   username and PIN (PUT /api/kids/:id/login), which removes the email
 * Safe to run more than once.
 */
const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const dropped = await User.syncIndexes();
  console.log(`Rebuilt User indexes${dropped.length ? `, dropped: ${dropped.join(', ')}` : ''}`);

  const legacy = await User.find({ role: 'kid', email: { $type: 'string' } })
    .select('_id parent kidProfile');

  if (legacy.length === 0) {
    console.log('No kid accounts with an email left');
  } else {
    console.log(`\n${legacy.length} kid accounts still have an email. Their parents need to set a username and PIN:`);
    for (const account of legacy) {
      console.log(`  kid profile ${account.kidProfile} (parent ${account.parent})`);
    }
  }

  await mongoose.connection.close();
};

migrate().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.connection.close();
  process.exit(1);
});
