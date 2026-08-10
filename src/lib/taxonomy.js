// The locked 4x4 grid, per the 2026-08-10 taxonomy update handoff (owner-locked,
// supersedes Culture/Lifestyle/Leisure/Personal). Exactly 4 domains, exactly 4
// subcategories each; the shape is a mockup design constraint and cannot flex.
// Routing doctrine (10 rules) lives in the handoff doc; scope strings below are
// the short form. defaultScoreLabels seed every new list in that subcategory;
// any list can override at creation.

export const DOMAINS = [
  {
    id: 'story-screen',
    name: 'Story & Screen',
    accent: '#00eefc',
    subcategories: [
      {
        id: 'movies',
        name: 'Movies',
        scope: 'Live action feature films, franchises, director runs',
        defaultScoreLabels: ['Story', 'Characters', 'Rewatchability', 'Impact'],
      },
      {
        id: 'tv-anime',
        name: 'TV & Anime',
        scope: 'Series of any kind, all animated works, comedy specials',
        defaultScoreLabels: ['Story', 'Characters', 'Consistency', 'Peak'],
      },
      {
        id: 'books-comics',
        name: 'Books & Comics',
        scope: 'Novels, nonfiction, manga, graphic novels',
        defaultScoreLabels: ['Writing', 'Story', 'Ideas', 'Rereadability'],
      },
      {
        id: 'characters',
        name: 'Characters',
        scope: 'Fictional people from any medium',
        defaultScoreLabels: ['Design', 'Depth', 'Memorability', 'Icon Status'],
      },
    ],
  },
  {
    id: 'sound-play',
    name: 'Sound & Play',
    accent: '#a78bfa',
    subcategories: [
      {
        id: 'music-audio',
        name: 'Music & Audio',
        scope: 'Albums, artists, songs, podcasts, audio hosts',
        defaultScoreLabels: ['Excellence', 'Peak', 'Replay', 'Impact'],
      },
      {
        id: 'gaming-nostalgia',
        name: 'Gaming & Nostalgia',
        scope: 'Video games, consoles, toys, collectibles, childhood eras',
        defaultScoreLabels: ['Fun', 'Memory', 'Iconic', 'Love'],
      },
      {
        id: 'internet-apps',
        name: 'Internet & Apps',
        scope: 'Apps, websites, platforms, creators, channels, memes',
        defaultScoreLabels: ['Usefulness', 'Design', 'Addictiveness', 'Staying Power'],
      },
      {
        id: 'hobbies-activities',
        name: 'Hobbies & Activities',
        scope: 'Pursuits: tabletop games, crafts, sports you play, outdoor activities',
        defaultScoreLabels: ['Fun', 'Depth', 'Accessibility', 'Payoff'],
      },
    ],
  },
  {
    id: 'food-sports',
    name: 'Food & Sports',
    accent: '#ffba20',
    subcategories: [
      {
        id: 'food-drink',
        name: 'Food & Drink',
        scope: 'Brands, dishes, cuisines, anything edible that is not a venue',
        defaultScoreLabels: ['Taste', 'Value', 'Consistency', 'Experience'],
      },
      {
        id: 'restaurants',
        name: 'Restaurants',
        scope: 'Venues, fast food to fine dining, chains and locals',
        defaultScoreLabels: ['Food', 'Value', 'Experience', 'Consistency'],
      },
      {
        id: 'athletes-legends',
        name: 'Athletes & Legends',
        scope: 'Competitors past and present, coaches, sporting figures',
        defaultScoreLabels: ['Peak', 'Longevity', 'Accolades', 'Impact'],
      },
      {
        id: 'teams-dynasties',
        name: 'Teams & Dynasties',
        scope: 'Specific squads, eras, and runs, not franchises as institutions',
        defaultScoreLabels: ['Talent', 'Dominance', 'Signature Moments', 'Legacy'],
      },
    ],
  },
  {
    id: 'places-things',
    name: 'Places & Things',
    accent: '#ffffff',
    subcategories: [
      {
        id: 'cities-travel',
        name: 'Cities & Travel',
        scope: 'Cities, countries, neighborhoods, destinations',
        defaultScoreLabels: ['Vibe', 'Food', 'Things to Do', 'Livability'],
      },
      {
        id: 'outdoors-parks',
        name: 'Outdoors & Parks',
        scope: 'National parks, trails, beaches, natural places',
        defaultScoreLabels: ['Experience', 'Access', 'Activities', 'Awe'],
      },
      {
        id: 'gear-tech',
        name: 'Gear & Tech',
        scope: 'Objects judged by function: phones, consoles, cars, tools, equipment',
        defaultScoreLabels: ['Performance', 'Design', 'Reliability', 'Value'],
      },
      {
        id: 'style-brands',
        name: 'Style & Brands',
        scope: 'Objects and labels judged by identity: sneakers, clothing, watches',
        defaultScoreLabels: ['Look', 'Quality', 'Value', 'Versatility'],
      },
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
  return getDomain(domainId)?.accent ?? '#ffffff'
}
