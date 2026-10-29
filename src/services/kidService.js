const Kid = require('../models/Kid');
const User = require('../models/User');
const Completion = require('../models/Completion');
const { withProgress } = require('../game/progress');
const { PRIVACY_POLICY_VERSION } = require('../config/privacy');
const { normalizeUsername } = require('../utils/kidLogin');
const { NotFoundError, ConflictError, isDuplicateKey } = require('../utils/errors');

/**
 * Kid profiles and their logins. Parents manage their own kids; a logged-in
 * kid can see and lightly edit their own profile.
 */

/** A kid profile that belongs to this parent, or a 404 */
const findOwnKid = async (parentId, kidId) => {
  const kid = await Kid.findOne({ _id: kidId, parent: parentId });
  if (!kid) throw new NotFoundError('Kid not found');
  return kid;
};

/** The profile behind a logged-in kid's account, or a 404 */
const findKidByAccount = async (accountId) => {
  const kid = await Kid.findOne({ account: accountId });
  if (!kid) throw new NotFoundError('Kid profile not found');
  return kid;
};

/**
 * Create or update a kid's login. Kids log in with the family code plus this
 * username and PIN, so their account never holds an email address.
 * @param {Object} kid - Kid document (must already be saved)
 * @param {Object} parent - The parent User
 * @returns {Object} The kid's User account
 */
const saveKidLogin = async (kid, parent, username, pin) => {
  let account = kid.account
    ? await User.findOne({ _id: kid.account, role: 'kid' })
    : null;
  const isNew = !account;

  if (isNew) {
    account = new User({
      role: 'kid',
      parent: parent._id,
      familyCode: parent.familyCode,
      kidProfile: kid._id
    });
  }

  account.username = normalizeUsername(username);
  account.password = pin;
  account.name = kid.name;
  // Older kid accounts signed up with an email; drop it and any PIN lock
  account.email = undefined;
  account.failedLogins = 0;
  account.lockedUntil = undefined;

  try {
    await account.save();
  } catch (error) {
    // Only the username index; anything else (such as the old unique email
    // index before `npm run migrate:kid-logins`) is a real server error
    if (isDuplicateKey(error, 'username')) {
      throw new ConflictError('That username is already taken in your family');
    }
    throw error;
  }

  if (isNew) {
    try {
      kid.account = account._id;
      await kid.save();
    } catch (error) {
      await User.deleteOne({ _id: account._id }).catch(() => {});
      throw error;
    }
  }

  return account;
};

/**
 * Delete everything stored about one kid: their game progress, their login
 * account and their profile. The profile goes last, so a failure part way
 * through leaves it in place and the parent can simply delete again.
 * @param {Object} kid - Kid document
 */
const deleteKidData = async (kid) => {
  await Completion.deleteMany({ kid: kid._id });

  // A kid account can't exist without its profile
  if (kid.account) {
    await User.deleteOne({ _id: kid.account, role: 'kid' });
  }

  await Kid.deleteOne({ _id: kid._id });
  await User.updateOne({ _id: kid.parent }, { $pull: { kids: kid._id } });
};

/**
 * Add a kid to a parent's account, with a login if a username and PIN are given
 * @param {Object} parent - The parent User
 * @returns {Object} The kid's profile plus their username (or null)
 */
const addKid = async (parent, { name, age, avatarColor, interests, username, pin }) => {
  const kid = await Kid.create({
    name,
    age,
    avatarColor: avatarColor || 'from-blue-400 to-purple-500',
    interests,
    parent: parent._id,
    consent: {
      givenBy: parent._id,
      givenAt: new Date(),
      policyVersion: PRIVACY_POLICY_VERSION
    }
  });

  // Add kid to parent's kids array and create their login, removing the
  // kid again if either fails
  const wantsLogin = username !== undefined || pin !== undefined;
  let account = null;
  try {
    await User.updateOne({ _id: parent._id }, { $addToSet: { kids: kid._id } });
    if (wantsLogin) account = await saveKidLogin(kid, parent, username, pin);
  } catch (error) {
    await Kid.deleteOne({ _id: kid._id }).catch(() => {});
    await User.updateOne({ _id: parent._id }, { $pull: { kids: kid._id } }).catch(() => {});
    throw error;
  }

  return { ...kid.toJSON(), username: account ? account.username : null };
};

/** All of a parent's kids, newest first, with their game progress */
const listKids = async (parentId) => {
  const kids = await Kid.find({ parent: parentId }).sort({ createdAt: -1 });
  return withProgress(kids);
};

/** One of a parent's kids with their game progress */
const getKid = async (parentId, kidId) => {
  const [data] = await withProgress([await findOwnKid(parentId, kidId)]);
  return data;
};

/** Change any of a kid's name, age, avatar and interests */
const updateKid = async (parentId, kidId, { name, age, avatarColor, interests }) => {
  const kid = await findOwnKid(parentId, kidId);

  if (name !== undefined) kid.name = name;
  if (age !== undefined) kid.age = age;
  if (avatarColor !== undefined) kid.avatarColor = avatarColor;
  if (interests !== undefined) kid.interests = interests;

  return kid.save();
};

/** Delete a kid's profile, login account and game progress */
const deleteKid = async (parentId, kidId) => {
  await deleteKidData(await findOwnKid(parentId, kidId));
};

/**
 * Create a login for a kid, or change their username or PIN. Also clears a
 * PIN lock, so this is how a parent resets a forgotten PIN.
 * @param {Object} parent - The parent User
 */
const setKidLogin = async (parent, kidId, { username, pin }) => {
  const kid = await findOwnKid(parent._id, kidId);
  const account = await saveKidLogin(kid, parent, username, pin);

  return {
    kidId: kid._id,
    username: account.username,
    familyCode: parent.familyCode
  };
};

/** A logged-in kid's own profile with their game progress */
const getMyProfile = async (accountId) => {
  const [data] = await withProgress([await findKidByAccount(accountId)]);
  return data;
};

/** A kid can change their avatar and interests; name and age are the parent's */
const updateMyProfile = async (accountId, { avatarColor, interests }) => {
  const kid = await findKidByAccount(accountId);

  if (avatarColor !== undefined) kid.avatarColor = avatarColor;
  if (interests !== undefined) kid.interests = interests;

  return kid.save();
};

module.exports = {
  findOwnKid,
  findKidByAccount,
  deleteKidData,
  addKid,
  listKids,
  getKid,
  updateKid,
  deleteKid,
  setKidLogin,
  getMyProfile,
  updateMyProfile
};
