const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Kid = require('../models/Kid');
const { deleteKidData } = require('./kidService');
const { PRIVACY_POLICY_VERSION } = require('../config/privacy');
const {
  LOCK_MINUTES,
  normalizeUsername,
  isLocked,
  afterFailedLogin
} = require('../utils/kidLogin');
const {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  isDuplicateKey
} = require('../utils/errors');

/**
 * Parent accounts, logins for parents and kids, and account deletion
 */

const EMAIL_TAKEN = 'User with this email already exists';

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

/**
 * Build the user data returned by signup, login and /me
 * @param {Object} user - User document
 * @returns {Object} Public user data with role-specific fields
 */
const buildUserData = (user) => {
  const data = {
    id: user._id,
    role: user.role,
    createdAt: user.createdAt
  };

  if (user.role === 'parent') {
    data.email = user.email;
    data.familyCode = user.familyCode;
    data.kids = user.kids;
  } else if (user.role === 'kid') {
    data.username = user.username;
    data.name = user.name;
    data.parentId = user.parent;
    data.kidId = user.kidProfile;
  }

  return data;
};

/** Token plus public user data, as returned by signup and both logins */
const session = (user) => ({
  token: generateToken(user._id, user.role),
  user: buildUserData(user)
});

/**
 * Register a new parent. Kids can't sign up themselves: a parent creates
 * their login (see kidService.setKidLogin)
 */
const signup = async ({ email, password }) => {
  email = email.toLowerCase().trim();

  if (await User.exists({ email })) throw new ConflictError(EMAIL_TAKEN);

  // Generate unique family code for parent
  let familyCode = null;
  while (!familyCode) {
    const candidate = User.generateFamilyCode();
    if (!(await User.exists({ familyCode: candidate }))) familyCode = candidate;
  }

  let user;
  try {
    user = await User.create({
      email,
      password,
      role: 'parent',
      familyCode,
      consent: {
        policyVersion: PRIVACY_POLICY_VERSION,
        acceptedAt: new Date()
      }
    });
  } catch (error) {
    // Two signups with the same email raced past the existence check
    if (isDuplicateKey(error, 'email')) throw new ConflictError(EMAIL_TAKEN);
    throw error;
  }

  return session(user);
};

/** Parent login with email and password */
const login = async ({ email, password }) => {
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return session(user);
};

/** Kid login with the family code, the username and PIN their parent set */
const kidLogin = async ({ familyCode, username, pin }) => {
  // One message for every mismatch, so nobody can probe which part was wrong
  const invalid = () => new UnauthorizedError('Wrong family code, username or PIN');

  const parent = await User.findOne({
    familyCode: String(familyCode).trim().toUpperCase(),
    role: 'parent'
  });
  if (!parent) throw invalid();

  const user = await User.findOne({
    role: 'kid',
    parent: parent._id,
    username: normalizeUsername(username)
  }).select('+password +failedLogins +lockedUntil');
  if (!user) throw invalid();

  if (isLocked(user.lockedUntil)) {
    throw new TooManyRequestsError(
      `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes, or ask a parent to reset it.`
    );
  }

  if (!(await user.comparePassword(String(pin)))) {
    await User.updateOne({ _id: user._id }, afterFailedLogin(user.failedLogins));
    throw invalid();
  }

  if (user.failedLogins || user.lockedUntil) {
    await User.updateOne(
      { _id: user._id },
      { failedLogins: 0, $unset: { lockedUntil: 1 } }
    );
  }

  return session(user);
};

/** Public data for the logged-in user; kids also get their full profile */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new NotFoundError('User not found');

  const data = buildUserData(user);

  if (user.role === 'kid') {
    data.parent = user.parent; // kept for existing clients; same as parentId
    data.profile = user.kidProfile
      ? await Kid.findById(user.kidProfile)
      : null;
  }

  return data;
};

/**
 * Delete a parent's account and everything about their kids: profiles,
 * kid logins and game progress
 */
const deleteAccount = async (parentId) => {
  const kids = await Kid.find({ parent: parentId });

  // Kids first, so a failure part way leaves the parent able to retry
  for (const kid of kids) {
    await deleteKidData(kid);
  }

  await User.deleteOne({ _id: parentId });
};

module.exports = {
  signup,
  login,
  kidLogin,
  getCurrentUser,
  deleteAccount
};
