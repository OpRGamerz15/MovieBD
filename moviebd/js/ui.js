// ui.js — builds DOM elements safely.
// We never put API text into innerHTML. el() uses textContent / text nodes, so
// titles or synopses containing "<script>" are shown as plain text, not executed.

export const LANG_NAMES = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', ja: 'Japanese', ko: 'Korean', fr: 'French', es: 'Spanish', de: 'German' };
export const genreLabel = (g) => (g === 'Science Fiction' ? 'Sci-Fi' : g);

// el('div', {class:'x', onClick: fn}, child1, 'text', ...) -> HTMLElement
export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid); // strings become text nodes
  return n;
}

// Only allow https links (optionally limited to certain hosts).
export function safeUrl(u, hosts) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return null;
    if (hosts && !hosts.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return null;
    return url.href;
  } catch { return null; }
}

// External link that opens in a new tab without leaking the opener.
export function extLink(href, text, cls = 'btn btn-ghost') {
  const safe = safeUrl(href);
  if (!safe) return null;
  return el('a', { class: cls, href: safe, target: '_blank', rel: 'noopener noreferrer' }, text, el('span', { class: 'sr', text: ' (opens in a new tab)' }));
}

const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

function poster(movie, big = false) {
  const fallback = () => el('div', { class: 'poster-fallback', style: `--h:${hue(movie.title)}` }, el('span', { text: movie.title }));
  if (!movie.poster) return fallback();
  const image = el('img', { src: movie.poster, alt: big ? `Poster for ${movie.title}` : '', loading: 'lazy', decoding: 'async', width: 342, height: 513 });
  image.addEventListener('error', () => image.replaceWith(fallback())); // broken image -> placeholder
  return image;
}

// Updates a watchlist button (icon button on cards, text button in hero/details).
export function setWatchBtn(btn, watched, title) {
  btn.setAttribute('aria-pressed', String(watched));
  btn.setAttribute('aria-label', `${watched ? 'Remove' : 'Add'} ${title} ${watched ? 'from' : 'to'} watchlist`);
  if (btn.dataset.label === 'text') btn.textContent = watched ? '✓ In watchlist' : '+ Add to watchlist';
  else btn.textContent = watched ? '✓' : '+';
}

function watchBtn(movie, watched, onToggle, text = false) {
  const btn = el('button', { type: 'button', class: text ? 'btn btn-ghost wl-btn' : 'wl-btn', dataset: { key: movie.key, title: movie.title, label: text ? 'text' : 'icon' }, onClick: () => onToggle(movie) });
  setWatchBtn(btn, watched, movie.title);
  return btn;
}

export function metaText(m) {
  const parts = [m.year, m.runtime ? `${m.runtime} min` : null, LANG_NAMES[m.lang] || (m.lang ? m.lang.toUpperCase() : null), m.genres.map(genreLabel).join(', ') || null];
  return parts.filter(Boolean).join(' • ');
}

export function card(movie, { watched, onOpen, onToggle }) {
  return el('article', { class: 'card' },
    el('button', { type: 'button', class: 'card-open', 'aria-label': `View details: ${movie.title}${movie.year ? ` (${movie.year})` : ''}`, onClick: () => onOpen(movie) },
      el('div', { class: 'poster' }, poster(movie),
        movie.source === 'sample' && el('span', { class: 'tag' }, 'Sample'),
        movie.rating && el('span', { class: 'rating', title: 'TMDB user rating' }, `★ ${movie.rating}`)),
      el('span', { class: 'card-title', text: movie.title }),
      el('span', { class: 'card-sub', text: [movie.year, movie.genres.slice(0, 2).map(genreLabel).join('/')].filter(Boolean).join(' • ') })),
    watchBtn(movie, watched, onToggle));
}

export const skeletons = (n) => Array.from({ length: n }, () => el('div', { class: 'card skeleton', 'aria-hidden': 'true' }, el('div', { class: 'poster' })));

// A friendly box for loading / empty / error messages.
export function stateBox(kind, title, text, actions = []) {
  return el('div', { class: `state ${kind}`, role: kind === 'error' ? 'alert' : null }, el('strong', { text: title }), text && el('p', { text }), actions.length ? el('div', { class: 'actions' }, actions) : null);
}

export const button = (label, onClick, cls = 'btn btn-ghost') => el('button', { type: 'button', class: cls, onClick }, label);

// ---- Hero ----
export function renderHero(root, movie, { watched, onOpen, onToggle }) {
  root.style.setProperty('--h', hue(movie.title));
  root.replaceChildren(
    movie.backdrop ? el('img', { class: 'hero-bg', src: movie.backdrop, alt: '', fetchpriority: 'high', decoding: 'async' }) : null,
    el('div', { class: 'hero-content' },
      el('p', { class: 'hero-kicker', text: movie.source === 'sample' ? 'Featured (sample data)' : 'Featured' }),
      el('h1', { id: 'hero-title', text: movie.title }),
      el('p', { class: 'meta', text: metaText(movie) }),
      el('p', { class: 'hero-text', text: movie.overview.length > 240 ? movie.overview.slice(0, 237) + '…' : movie.overview }),
      el('div', { class: 'actions' }, el('button', { type: 'button', class: 'btn btn-primary', onClick: () => onOpen(movie) }, 'Details & where to watch'), watchBtn(movie, watched, onToggle, true))));
}

