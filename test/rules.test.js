const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  xpForLevel,
  levelForXp,
  dayKey,
  streaksFromDays,
  buildSummary
} = require('../src/game/rules');

const at = (iso) => new Date(iso);

const approved = (challengeId, submitted, reviewed = submitted) => ({
  _id: `id-${challengeId}`,
  challengeId,
  status: 'approved',
  submittedAt: at(submitted),
  reviewedAt: at(reviewed)
});

test('each level costs 100 XP more than the last', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.equal(xpForLevel(3), 300);
  assert.equal(xpForLevel(4), 600);
});

test('levelForXp finds the highest level reached', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
  assert.equal(levelForXp(299), 2);
  assert.equal(levelForXp(300), 3);
});

test('dayKey uses the given timezone', () => {
  // 22:30 UTC is already the next day in Nairobi (UTC+3)
  const date = at('2026-03-10T22:30:00Z');
  assert.equal(dayKey(date, 'UTC'), '2026-03-10');
  assert.equal(dayKey(date, 'Africa/Nairobi'), '2026-03-11');
});

test('dayKey falls back to UTC for an unknown timezone', () => {
  assert.equal(dayKey(at('2026-03-10T22:30:00Z'), 'Not/AZone'), '2026-03-10');
});

test('current streak survives until the end of the day after the last activity', () => {
  const days = ['2026-03-08', '2026-03-09', '2026-03-10'];
  assert.deepEqual(streaksFromDays(days, '2026-03-10'), { current: 3, best: 3 });
  assert.deepEqual(streaksFromDays(days, '2026-03-11'), { current: 3, best: 3 });
  assert.deepEqual(streaksFromDays(days, '2026-03-12'), { current: 0, best: 3 });
});

test('best streak is the longest run, even if broken since', () => {
  const days = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-05', '2026-03-10'];
  assert.deepEqual(streaksFromDays(days, '2026-03-10'), { current: 1, best: 3 });
});

test('streak counts across a month boundary', () => {
  assert.deepEqual(streaksFromDays(['2026-02-28', '2026-03-01'], '2026-03-01'), {
    current: 2,
    best: 2
  });
});

test('a new kid starts at level 1 with only the first region open', () => {
  const summary = buildSummary({ completions: [], now: at('2026-03-10T12:00:00Z') });

  assert.equal(summary.xp, 0);
  assert.equal(summary.level, 1);
  assert.equal(summary.levelXp, 0);
  assert.equal(summary.nextLevelXp, 100);
  assert.deepEqual(summary.streak, { current: 0, best: 0 });
  assert.equal(summary.regions[0].unlocked, true);
  assert.ok(summary.regions.slice(1).every((region) => !region.unlocked));
  assert.ok(summary.regions[0].challenges.every((c) => c.status === 'available'));
  assert.ok(summary.regions[1].challenges.every((c) => c.status === 'locked'));
  assert.ok(summary.badges.every((badge) => !badge.earned));
});

test('only approved completions earn XP', () => {
  const summary = buildSummary({
    completions: [
      approved('backyard-cloud-shapes', '2026-03-10T10:00:00Z'),
      { _id: 'p', challengeId: 'backyard-bug-hunt', status: 'pending', submittedAt: at('2026-03-10T11:00:00Z') },
      { _id: 'r', challengeId: 'backyard-chalk-art', status: 'rejected', submittedAt: at('2026-03-10T11:00:00Z') }
    ],
    now: at('2026-03-10T12:00:00Z')
  });

  assert.equal(summary.xp, 50);
  assert.equal(summary.stats.completed, 1);
  assert.equal(summary.stats.pending, 1);

  const byId = Object.fromEntries(summary.regions[0].challenges.map((c) => [c.id, c]));
  assert.equal(byId['backyard-cloud-shapes'].status, 'completed');
  assert.equal(byId['backyard-bug-hunt'].status, 'pending');
  assert.equal(byId['backyard-bug-hunt'].completionId, 'p');
  assert.equal(byId['backyard-chalk-art'].status, 'available');
});

test('minutes outside add up from approved challenges', () => {
  const summary = buildSummary({
    completions: [
      approved('backyard-cloud-shapes', '2026-03-10T10:00:00Z'),
      approved('backyard-bug-hunt', '2026-03-10T10:00:00Z')
    ],
    now: at('2026-03-10T12:00:00Z')
  });
  assert.equal(summary.stats.outdoorMinutes, 25);
});

test('reaching level 2 unlocks the park', () => {
  const summary = buildSummary({
    completions: [
      approved('backyard-cloud-shapes', '2026-03-10T10:00:00Z'),
      approved('backyard-bug-hunt', '2026-03-10T10:00:00Z')
    ],
    now: at('2026-03-10T12:00:00Z')
  });

  assert.equal(summary.xp, 110);
  assert.equal(summary.level, 2);
  assert.equal(summary.levelXp, 100);
  assert.equal(summary.nextLevelXp, 300);
  const park = summary.regions.find((region) => region.id === 'park');
  assert.equal(park.unlocked, true);
  assert.ok(park.challenges.every((c) => c.status === 'available'));
});

