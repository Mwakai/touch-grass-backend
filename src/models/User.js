const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Parents only. Kids log in with a username and PIN instead, so we never
  // hold a child's email address (uniqueness is enforced by an index below)
  email: {
    type: String,
    required: [function() { return this.role !== 'kid'; }, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    // Kids have a 4-digit PIN here instead, checked by the controller
    validate: {
      validator: function(password) {
        return this.role === 'kid' || password.length >= 6;
      },
      message: 'Password must be at least 6 characters long'
    },
    select: false // Don't return password by default in queries
  },
  role: {
    type: String,
    enum: ['parent', 'kid'],
    default: 'parent',
    required: true
  },
  // For parents: unique family code that kids use to join
  familyCode: {
    type: String
  },
  // For kids: reference to their parent user
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For kids: the login name their parent picked, unique within the family
  username: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9_]{3,20}$/, 'Username must be 3 to 20 letters, numbers or underscores']
  },
  // For kids: wrong PIN attempts, and when the lock from too many runs out
  failedLogins: {
    type: Number,
    default: 0,
    select: false
  },
  lockedUntil: {
    type: Date,
    select: false
  },
  // For parents: when they accepted the privacy policy, and which version
  consent: {
    policyVersion: String,
    acceptedAt: Date
  },
  // For kids: their name
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  // For kids: their Kid profile (the profile links back via Kid.account)
  kidProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kid'
  },
  kids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kid'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique family code for parents
userSchema.statics.generateFamilyCode = function() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character code like "A3F2B1"
};

// Add index on familyCode for querying family members
userSchema.index({ familyCode: 1 });

// Emails are unique, but kids have none, so only index accounts that do
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

// Kid usernames only need to be unique within one family
userSchema.index(
  { parent: 1, username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: 'string' } } }
);

// Pre-save hook to hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds
    const salt = await bcrypt.genSalt(10);
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Note: this.password is available here even though select: false
    // because we explicitly selected it in the login query
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Method to get user object without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.failedLogins;
  delete user.lockedUntil;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
