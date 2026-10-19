// data.js — sample catalogue, shown ONLY when no TMDB key is set or the API fails.
// Everything here is labelled "Sample" in the UI. No ratings or popularity numbers are included.
// Synopses are short original summaries written for this project.

const s = (n, title, year, lang, genres, overview, extra = {}) => ({
  key: `sample:${n}`, source: 'sample', id: n, title, year: String(year), lang, genres,
  overview, rating: null, poster: null, backdrop: null, ...extra,
});

export const SAMPLE_MOVIES = [
  s(1, 'Inception', 2010, 'en', ['Action', 'Science Fiction', 'Adventure'], 'A thief who steals secrets through shared dreams is offered a chance to have his past erased in exchange for planting an idea in a target’s mind.'),
  s(2, 'Interstellar', 2014, 'en', ['Adventure', 'Drama', 'Science Fiction'], 'Explorers travel through a wormhole near Saturn in search of a new home for humanity.'),
  s(3, 'Toy Story', 1995, 'en', ['Animation', 'Family', 'Comedy'], 'A cowboy doll feels threatened when a new space-ranger toy becomes his owner’s favourite.'),
  s(4, 'Spirited Away', 2001, 'ja', ['Animation', 'Family', 'Fantasy'], 'A girl wanders into a world of spirits and must work in a bathhouse to free her parents.'),
  s(5, 'Parasite', 2019, 'ko', ['Comedy', 'Thriller', 'Drama'], 'A poor family schemes its way into working for a wealthy household, with unexpected consequences.'),
  s(6, '3 Idiots', 2009, 'hi', ['Comedy', 'Drama'], 'Two friends search for their missing college companion and look back on their years at an engineering school.'),
  s(7, 'Lagaan', 2001, 'hi', ['Drama', 'Adventure'], 'Villagers in colonial India accept a cricket challenge from British officers to avoid a crushing tax.'),
  s(8, 'Dangal', 2016, 'hi', ['Drama'], 'A former wrestler trains his daughters to become world-class wrestlers.'),
  s(9, 'Vikram', 2022, 'ta', ['Action', 'Thriller'], 'A special agent investigates a string of killings by masked assailants.'),
  s(10, 'Asuran', 2019, 'ta', ['Drama', 'Action'], 'A farmer fights to protect his family after a feud with a powerful landowner turns violent.'),
  s(11, 'Baahubali: The Beginning', 2015, 'te', ['Action', 'Adventure', 'Fantasy'], 'A young man discovers his royal lineage and is drawn into a kingdom’s war.'),
  s(12, 'RRR', 2022, 'te', ['Action', 'Drama'], 'Two revolutionaries in 1920s India form a friendship while fighting British rule.'),
  // Classics: commonly described as public domain in the United States, but rules differ by
  // country and by edition (restorations, soundtracks). Always check the rights info on each item page.
  s(101, 'Nosferatu', 1922, 'de', ['Horror', 'Fantasy'], 'A silent vampire film about a count who travels to a new town, bringing plague with him.', { classic: true }),
  s(102, 'The Cabinet of Dr. Caligari', 1920, 'de', ['Horror', 'Fantasy'], 'A silent German Expressionist film in which a sleepwalker is exhibited by a sinister showman.', { classic: true }),
  s(103, 'A Trip to the Moon', 1902, 'fr', ['Science Fiction', 'Adventure'], 'A short silent film in which astronomers launch a capsule to the Moon.', { classic: true }),
  s(104, 'Metropolis', 1927, 'de', ['Science Fiction', 'Drama'], 'In a divided futuristic city, the ruler’s son allies with a workers’ movement.', { classic: true }),
  s(105, 'Night of the Living Dead', 1968, 'en', ['Horror'], 'Strangers barricade themselves in a farmhouse as the dead begin to rise.', { classic: true }),
  s(106, 'His Girl Friday', 1940, 'en', ['Comedy', 'Romance'], 'A newspaper editor schemes to win back his ex-wife, his best reporter, before she remarries.', { classic: true }),
  s(107, 'Charade', 1963, 'en', ['Romance', 'Comedy', 'Thriller'], 'A widow is pursued by men who want money her late husband hid, and turns to a charming stranger.', { classic: true }),
];

// Genres shown in demo mode. In live mode the list comes from TMDB instead.
export const FALLBACK_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Family', 'Fantasy', 'Horror', 'Romance', 'Science Fiction', 'Thriller']
  .map((name, i) => ({ id: 1000 + i, name }));

// Videos you OWN or are LICENSED to embed. Empty by default — MovieBD ships no full movies.
// Key = movie key (e.g. "sample:101" or "tmdb:603"). Example entry (only add films you have rights to):
//   'sample:101': { src: 'https://example.com/my-licensed-film.mp4', licence: 'Public domain — verified at <url>' }
// Only https URLs ending in .mp4 / .webm / .ogv are accepted.
export const AUTHORISED_VIDEOS = {};
