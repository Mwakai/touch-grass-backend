const Kid = require('../models/Kid');
const Completion = require('../models/Completion');
const catalogue = require('../game/catalogue');
const { getSummary } = require('../game/progress');
const { findOwnKid, findKidByAccount } = require('./kidService');
const { NotFoundError, ConflictError, isDuplicateKey } = require('../utils/errors');

/**
 * The adventure game: kids submit challenges, parents approve them. The rules
 * themselves live in src/game; this file loads and saves what they need.
 */

const ALREADY_PENDING = 'This challenge is already waiting for a grown-up to check';

/** A logged-in kid's adventure: XP, level, streak, badges and trail */
const getMyAdventure = async (accountId) =>
  getSummary(await findKidByAccount(accountId));

/** One of a parent's kids' adventures */
const getKidAdventure = async (parentId, kidId) =>
  getSummary(await findOwnKid(parentId, kidId));

/**
 * Kid says they've done a challenge; it waits for a parent to approve
 * @returns {Object} The kid's updated adventure summary
 */
const submitChallenge = async (accountId, challengeId, note) => {
  if (!catalogue.challengeById.has(challengeId)) {
    throw new NotFoundError('Challenge not found');
  }

  const kid = await findKidByAccount(accountId);

  const summary = await getSummary(kid);
  const challenge = summary.regions
    .flatMap((region) => region.challenges)
    .find((c) => c.id === challengeId);

  if (challenge.status !== 'available') {
    const messages = {
      locked: 'Level up to unlock this challenge first',
      pending: ALREADY_PENDING,
      completed: 'You already completed this challenge'
    };
    throw new ConflictError(messages[challenge.status]);
  }

  try {
    await Completion.create({ kid: kid._id, challengeId, note });
  } catch (error) {
    // Two taps at once: the unique index stops the second one
    if (isDuplicateKey(error)) throw new ConflictError(ALREADY_PENDING);
    throw error;
  }

  return getSummary(kid);
};

/** Challenges a parent's kids have submitted and are waiting for approval, oldest first */
const listPending = async (parentId) => {
  const kids = await Kid.find({ parent: parentId }).select('name avatarColor');
  const kidById = new Map(kids.map((kid) => [String(kid._id), kid]));

  const completions = await Completion.find({
    kid: { $in: kids.map((kid) => kid._id) },
    status: 'pending'
  })
    .sort({ submittedAt: 1 })
    .lean();

  return completions
    .filter((c) => catalogue.challengeById.has(c.challengeId))
    .map((c) => {
      const challenge = catalogue.challengeById.get(c.challengeId);
      const kid = kidById.get(String(c.kid));
      return {
        id: c._id,
        note: c.note || null,
        submittedAt: c.submittedAt,
        kid: { id: kid._id, name: kid.name, avatarColor: kid.avatarColor },
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          icon: challenge.icon,
          xp: challenge.xp
        }
      };
    });
};

/**
 * Parent approves or rejects a pending completion
 * @param {'approve'|'reject'} decision
 * @returns {Object} The kid's updated adventure summary
 */
const reviewCompletion = async (parentId, completionId, decision) => {
  const completion = await Completion.findById(completionId);
  if (!completion) throw new NotFoundError('Completion not found');

  // Only the kid's own parent can review it
  const kid = await Kid.findOne({ _id: completion.kid, parent: parentId });
  if (!kid) throw new NotFoundError('Completion not found');

  // Check and update in one step, so two quick reviews can't both apply
  const reviewed = await Completion.findOneAndUpdate(
    { _id: completion._id, status: 'pending' },
    {
      status: decision === 'approve' ? 'approved' : 'rejected',
      active: decision === 'approve',
      reviewedAt: new Date(),
      reviewedBy: parentId
    }
  );

  if (!reviewed) throw new ConflictError('This challenge has already been reviewed');

  return getSummary(kid);
};

module.exports = {
  getMyAdventure,
  getKidAdventure,
  submitChallenge,
  listPending,
  reviewCompletion
};
