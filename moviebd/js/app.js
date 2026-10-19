// app.js — wires everything together: rows, explore grid, search, watchlist, modals, settings.
import { SAMPLE_MOVIES, FALLBACK_GENRES, AUTHORISED_VIDEOS } from './data.js';
import * as api from './api.js';
import * as store from './storage.js';
import * as ui from './ui.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  settings: store.loadSettings(),
  watchlist: store.loadWatchlist(),
  live: false,          // true only after a real TMDB request succeeded
  lastError: null,      // message of the most recent failed TMDB request
  genres: FALLBACK_GENRES,
  explore: { query: '', genre: 'All', lang: 'all', page: 1, totalPages: 1, items: [], token: 0, started: false },
};

const hasKey = () => state.settings.apiKey.length > 0;
const isWatched = (key) => state.watchlist.some((m) => m.key === key);

// Row definitions. `sample` decides which sample titles appear when live data is not available.
const ROWS = [
  { id: 'popular', title: 'Popular movies', kind: 'popular', sample: (m) => true },
  { id: 'trending', title: 'Trending this week', kind: 'trending', sample: () => false }, // live data only
  { id: 'hollywood', title: 'Hollywood & English-language', kind: 'discover', lang: 'en', sample: (m) => m.lang === 'en' },
  { id: 'bollywood', title: 'Bollywood & Hindi cinema', kind: 'discover', lang: 'hi', sample: (m) => m.lang === 'hi' },
  { id: 'tamil', title: 'Tamil cinema', kind: 'discover', lang: 'ta', sample: (m) => m.lang === 'ta' },
  { id: 'telugu', title: 'Telugu cinema', kind: 'discover', lang: 'te', sample: (m) => m.lang === 'te' },
  { id: 'family', title: 'Animation & family', kind: 'discover', genreIds: '16|10751', sample: (m) => m.genres.includes('Animation') || m.genres.includes('Family') },
];

// ---------- Small helpers ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function cardOpts() {
  return { onOpen: openDetails, onToggle: toggleWatch };
}
function fillGrid(container, movies) {
  container.replaceChildren(...movies.map((m) => ui.card(m, { watched: isWatched(m.key), ...cardOpts() })));
}

function noteError(e) {
  state.lastError = e && e.message ? e.message : 'Unknown error.';
}

// Status banner: honest about demo vs live vs error.
function showMode() {
  const box = $('#status');
  const settingsBtn = ui.button('Open settings', openSettings);
  if (!hasKey()) {
    box.className = 'status info';
    box.replaceChildren(ui.el('span', { text: 'Demo mode: you are seeing a small sample catalogue, not live data. Add a free TMDB API key to load real movies.' }), settingsBtn);
  } else if (state.lastError) {
    box.className = 'status error';
    box.setAttribute('role', 'alert');
    box.replaceChildren(ui.el('span', { text: `Could not load live data from TMDB: ${state.lastError} Sample data is shown where live data is missing.` }), ui.button('Retry', reloadAll), settingsBtn);
  } else if (state.live) {
    box.className = 'status ok';
    box.setAttribute('role', 'status');
    box.replaceChildren(ui.el('span', { text: 'Live metadata loaded from TMDB.' }));
  } else {
    box.className = 'status info';
    box.replaceChildren(ui.el('span', { text: 'Contacting TMDB…' }));
  }
}

// ---------- Rows on the homepage ----------
function buildRows() {
  const root = $('#rows');
  for (const row of ROWS) {
    row.sub = ui.el('p', { class: 'section-sub' });
    row.body = ui.el('div', { class: 'row', role: 'list' });
    row.section = ui.el('section', { class: 'section', id: `row-${row.id}`, 'aria-labelledby': `h-${row.id}` },
      ui.el('div', { class: 'section-head' }, ui.el('h2', { id: `h-${row.id}`, text: row.title }), row.sub), row.body);
    root.append(row.section);
  }
}

async function loadRow(row) {
  row.section.hidden = false;
  row.body.replaceChildren(...ui.skeletons(8));
  let movies = null;
  if (hasKey()) {
    try {
      const res = await api.listMovies(state.settings.apiKey, { kind: row.kind, lang: row.lang, genreIds: row.genreIds });
      movies = res.movies;
      state.live = true;
      row.sub.textContent = 'Live from TMDB';
    } catch (e) { noteError(e); }
  }
  if (!movies) {
    movies = SAMPLE_MOVIES.filter((m) => !m.classic && row.sample(m));
    if (!movies.length) { row.section.hidden = true; return []; } // e.g. Trending needs live data
    row.sub.textContent = row.kind === 'popular' ? 'Sample data, not ranked by popularity' : 'Sample data, not live';
  }
  if (!movies.length) {
    row.body.replaceChildren(ui.stateBox('empty', 'Nothing to show here yet', 'TMDB returned no titles for this section.'));
    return [];
  }
  fillGrid(row.body, movies);
  row.body.querySelectorAll('.card').forEach((c) => c.setAttribute('role', 'listitem'));
  return movies;
}

