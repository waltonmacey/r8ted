// Seed data carries the POC proof forward: composite drives rank, not entry order.
// Allen Iverson (9.5 + 7.5 + 9 + 10) / 4 = 9.00 ranks 04,
// ahead of Isiah Thomas (9 + 8 + 9 + 9) / 4 = 8.75.
// Three entries are intentionally unscored so the Bench renders on first load.

const e = (name, blurb, keyStat, scores) => ({
  id: `seed-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  name,
  blurb,
  keyStat,
  imageUrl: '',
  scores,
  catalogItemRef: name,
})

export const SEED_LISTS = [
  {
    id: 'seed-point-guards',
    title: 'Point Guards',
    tagline: 'The floor generals, ranked.',
    domainId: 'leisure',
    subId: 'sports',
    scoreLabels: ['Peak', 'Longevity', 'Skill', 'Aura'],
    catalogId: 'point-guards',
    entries: [
      e('Magic Johnson', 'Showtime incarnate. Ran the break like nobody before or since.', '5x NBA champion', [10, 8.5, 9.5, 10]),
      e('Stephen Curry', 'Changed the geometry of the sport.', '4x champion | 2x MVP', [9.5, 9, 9.5, 9.5]),
      e('Oscar Robertson', 'Averaged a triple-double before it was a stat line anyone tracked.', '1962: 30.8 / 12.5 / 11.4', [9.5, 9, 9, 9]),
      e('Allen Iverson', 'Pound for pound the toughest scorer the position has seen.', '2001 MVP at 165 lbs', [9.5, 7.5, 9, 10]),
      e('Isiah Thomas', 'The Bad Boys engine. Won ugly and beautiful in the same game.', 'Back-to-back titles 89-90', [9, 8, 9, 9]),
      e('Chris Paul', 'The Point God. Mid-range surgeon, defensive pest.', 'All-time steals leader chase', [9, 9, 9, 7.5]),
      e('John Stockton', 'Never missed the pass, rarely missed a game.', '15,806 career assists', [8.5, 9.5, 9, 7]),
      e('Jason Kidd', 'Saw the play three passes early.', 'Triple-double machine', [8.5, 9, 8.5, 7.5]),
      e('Steve Nash', 'Seven seconds or less, two MVPs.', 'Back-to-back MVP 05-06', [9, 8, 9, 7]),
      e('Russell Westbrook', 'Averaged a triple-double for a whole season. Four times.', '2017 MVP', [9, 7.5, 7.5, 8.5]),
      e('Walt Frazier', 'Clyde. Style and steals in equal measure.', 'Game 7, 1970: 36 and 19', [8.5, 7.5, 8, 8]),
      e('Gary Payton', 'The Glove. Talked it and backed it.', null, null),
      e('Derrick Rose', 'Youngest MVP ever.', null, null),
      e('Ja Morant', 'Vertical audacity.', null, null),
    ],
  },
]