// ---- Details modal ----
// Returns { meta, extras }: app.js fills `extras` later once trailer/provider data arrives.
export function renderDetails(root, movie, { watched, onToggle }) {
  const meta = el('p', { class: 'meta', text: metaText(movie) });
  const extras = el('div', { class: 'extras' });
  root.replaceChildren(el('div', { class: 'details' },
    el('div', { class: 'details-poster' }, el('div', { class: 'poster' }, poster(movie, true))),
    el('div', { class: 'details-main' },
      el('h2', { id: 'details-title', text: movie.title }), meta,
      movie.rating && el('p', { class: 'meta', text: `TMDB user rating: ${movie.rating} / 10` }),
      el('p', { text: movie.overview || 'No synopsis available.' }),
      el('p', { class: 'note', text: movie.source === 'sample' ? 'Sample data bundled with MovieBD, not live data.' : 'Metadata from TMDB.' }),
      el('div', { class: 'actions' }, watchBtn(movie, watched, onToggle, true)),
      extras)));
  return { meta, extras };
}

const justWatchPath = { US: 'us', GB: 'uk', IN: 'in', CA: 'ca', AU: 'au' };
const PROVIDER_GROUPS = [['flatrate', 'Subscription'], ['free', 'Free'], ['ads', 'Free with ads'], ['rent', 'Rent'], ['buy', 'Buy']];

// ctx: { movie, region, status: 'idle'|'loading'|'error'|'ready', message, providers, trailerKey, video }
export function renderExtras(root, ctx) {
  const { movie } = ctx;
  const q = encodeURIComponent(`${movie.title}${movie.year ? ' ' + movie.year : ''}`);
  const jw = `https://www.justwatch.com/${justWatchPath[ctx.region] || 'us'}/search?q=${encodeURIComponent(movie.title)}`;
  const trailer = ctx.trailerKey ? `https://www.youtube.com/watch?v=${ctx.trailerKey}` : `https://www.youtube.com/results?search_query=${q}+official+trailer`;
  const archive = `https://archive.org/search?query=${encodeURIComponent(movie.title)}&and%5B%5D=mediatype%3A%22movies%22`;
  const showClassics = movie.classic || (movie.year && Number(movie.year) <= 1930);

  const out = [el('div', { class: 'actions' },
    extLink(trailer, ctx.trailerKey ? 'Official Trailer' : 'Official Trailer (YouTube search)', 'btn btn-primary'),
    extLink(jw, 'Find Legal Streams', 'btn btn-primary'),
    showClassics && extLink(archive, 'Find Free Classics', 'btn btn-ghost'),
    showClassics && extLink('https://archive.org/details/movies', 'Internet Archive movies', 'btn btn-ghost'))];

  if (!ctx.trailerKey) out.push(el('p', { class: 'note', text: 'The trailer button opens a YouTube search. Check that the channel is the studio’s or distributor’s official one.' }));

  // Where-to-watch block (real data only)
  const block = el('section', { class: 'providers', 'aria-label': 'Where to watch' }, el('h3', { text: `Where to watch (${ctx.region})` }));
  if (ctx.status === 'loading') block.append(el('p', { class: 'note', text: 'Checking provider availability…' }));
  else if (ctx.status === 'error') block.append(el('p', { class: 'note error-text', role: 'alert', text: `Could not load provider data: ${ctx.message} Use the JustWatch search button above instead.` }));
  else if (ctx.status === 'ready' && ctx.providers) {
    for (const [k, label] of PROVIDER_GROUPS) {
      if (ctx.providers[k].length) block.append(el('p', { class: 'prov-row' }, el('span', { class: 'prov-label', text: label }), ctx.providers[k].map((n) => el('span', { class: 'pill', text: n }))));
    }
    const link = safeUrl(ctx.providers.link, ['themoviedb.org']);
    if (link) block.append(extLink(link, 'See all options on TMDB', 'btn btn-ghost'));
    block.append(el('p', { class: 'note', text: 'Provider data by JustWatch via TMDB. It can be out of date. “Free” may still include ads or need an account.' }));
  } else if (ctx.status === 'ready') block.append(el('p', { class: 'note', text: `TMDB lists no providers for ${ctx.region}. Try another region in Settings or use the JustWatch search.` }));
  else block.append(el('p', { class: 'note', text: 'Provider lookup needs a TMDB key and a title from TMDB. For this title, use “Find Legal Streams”, which searches JustWatch. Availability is not guaranteed.' }));
  out.push(block);

  // Player: only for videos you are authorised to show.
  const v = ctx.video && /\.(mp4|webm|ogv)(\?.*)?$/i.test(ctx.video.src) ? safeUrl(ctx.video.src) : null;
  out.push(el('section', { class: 'player', 'aria-label': 'Video' }, el('h3', { text: 'Watch here' }),
    v ? [el('video', { controls: true, preload: 'none', src: v, playsinline: true }, 'Your browser cannot play this video.'), el('p', { class: 'note', text: `Licence: ${ctx.video.licence || 'not stated'}` })]
      : el('p', { class: 'note', text: 'No authorised video source is available for this title on MovieBD. Use the legal viewing links above.' })));

  out.push(el('p', { class: 'note', text: 'Links go to third-party sites (YouTube, JustWatch, Internet Archive, streaming services) that have their own ads, subscriptions and privacy policies. Check an item’s rights information before assuming it is free to redistribute.' }));
  root.replaceChildren(...out.filter(Boolean));
}
