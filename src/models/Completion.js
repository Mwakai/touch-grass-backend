const mongoose = require('mongoose');

/**
 * A kid's attempt at a challenge. This log is the only stored game state:
 * XP, level, streak and badges are all worked out from it (src/game/rules.js).
 *
 * pending  -> the kid tapped "I did it", waiting for a parent
 * approved -> the parent confirmed it; XP and badges count it
 * rejected -> the parent said not yet; the kid can try again
 *
 * Privacy: don't add photo, location or contact fields here. Kids' photos stay
 * on their device and nothing records where a challenge was done.
 */
const completionSchema = new mongoose.Schema({
  kid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kid',
    required: true
  },
  // Id from src/game/catalogue.js
  challengeId: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true
  },
  // Pending and approved completions are "active"; rejected ones are not.
  // The unique index below allows at most one active completion per challenge.
  active: {
    type: Boolean,
    default: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: [280, 'Note cannot exceed 280 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

completionSchema.index({ kid: 1, status: 1 });
completionSchema.index(
  { kid: 1, challengeId: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

const Completion = mongoose.model('Completion', completionSchema);

module.exports = Completion;
