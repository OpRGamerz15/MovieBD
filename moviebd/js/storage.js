// storage.js — saves the watchlist and settings in this browser's localStorage.
// Data never leaves the browser and is NOT synced between devices.

const WATCH_KEY = 'moviebd.watchlist.v1';
const SETTINGS_KEY = 'moviebd.settings.v1';
export const DEFAULT_SETTINGS = { apiKey: '', region: 'US' };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // storage blocked or data corrupted
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private mode, quota exceeded, etc.
  }
}

// ---- Settings ----
export function loadSettings() {
  const saved = read(SETTINGS_KEY, {});
  return {
    apiKey: typeof saved.apiKey === 'string' ? saved.apiKey.trim() : '',
    region: typeof saved.region === 'string' ? saved.region : DEFAULT_SETTINGS.region,
  };
}
export const saveSettings = (settings) => write(SETTINGS_KEY, settings);
export function resetSettings() {
  try { localStorage.removeItem(SETTINGS_KEY); } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

// ---- Watchlist ----
// We store a small copy of each movie so the list still works if the catalogue changes.
const str = (v) => (typeof v === 'string' ? v : null);

function clean(m) {
  if (!m || typeof m !== 'object' || !str(m.key) || !str(m.title)) return null;
  return {
    key: m.key, source: m.source === 'tmdb' ? 'tmdb' : 'sample', id: m.id,
    title: m.title, year: str(m.year), lang: str(m.lang),
    genres: Array.isArray(m.genres) ? m.genres.filter((g) => typeof g === 'string') : [],
    overview: str(m.overview) || '', rating: typeof m.rating === 'number' ? m.rating : null,
    poster: str(m.poster), backdrop: str(m.backdrop), classic: m.classic === true,
  };
}

export function loadWatchlist() {
  const list = read(WATCH_KEY, []);
  return Array.isArray(list) ? list.map(clean).filter(Boolean) : [];
}

export const isWatched = (key) => loadWatchlist().some((m) => m.key === key);

// Adds the movie if missing, removes it if present. Returns what happened.
export function toggleWatch(movie) {
  const list = loadWatchlist();
  const index = list.findIndex((m) => m.key === movie.key);
  let added = false;
  if (index >= 0) list.splice(index, 1);
  else { const c = clean(movie); if (c) { list.unshift(c); added = true; } }
  return { added, saved: write(WATCH_KEY, list) };
}

export function clearWatchlist() {
  return write(WATCH_KEY, []);
}
