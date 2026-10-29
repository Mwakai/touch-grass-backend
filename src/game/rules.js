const catalogue = require('./catalogue');

/**
 * Game rules: turn a kid's completions into XP, level, streak, badges and
 * the state of every challenge. Pure functions with no database access, so
 * the summary is always rebuilt from the Completion log and can't drift.
 */

/** Total XP needed to reach a level. Each level costs 100 XP more than the last. */
const xpForLevel = (level) => 50 * level * (level - 1);

const levelForXp = (xp) => {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
};

const isValidTimeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
};

/** Calendar day (YYYY-MM-DD) of a date in a timezone; unknown zones fall back to UTC. */
const dayKey = (date, timeZone = 'UTC') => {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / (24 * 60 * 60 * 1000);

/**
 * Current and best run of consecutive days. The current streak stays alive
 * through the day after the last activity, so it doesn't reset at midnight
 * before the kid has had a chance to get outside.
 */
const streaksFromDays = (dayKeys, todayKey) => {
  const days = [...new Set(dayKeys)].map(dayNumber).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const today = dayNumber(todayKey);
  const last = days[days.length - 1];
  const current = today - last <= 1 ? run : 0;

  return { current, best };
};

/**
 * Build everything the app needs to draw a kid's adventure.
 * @param {Object} options
 * @param {Array} options.completions - The kid's Completion documents (any status)
 * @param {string[]} [options.interests] - Interest ids; matching challenges are recommended
 * @param {Date} [options.now]
 * @param {string} [options.timeZone] - Timezone used for streak days
 */
const buildSummary = ({ completions, interests = [], now = new Date(), timeZone = 'UTC' }) => {
  // Completions for challenges that have since been removed don't count
  const known = completions.filter((c) => catalogue.challengeById.has(c.challengeId));
  const approved = known
    .filter((c) => c.status === 'approved')
    .sort((a, b) => new Date(a.reviewedAt) - new Date(b.reviewedAt));

  // Replay approvals in order so each badge knows when it was earned
  const progress = { completed: 0, byCategory: {}, clearedRegions: new Set(), bestStreak: 0 };
  const completedIds = new Set();
  const submitDays = [];
  const earnedAt = new Map();
  let xp = 0;
  let outdoorMinutes = 0;

  for (const completion of approved) {
    const challenge = catalogue.challengeById.get(completion.challengeId);
    if (completedIds.has(challenge.id)) continue;

    completedIds.add(challenge.id);
    xp += challenge.xp;
    outdoorMinutes += challenge.minutes;
    progress.completed++;
    progress.byCategory[challenge.category] = (progress.byCategory[challenge.category] || 0) + 1;

    const regionChallenges = catalogue.challenges.filter((c) => c.regionId === challenge.regionId);
    if (regionChallenges.every((c) => completedIds.has(c.id))) {
      progress.clearedRegions.add(challenge.regionId);
    }

    submitDays.push(dayKey(new Date(completion.submittedAt), timeZone));
    progress.bestStreak = streaksFromDays(submitDays, submitDays[submitDays.length - 1]).best;

    for (const badge of catalogue.badges) {
      if (!earnedAt.has(badge.id) && badge.rule(progress)) {
        earnedAt.set(badge.id, new Date(completion.reviewedAt));
      }
    }
  }

  const level = levelForXp(xp);
  const pendingByChallenge = new Map(
    known.filter((c) => c.status === 'pending').map((c) => [c.challengeId, c])
  );

  const regions = catalogue.regions.map((region) => {
    const unlocked = level >= region.unlockLevel;
    const challenges = catalogue.challenges
      .filter((challenge) => challenge.regionId === region.id)
      .map((challenge) => {
        const pending = pendingByChallenge.get(challenge.id);
        let status = 'available';
        if (completedIds.has(challenge.id)) status = 'completed';
        else if (!unlocked) status = 'locked';
        else if (pending) status = 'pending';

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          icon: challenge.icon,
          category: challenge.category,
          xp: challenge.xp,
          minutes: challenge.minutes,
          status,
          recommended: interests.includes(challenge.category),
          ...(status === 'pending' && { completionId: String(pending._id) })
        };
      });

    return {
      id: region.id,
      name: region.name,
      description: region.description,
      unlockLevel: region.unlockLevel,
      unlocked,
      completedCount: challenges.filter((c) => c.status === 'completed').length,
      total: challenges.length,
      challenges
    };
  });

  return {
    xp,
    level,
    levelXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    streak: streaksFromDays(submitDays, dayKey(now, timeZone)),
    stats: {
      completed: progress.completed,
      pending: pendingByChallenge.size,
      badges: earnedAt.size,
      outdoorMinutes
    },
    badges: catalogue.badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: earnedAt.has(badge.id),
      earnedAt: earnedAt.get(badge.id) || null
    })),
    regions
  };
};

module.exports = {
  xpForLevel,
  levelForXp,
  dayKey,
  streaksFromDays,
  buildSummary
};
