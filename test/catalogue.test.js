const { test } = require('node:test');
const assert = require('node:assert/strict');
const { regions, challenges, badges } = require('../src/game/catalogue');
const { levelForXp, buildSummary } = require('../src/game/rules');

test('ids are unique', () => {
  for (const list of [regions, challenges, badges]) {
    const ids = list.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('every challenge belongs to a known region', () => {
  const regionIds = new Set(regions.map((region) => region.id));
  for (const challenge of challenges) {
    assert.ok(regionIds.has(challenge.regionId), challenge.id);
  }
});

test('every challenge category is an interest id', () => {
  const interests = new Set(['nature', 'cycling', 'exploring', 'football', 'art']);
  for (const challenge of challenges) {
    assert.ok(interests.has(challenge.category), `${challenge.id}: ${challenge.category}`);
  }
});

test('every icon is a key the app knows', () => {
  const icons = new Set([
    'bike', 'bird', 'bug', 'camera', 'cloud', 'compass', 'fish', 'flag', 'flame', 'flower',
    'footprints', 'leaf', 'map', 'mountain', 'palette', 'paw', 'star', 'sun', 'telescope',
    'tent', 'trees', 'volleyball', 'waves'
  ]);
  for (const item of [...challenges, ...badges]) {
    assert.ok(icons.has(item.icon), `${item.id}: ${item.icon}`);
  }
});

test('regions unlock in order, starting at level 1', () => {
  assert.equal(regions[0].unlockLevel, 1);
  for (let i = 1; i < regions.length; i++) {
    assert.ok(regions[i].unlockLevel > regions[i - 1].unlockLevel, regions[i].id);
  }
});

test('the regions a kid has unlocked always hold enough XP to unlock the next one', () => {
  let xp = 0;
  for (let i = 0; i < regions.length - 1; i++) {
    xp += challenges
      .filter((challenge) => challenge.regionId === regions[i].id)
      .reduce((sum, challenge) => sum + challenge.xp, 0);
    assert.ok(
      levelForXp(xp) >= regions[i + 1].unlockLevel,
      `after clearing ${regions[i].id} a kid has ${xp} XP, not enough for ${regions[i + 1].id}`
    );
  }
});

test('every badge can be earned by completing the whole catalogue on consecutive days', () => {
  const start = Date.UTC(2026, 0, 1);
  const day = 24 * 60 * 60 * 1000;
  const completions = challenges.map((challenge, i) => ({
    _id: `c${i}`,
    challengeId: challenge.id,
    status: 'approved',
    submittedAt: new Date(start + i * day),
    reviewedAt: new Date(start + i * day)
  }));

  const summary = buildSummary({ completions, now: new Date(start + challenges.length * day) });
  const missing = summary.badges.filter((badge) => !badge.earned).map((badge) => badge.id);
  assert.deepEqual(missing, []);
});