test('a badge records when the completion that earned it was approved', () => {
  const summary = buildSummary({
    completions: [approved('backyard-sunset', '2026-03-10T10:00:00Z', '2026-03-11T09:00:00Z')],
    now: at('2026-03-11T12:00:00Z')
  });

  const firstSteps = summary.badges.find((badge) => badge.id === 'first-steps');
  assert.equal(firstSteps.earned, true);
  assert.equal(firstSteps.earnedAt.toISOString(), '2026-03-11T09:00:00.000Z');
});

test('streak counts the day a challenge was submitted, not approved', () => {
  const summary = buildSummary({
    completions: [
      approved('backyard-cloud-shapes', '2026-03-08T10:00:00Z', '2026-03-10T20:00:00Z'),
      approved('backyard-bug-hunt', '2026-03-09T10:00:00Z', '2026-03-10T20:00:00Z'),
      approved('backyard-sunset', '2026-03-10T10:00:00Z', '2026-03-10T20:00:00Z')
    ],
    now: at('2026-03-10T21:00:00Z')
  });

  assert.deepEqual(summary.streak, { current: 3, best: 3 });
  assert.equal(summary.badges.find((badge) => badge.id === 'streak-3').earned, true);
});

test('clearing every challenge in a region earns its badge', () => {
  const backyard = [
    'backyard-cloud-shapes',
    'backyard-bug-hunt',
    'backyard-chalk-art',
    'backyard-ball-keepy',
    'backyard-sunset'
  ];
  const summary = buildSummary({
    completions: backyard.map((id) => approved(id, '2026-03-10T10:00:00Z')),
    now: at('2026-03-10T12:00:00Z')
  });

  const region = summary.regions.find((r) => r.id === 'backyard');
  assert.equal(region.completedCount, region.total);
  assert.equal(summary.badges.find((badge) => badge.id === 'cleared-backyard').earned, true);
});

test('challenges matching an interest are marked recommended', () => {
  const summary = buildSummary({
    completions: [],
    interests: ['art'],
    now: at('2026-03-10T12:00:00Z')
  });
  const chalk = summary.regions[0].challenges.find((c) => c.id === 'backyard-chalk-art');
  const bugs = summary.regions[0].challenges.find((c) => c.id === 'backyard-bug-hunt');
  assert.equal(chalk.recommended, true);
  assert.equal(bugs.recommended, false);
});

test('completions for retired challenges are ignored', () => {
  const summary = buildSummary({
    completions: [approved('no-longer-exists', '2026-03-10T10:00:00Z')],
    now: at('2026-03-10T12:00:00Z')
  });
  assert.equal(summary.xp, 0);
  assert.equal(summary.stats.completed, 0);
});

test('streak uses the configured timezone', () => {
  // Both submitted on 10 March UTC, but on 10 and 11 March in Nairobi
  const completions = [
    approved('backyard-cloud-shapes', '2026-03-10T10:00:00Z'),
    approved('backyard-bug-hunt', '2026-03-10T22:30:00Z')
  ];
  const now = at('2026-03-10T23:00:00Z');

  assert.equal(buildSummary({ completions, now, timeZone: 'UTC' }).streak.best, 1);
  assert.equal(buildSummary({ completions, now, timeZone: 'Africa/Nairobi' }).streak.best, 2);
});

test('a locked challenge shows as locked even with a pending completion', () => {
  const summary = buildSummary({
    completions: [
      { _id: 'p', challengeId: 'park-bird-count', status: 'pending', submittedAt: at('2026-03-10T10:00:00Z') }
    ],
    now: at('2026-03-10T12:00:00Z')
  });

  const bird = summary.regions[1].challenges.find((c) => c.id === 'park-bird-count');
  assert.equal(bird.status, 'locked');
  assert.equal(bird.completionId, undefined);
});

test('badges are dated by the approval that earned each one', () => {
  const backyard = [
    'backyard-cloud-shapes',
    'backyard-bug-hunt',
    'backyard-chalk-art',
    'backyard-ball-keepy',
    'backyard-sunset'
  ];
  // Approved out of submission order, one per day
  const completions = backyard.map((id, i) =>
    approved(id, '2026-03-01T10:00:00Z', `2026-03-0${5 - i}T10:00:00Z`)
  );
  const summary = buildSummary({ completions, now: at('2026-03-06T12:00:00Z') });
  const earned = (id) => summary.badges.find((badge) => badge.id === id).earnedAt.toISOString();

  assert.equal(earned('first-steps'), '2026-03-01T10:00:00.000Z');
  assert.equal(earned('cleared-backyard'), '2026-03-05T10:00:00.000Z');
});
