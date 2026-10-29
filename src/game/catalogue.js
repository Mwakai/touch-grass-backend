/**
 * The Touch Grass adventure: trail regions, the challenges in each one, and
 * the badges kids can earn. Ids are stored in Completion documents, so never
 * rename or reuse one; retire a challenge by removing it instead.
 *
 * `icon` is a key the app maps to an icon. `category` matches the interest
 * ids kids pick (nature, cycling, exploring, football, art). `minutes` is a
 * rough time outside, used for the "minutes outside" stat.
 *
 * XP is tuned so the challenges in the regions a kid has unlocked are always
 * enough to unlock the next one (see test/catalogue.test.js).
 */

const regions = [
  {
    id: 'backyard',
    name: 'Backyard',
    description: 'Every adventure starts at your own front door.',
    unlockLevel: 1
  },
  {
    id: 'park',
    name: 'Neighbourhood Park',
    description: 'Wide open grass, tall trees and room to run.',
    unlockLevel: 2
  },
  {
    id: 'woods',
    name: 'Woodland Trail',
    description: 'Follow the path under the leaves and listen closely.',
    unlockLevel: 4
  },
  {
    id: 'river',
    name: 'Riverside',
    description: 'Ripples, reeds and things that live near water.',
    unlockLevel: 6
  },
  {
    id: 'summit',
    name: 'The Summit',
    description: 'The big one. Only seasoned explorers make it up here.',
    unlockLevel: 8
  }
];

const challenges = [
  // Backyard: 300 XP
  { id: 'backyard-cloud-shapes', regionId: 'backyard', title: 'Cloud Spotter', description: 'Lie on the grass and find 3 clouds that look like animals.', icon: 'cloud', category: 'nature', xp: 50, minutes: 10 },
  { id: 'backyard-bug-hunt', regionId: 'backyard', title: 'Bug Hunt', description: 'Find 3 different small creatures. Look under leaves and rocks.', icon: 'bug', category: 'nature', xp: 60, minutes: 15 },
  { id: 'backyard-chalk-art', regionId: 'backyard', title: 'Chalk Masterpiece', description: 'Draw a picture outside with chalk or sticks and stones.', icon: 'palette', category: 'art', xp: 60, minutes: 20 },
  { id: 'backyard-ball-keepy', regionId: 'backyard', title: 'Keepy-Uppy', description: 'Keep a ball off the ground 10 times in a row.', icon: 'volleyball', category: 'football', xp: 60, minutes: 15 },
  { id: 'backyard-sunset', regionId: 'backyard', title: 'Sunset Watch', description: 'Watch the sun go down and name 3 colours you see.', icon: 'sun', category: 'exploring', xp: 70, minutes: 15 },

  // Neighbourhood Park: 560 XP
  { id: 'park-tree-explorer', regionId: 'park', title: 'Tree Explorer', description: 'Find 3 different kinds of trees and compare their leaves.', icon: 'trees', category: 'nature', xp: 90, minutes: 25 },
  { id: 'park-loop-ride', regionId: 'park', title: 'Park Ride', description: 'Ride a bike or scooter around the park twice.', icon: 'bike', category: 'cycling', xp: 90, minutes: 30 },
  { id: 'park-bird-count', regionId: 'park', title: 'Bird Counter', description: 'Count every bird you see in 10 minutes.', icon: 'bird', category: 'nature', xp: 90, minutes: 15 },
  { id: 'park-penalty-shootout', regionId: 'park', title: 'Penalty Shootout', description: 'Score 5 goals from the penalty spot (a jumper makes a fine post).', icon: 'volleyball', category: 'football', xp: 90, minutes: 25 },
  { id: 'park-leaf-rubbing', regionId: 'park', title: 'Leaf Prints', description: 'Make rubbings or prints of 4 different leaves.', icon: 'leaf', category: 'art', xp: 100, minutes: 20 },
  { id: 'park-map-maker', regionId: 'park', title: 'Map Maker', description: 'Draw a map of the park with 5 landmarks.', icon: 'map', category: 'exploring', xp: 100, minutes: 30 },

  // Woodland Trail: 900 XP
  { id: 'woods-trail-walk', regionId: 'woods', title: 'Trail Blazer', description: 'Walk a woodland trail from start to finish.', icon: 'footprints', category: 'exploring', xp: 140, minutes: 45 },
  { id: 'woods-track-detective', regionId: 'woods', title: 'Track Detective', description: 'Spot 3 animal tracks or signs, like footprints or nibbled nuts.', icon: 'paw', category: 'nature', xp: 150, minutes: 30 },
  { id: 'woods-sound-map', regionId: 'woods', title: 'Sound Map', description: 'Sit still for 5 minutes and draw every sound you hear.', icon: 'palette', category: 'art', xp: 140, minutes: 15 },
  { id: 'woods-mushroom-spotter', regionId: 'woods', title: 'Fungi Finder', description: 'Find and photograph 3 mushrooms. Look, don\'t touch!', icon: 'camera', category: 'nature', xp: 150, minutes: 30 },
  { id: 'woods-compass-quest', regionId: 'woods', title: 'Compass Quest', description: 'Use a compass or the sun to walk north, east, south and west.', icon: 'compass', category: 'exploring', xp: 160, minutes: 30 },
  { id: 'woods-trail-ride', regionId: 'woods', title: 'Muddy Wheels', description: 'Ride a forest or gravel path with a grown-up.', icon: 'bike', category: 'cycling', xp: 160, minutes: 40 },

  // Riverside: 1320 XP
  { id: 'river-skimming', regionId: 'river', title: 'Stone Skimmer', description: 'Skim a stone so it bounces at least 3 times.', icon: 'waves', category: 'exploring', xp: 210, minutes: 20 },
  { id: 'river-pond-dip', regionId: 'river', title: 'Pond Dipper', description: 'With a grown-up, spot 3 creatures that live in or near water.', icon: 'fish', category: 'nature', xp: 220, minutes: 30 },
  { id: 'river-towpath-ride', regionId: 'river', title: 'Towpath Ride', description: 'Ride alongside a river or canal for 20 minutes.', icon: 'bike', category: 'cycling', xp: 220, minutes: 40 },
  { id: 'river-reflection-photo', regionId: 'river', title: 'Mirror World', description: 'Take a photo of a reflection in the water.', icon: 'camera', category: 'art', xp: 210, minutes: 20 },
  { id: 'river-wildflowers', regionId: 'river', title: 'Wildflower Hunt', description: 'Find 5 different wildflowers and learn one name.', icon: 'flower', category: 'nature', xp: 220, minutes: 30 },
  { id: 'river-picnic-match', regionId: 'river', title: 'Riverside Kickabout', description: 'Play a game of football by the river with friends or family.', icon: 'volleyball', category: 'football', xp: 240, minutes: 45 },

  // The Summit: 1500 XP
  { id: 'summit-hill-climb', regionId: 'summit', title: 'Hill Climber', description: 'Climb to the top of a big hill and look out.', icon: 'mountain', category: 'exploring', xp: 300, minutes: 60 },
  { id: 'summit-stargazer', regionId: 'summit', title: 'Star Gazer', description: 'Find a constellation in the night sky.', icon: 'telescope', category: 'nature', xp: 300, minutes: 30 },
  { id: 'summit-camp-out', regionId: 'summit', title: 'Camp Out', description: 'Spend a night camping, even if it\'s in the garden.', icon: 'tent', category: 'exploring', xp: 300, minutes: 120 },
  { id: 'summit-long-ride', regionId: 'summit', title: 'Long Haul', description: 'Ride your bike for an hour with a grown-up.', icon: 'bike', category: 'cycling', xp: 300, minutes: 60 },
  { id: 'summit-flag', regionId: 'summit', title: 'Plant Your Flag', description: 'Make a flag and take a photo with it at your favourite spot.', icon: 'flag', category: 'art', xp: 300, minutes: 30 }
];

