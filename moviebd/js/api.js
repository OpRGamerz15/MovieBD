// api.js — talks to the TMDB API (https://developer.themoviedb.org).
// Only runs when the visitor has entered an API key in Settings.
// NOTE: a key used in the browser is visible to anyone who inspects network requests.

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';

export class ApiError extends Error {}

// Only accept simple image paths like "/abc123.jpg" before building an image URL.
const img = (path, size) => (typeof path === 'string' && /^\/[\w.-]+$/.test(path) ? IMG + size + path : null);

// One helper for every request: adds the key, a timeout, and friendly error messages.
async function request(key, path, params = {}) {
  if (!key) throw new ApiError('No API key set.');
  const url = new URL(BASE + path);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v != null) url.searchParams.set(k, v);
  }
  const headers = { Accept: 'application/json' };
  // v4 "Read Access Tokens" are long; v3 API keys are 32 characters.
  if (key.length > 40) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set('api_key', key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'The request timed out.' : 'Network error. Check your connection or content blocker.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new ApiError('TMDB rejected the API key (401). Check it in Settings.');
  if (res.status === 404) throw new ApiError('TMDB could not find that item (404).');
  if (res.status === 429) throw new ApiError('Too many requests (429). Wait a moment and retry.');
  if (!res.ok) throw new ApiError(`TMDB returned HTTP ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw new ApiError('TMDB sent an unreadable response.');
  }
}

// Convert a TMDB result into the simple shape the rest of the app uses.
function normalise(r, genres) {
  const year = (r.release_date || '').slice(0, 4);
  return {
    key: `tmdb:${r.id}`, source: 'tmdb', id: r.id,
    title: r.title || r.original_title || 'Untitled',
    year: year || null, lang: r.original_language || null, genres,
    overview: r.overview || '',
    rating: r.vote_count > 0 && r.vote_average > 0 ? Math.round(r.vote_average * 10) / 10 : null,
    poster: img(r.poster_path, 'w342'), backdrop: img(r.backdrop_path, 'w1280'),
    runtime: r.runtime || null,
  };
}

// Genre list is fetched once per key and cached.
let genreCache = { key: null, list: null };
export async function getGenres(key) {
  if (genreCache.key === key && genreCache.list) return genreCache.list;
  const data = await request(key, '/genre/movie/list');
  const list = (data.genres || []).filter((g) => g && g.id && g.name);
  genreCache = { key, list };
  return list;
}

// kind: 'popular' | 'trending' | 'discover' | 'search'
export async function listMovies(key, { kind, page = 1, lang = '', genreIds = '', query = '' }) {
  const genres = await getGenres(key);
  const names = new Map(genres.map((g) => [g.id, g.name]));
  const params = { page };
  let path;
  if (kind === 'popular') path = '/movie/popular';
  else if (kind === 'trending') path = '/trending/movie/week';
  else if (kind === 'search') { path = '/search/movie'; params.query = query; params.include_adult = 'false'; }
  else {
    path = '/discover/movie';
    Object.assign(params, { sort_by: 'popularity.desc', 'vote_count.gte': 100, include_adult: 'false', with_original_language: lang, with_genres: genreIds });
  }
  const data = await request(key, path, params);
  const movies = (data.results || []).map((r) => normalise(r, (r.genre_ids || []).map((id) => names.get(id)).filter(Boolean)));
  return { movies, page: data.page || page, totalPages: Math.min(data.total_pages || 1, 500) };
}

// Details + trailer + "where to watch" data in a single request.
export async function getDetails(key, id, region) {
  const d = await request(key, `/movie/${encodeURIComponent(id)}`, { append_to_response: 'videos,watch/providers' });
  const movie = normalise(d, (d.genres || []).map((g) => g.name));

  const vids = (d.videos && d.videos.results) || [];
  const yt = vids.filter((v) => v.site === 'YouTube' && /^[\w-]{6,20}$/.test(v.key || ''));
  const trailer = yt.find((v) => v.type === 'Trailer' && v.official) || yt.find((v) => v.type === 'Trailer');

  const p = (d['watch/providers'] && d['watch/providers'].results && d['watch/providers'].results[region]) || null;
  const names = (list) => (Array.isArray(list) ? list.map((x) => x.provider_name).filter(Boolean) : []);
  const providers = p
    ? { link: p.link || null, flatrate: names(p.flatrate), free: names(p.free), ads: names(p.ads), rent: names(p.rent), buy: names(p.buy) }
    : null;

  return { movie, trailerKey: trailer ? trailer.key : null, providers };
}