async function loadAllRows() {
  state.lastError = null;
  state.live = false;
  showMode();
  const results = await Promise.all(ROWS.map(loadRow));
  const all = [results[1], results[0], ...results.slice(2)].flat();
  const hero = all.find((m) => m.backdrop) || all[0] || SAMPLE_MOVIES[0];
  renderHero(hero);
  showMode();
}

function renderHero(movie) {
  ui.renderHero($('#hero'), movie, { watched: isWatched(movie.key), onOpen: openDetails, onToggle: toggleWatch });
}

// ---------- Classics (curated sample list) ----------
function loadClassics() {
  fillGrid($('#classics-row'), SAMPLE_MOVIES.filter((m) => m.classic));
}

// ---------- Explore: search + filters + load more ----------
const ex = state.explore;
const genreId = (name) => (state.genres.find((g) => g.name === name) || {}).id || '';

function matchesFilters(m) {
  const q = ex.query.toLowerCase();
  return (!q || m.title.toLowerCase().includes(q)) && (ex.genre === 'All' || m.genres.includes(ex.genre)) && (ex.lang === 'all' || m.lang === ex.lang);
}

function renderChips() {
  const names = ['All', ...state.genres.map((g) => g.name)];
  $('#genre-chips').replaceChildren(...names.map((n) => ui.el('button', { type: 'button', class: 'chip', 'aria-pressed': String(n === ex.genre), onClick: () => { ex.genre = n; renderChips(); loadExplore(); } }, ui.genreLabel(n))));
}

async function loadExplore(append = false) {
  const token = ++ex.token;
  const grid = $('#explore-grid'), more = $('#load-more'), info = $('#explore-info');
  if (!append) { ex.page = 1; grid.replaceChildren(...ui.skeletons(10)); more.hidden = true; }
  else { more.disabled = true; more.textContent = 'Loading…'; }

  let items = null, total = 1, page = append ? ex.page + 1 : 1;
  if (hasKey()) {
    try {
      const key = state.settings.apiKey;
      const res = ex.query
        ? await api.listMovies(key, { kind: 'search', query: ex.query, page })
        : await api.listMovies(key, { kind: 'discover', page, lang: ex.lang === 'all' ? '' : ex.lang, genreIds: genreId(ex.genre) });
      if (token !== ex.token) return; // a newer request replaced this one
      state.live = true;
      items = ex.query ? res.movies.filter(matchesFilters) : res.movies; // search endpoint can't filter, so we do it here
      total = res.totalPages;
      ex.page = page;
    } catch (e) {
      if (token !== ex.token) return;
      noteError(e); showMode();
      if (append) { toast(`Could not load more: ${e.message}`); more.disabled = false; more.textContent = 'Load more'; more.hidden = false; return; }
    }
  }
  const fromSample = !items;
  if (fromSample) { items = SAMPLE_MOVIES.filter(matchesFilters); ex.items = []; }
  else ex.items = append ? [...ex.items, ...items.filter((n) => !ex.items.some((o) => o.key === n.key))] : items;
  ex.totalPages = total;

  const shown = fromSample ? items : ex.items;
  if (shown.length) fillGrid(grid, shown);
  else grid.replaceChildren(ui.stateBox('empty', ex.query ? `No results for “${ex.query}”` : 'No movies match these filters', 'Try a different title, genre or language.', [ui.button('Clear search & filters', clearAll)]));

  const what = fromSample ? 'sample titles (demo data)' : 'titles from TMDB';
  info.textContent = `${shown.length} ${what}${ex.query ? ` matching “${ex.query}”` : ''}${ex.query && !fromSample ? '. Genre and language filters apply to loaded results only.' : ''}`;
  more.disabled = false; more.textContent = 'Load more';
  more.hidden = fromSample || ex.page >= ex.totalPages;
}

function clearAll() {
  ex.query = ''; ex.genre = 'All'; ex.lang = 'all';
  $('#search').value = ''; $('#search-clear').hidden = true; $('#lang').value = 'all';
  renderChips(); loadExplore();
}

const remoteSearch = debounce(() => loadExplore(), 400); // wait for the user to stop typing before calling TMDB

function onSearchInput() {
  const input = $('#search');
  const had = ex.query !== '';
  ex.query = input.value.trim();
  $('#search-clear').hidden = !input.value;
  ex.started = true;
  if (ex.query && !had) $('#explore').scrollIntoView();
  if (hasKey()) remoteSearch(); else loadExplore(); // local catalogue filters instantly
}

// ---------- Watchlist ----------
function toggleWatch(movie) {
  const { added, saved } = store.toggleWatch(movie);
  state.watchlist = store.loadWatchlist();
  syncWatchUI();
  toast(!saved ? 'Could not save: browser storage is blocked.' : added ? `Added “${movie.title}” to your watchlist` : `Removed “${movie.title}” from your watchlist`);
}

