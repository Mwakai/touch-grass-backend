const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
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
    minlength: [6, 'Password must be at least 6 characters long'],
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
  // For kids signing up independently: their name
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
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

// Add index on email for better query performance
userSchema.index({ email: 1 });

// Add index on familyCode for querying family members
userSchema.index({ familyCode: 1 });

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
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
