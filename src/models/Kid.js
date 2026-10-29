const mongoose = require('mongoose');

const kidSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kid name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [18, 'Age cannot exceed 18']
  },
  avatarColor: {
    type: String,
    required: [true, 'Avatar color is required'],
    trim: true,
    default: 'from-blue-400 to-purple-500'
  },
  interests: {
    type: [String],
    default: [],
    validate: {
      validator: function(interests) {
        return !interests || interests.length <= 10;
      },
      message: 'Cannot have more than 10 interests'
    }
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The kid's own login account, if they signed up with the family code
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // The parent's consent to collect this kid's data. Required for new kids
  // (see kidController.addKid); profiles made before consent existed have none
  consent: {
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    givenAt: Date,
    policyVersion: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index on parent for better query performance
kidSchema.index({ parent: 1 });

// One profile per kid account; profiles without an account are allowed
kidSchema.index({ account: 1 }, { unique: true, sparse: true });

// Method to get kid object as JSON
kidSchema.methods.toJSON = function() {
  const kid = this.toObject();
  return kid;
};

const Kid = mongoose.model('Kid', kidSchema);

module.exports = Kid;