function syncWatchUI() {
  $('#wl-count').textContent = String(state.watchlist.length);
  document.querySelectorAll('.wl-btn').forEach((b) => ui.setWatchBtn(b, isWatched(b.dataset.key), b.dataset.title));
  const grid = $('#watchlist-grid');
  $('#clear-watchlist').hidden = !state.watchlist.length;
  if (state.watchlist.length) fillGrid(grid, state.watchlist);
  else grid.replaceChildren(ui.stateBox('empty', 'Your watchlist is empty', 'Tap + on any movie to save it here. Saved titles stay in this browser only.'));
}

// ---------- Details modal ----------
async function openDetails(movie) {
  const dlg = $('#details');
  const { meta, extras } = ui.renderDetails($('#details-body'), movie, { watched: isWatched(movie.key), onToggle: toggleWatch });
  const ctx = { movie, region: state.settings.region, status: 'idle', video: AUTHORISED_VIDEOS[movie.key] || null };
  ui.renderExtras(extras, ctx);
  if (!dlg.open) dlg.showModal();
  document.body.classList.add('lock');

  if (movie.source === 'tmdb' && hasKey()) {
    ctx.status = 'loading';
    ui.renderExtras(extras, ctx);
    try {
      const d = await api.getDetails(state.settings.apiKey, movie.id, ctx.region);
      if (!extras.isConnected) return; // user opened something else meanwhile
      Object.assign(ctx, { status: 'ready', providers: d.providers, trailerKey: d.trailerKey });
      meta.textContent = ui.metaText({ ...movie, runtime: d.movie.runtime });
    } catch (e) {
      if (!extras.isConnected) return;
      Object.assign(ctx, { status: 'error', message: e.message });
    }
    ui.renderExtras(extras, ctx);
  }
}

// ---------- Settings ----------
function openSettings() {
  $('#api-key').value = state.settings.apiKey;
  $('#region').value = state.settings.region;
  $('#settings-error').textContent = '';
  $('#settings').showModal();
  document.body.classList.add('lock');
}

function applySettings(next, message) {
  state.settings = next;
  store.saveSettings(next);
  $('#settings').close();
  toast(message);
  reloadAll();
}

function reloadAll() {
  if (hasKey()) {
    api.getGenres(state.settings.apiKey).then((list) => { state.genres = list; renderChips(); }).catch(() => {});
  } else { state.genres = FALLBACK_GENRES; renderChips(); }
  loadAllRows();
  if (ex.started) loadExplore();
}

// ---------- Startup ----------
function init() {
  $('#year').textContent = new Date().getFullYear();
  buildRows();
  renderChips();
  syncWatchUI();
  loadClassics();

  // Navigation (mobile menu)
  const menu = $('#menu-btn'), nav = $('#site-nav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });

  // Search
  $('#search').addEventListener('input', onSearchInput);
  $('#search').addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; onSearchInput(); } });
  $('#search-clear').addEventListener('click', () => { $('#search').value = ''; onSearchInput(); $('#search').focus(); });
  $('#lang').addEventListener('change', (e) => { ex.lang = e.target.value; ex.started = true; loadExplore(); });
  $('#load-more').addEventListener('click', () => loadExplore(true));
  $('#reset-filters').addEventListener('click', clearAll);

  // Watchlist
  $('#clear-watchlist').addEventListener('click', () => {
    if (confirm('Remove every title from your watchlist?')) { store.clearWatchlist(); state.watchlist = store.loadWatchlist(); syncWatchUI(); toast('Watchlist cleared'); }
  });

  // Dialogs: Escape and the close button are handled by <dialog>; here we add backdrop click + scroll unlock.
  for (const dlg of document.querySelectorAll('dialog')) {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => document.body.classList.remove('lock'));
  }
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  // Settings form
  $('#settings-btn').addEventListener('click', openSettings);
  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const apiKey = $('#api-key').value.trim();
    if (apiKey && !/^[\w.-]{20,}$/.test(apiKey)) { $('#settings-error').textContent = 'That does not look like a TMDB key. Copy it again from your TMDB account settings.'; return; }
    applySettings({ apiKey, region: $('#region').value }, apiKey ? 'Settings saved. Loading live data…' : 'Settings saved. Demo mode is on.');
  });
  $('#remove-key').addEventListener('click', () => applySettings({ ...state.settings, apiKey: '' }, 'API key removed. Demo mode is on.'));
  $('#reset-settings').addEventListener('click', () => applySettings(store.resetSettings(), 'Settings reset to defaults.'));
  $('#show-key').addEventListener('change', (e) => { $('#api-key').type = e.target.checked ? 'text' : 'password'; });

  // Load the explore grid only when it scrolls near the viewport.
  const exploreSection = $('#explore');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); if (!ex.started) { ex.started = true; loadExplore(); } }
    }, { rootMargin: '400px' });
    io.observe(exploreSection);
  } else { ex.started = true; loadExplore(); }

  reloadAll();
}

init();
