// Domain > Subcategory matrix, per the locked gameplan.
// Lifestyle's fourth slot is intentionally open (owner to decide; Fitness and Style floated).
// defaultScoreLabels seed every new list in that subcategory; any list can override at creation.

export const DOMAINS = [
  {
    id: 'culture',
    name: 'Culture',
    accent: '#00f0ff',
    accentClass: 'text-culture',
    subcategories: [
      { id: 'movies', name: 'Movies', defaultScoreLabels: ['Story', 'Craft', 'Rewatch', 'Impact'] },
      { id: 'tv', name: 'TV Shows', defaultScoreLabels: ['Story', 'Characters', 'Bingeability', 'Ending'] },
      { id: 'music', name: 'Music', defaultScoreLabels: ['Songwriting', 'Sound', 'Replay', 'Influence'] },
      { id: 'lit-arts', name: 'Literature & Arts', defaultScoreLabels: ['Craft', 'Ideas', 'Feel', 'Staying Power'] },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    accent: '#ffb800',
    accentClass: 'text-lifestyle',
    subcategories: [
      { id: 'food', name: 'Food', defaultScoreLabels: ['Taste', 'Consistency', 'Value', 'Vibe'] },
      { id: 'home', name: 'Home', defaultScoreLabels: ['Function', 'Build', 'Value', 'Looks'] },
      { id: 'tech', name: 'Tech', defaultScoreLabels: ['Utility', 'Design', 'Reliability', 'Value'] },
      // fourth slot open: owner to decide (Fitness / Style floated)
    ],
  },
  {
    id: 'leisure',
    name: 'Leisure',
    accent: '#d0bcff',
    accentClass: 'text-leisure',
    subcategories: [
      { id: 'travel', name: 'Travel', defaultScoreLabels: ['Scenery', 'Food', 'Ease', 'Memory'] },
      { id: 'fun', name: 'Fun', defaultScoreLabels: ['Joy', 'Replay', 'Social', 'Value'] },
      { id: 'hobbies', name: 'Hobbies', defaultScoreLabels: ['Enjoyment', 'Depth', 'Payoff', 'Accessibility'] },
      { id: 'sports', name: 'Sports', defaultScoreLabels: ['Peak', 'Longevity', 'Skill', 'Aura'] },
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    accent: '#f9f9f9',
    accentClass: 'text-personal',
    subcategories: [
      { id: 'my-city', name: 'My City', defaultScoreLabels: ['Quality', 'Character', 'Value', 'Return Rate'] },
      { id: 'my-stuff', name: 'My Stuff', defaultScoreLabels: ['Use', 'Build', 'Value', 'Attachment'] },
      { id: 'goat', name: 'Greatest of All Time', defaultScoreLabels: ['Peak', 'Longevity', 'Dominance', 'Legacy'] },
      { id: 'wishlist', name: 'Wishlist', defaultScoreLabels: ['Want', 'Feasibility', 'Fit', 'Fun'] },
    ],
  },
]

export function getDomain(id) {
  return DOMAINS.find((d) => d.id === id)
}

export function getSubcategory(domainId, subId) {
  return getDomain(domainId)?.subcategories.find((s) => s.id === subId)
}

export function accentFor(domainId) {
  return getDomain(domainId)?.accent ?? '#f9f9f9'
}
