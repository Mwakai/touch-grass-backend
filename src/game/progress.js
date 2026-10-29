const Completion = require('../models/Completion');
const { buildSummary } = require('./rules');

/** Timezone used to decide which day a challenge was done on, for streaks. */
const timeZone = process.env.APP_TIMEZONE || 'UTC';

/** Full adventure summary for one kid profile. */
const getSummary = async (kid) => {
  const completions = await Completion.find({ kid: kid._id }).lean();
  return buildSummary({ completions, interests: kid.interests, timeZone });
};

/**
 * Add `points` and `stats` to kid profiles, so lists and cards show real
 * progress. Uses one query for all the kids.
 */
const withProgress = async (kids) => {
  const completions = await Completion.find({ kid: { $in: kids.map((kid) => kid._id) } }).lean();

  return kids.map((kid) => {
    const own = completions.filter((c) => String(c.kid) === String(kid._id));
    const summary = buildSummary({ completions: own, interests: kid.interests, timeZone });
    return {
      ...kid.toJSON(),
      points: summary.xp,
      level: summary.level,
      stats: {
        challenges: summary.stats.completed,
        badges: summary.stats.badges,
        outdoorMinutes: summary.stats.outdoorMinutes
      },
      pendingCount: summary.stats.pending
    };
  });
};

module.exports = {
  getSummary,
  withProgress
};