/**
 * Badge rules. Each `rule` is checked against a kid's running progress:
 *   { completed, byCategory: { [category]: n }, clearedRegions: Set, bestStreak }
 */
const badges = [
  { id: 'first-steps', name: 'First Steps', description: 'Complete your first challenge.', icon: 'footprints', rule: (p) => p.completed >= 1 },
  { id: 'trail-regular', name: 'Trail Regular', description: 'Complete 10 challenges.', icon: 'map', rule: (p) => p.completed >= 10 },
  { id: 'legend', name: 'Legend of the Trail', description: 'Complete 25 challenges.', icon: 'star', rule: (p) => p.completed >= 25 },

  { id: 'streak-3', name: 'On a Roll', description: 'Get outside 3 days in a row.', icon: 'sun', rule: (p) => p.bestStreak >= 3 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Get outside 7 days in a row.', icon: 'flame', rule: (p) => p.bestStreak >= 7 },

  { id: 'nature-buff', name: 'Nature Buff', description: 'Complete 5 nature challenges.', icon: 'leaf', rule: (p) => (p.byCategory.nature || 0) >= 5 },
  { id: 'pedal-power', name: 'Pedal Power', description: 'Complete 3 cycling challenges.', icon: 'bike', rule: (p) => (p.byCategory.cycling || 0) >= 3 },
  { id: 'pathfinder', name: 'Pathfinder', description: 'Complete 5 exploring challenges.', icon: 'compass', rule: (p) => (p.byCategory.exploring || 0) >= 5 },
  { id: 'outdoor-artist', name: 'Outdoor Artist', description: 'Complete 3 art challenges.', icon: 'palette', rule: (p) => (p.byCategory.art || 0) >= 3 },
  { id: 'ball-skills', name: 'Ball Skills', description: 'Complete 3 football challenges.', icon: 'volleyball', rule: (p) => (p.byCategory.football || 0) >= 3 },

  ...regions.map((region) => ({
    id: `cleared-${region.id}`,
    name: `${region.name} Cleared`,
    description: `Complete every challenge in ${region.name}.`,
    icon: 'flag',
    rule: (p) => p.clearedRegions.has(region.id)
  }))
];

const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]));
const regionById = new Map(regions.map((region) => [region.id, region]));

module.exports = {
  regions,
  challenges,
  badges,
  challengeById,
  regionById
};
