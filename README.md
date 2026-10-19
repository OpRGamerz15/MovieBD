# MovieBD 🎬

MovieBD is a free, ad-free **movie discovery website** built with plain HTML, CSS and JavaScript. Browse Hollywood, Bollywood, Tamil, Telugu and international films, then find **legal** ways to watch them.

MovieBD does **not** host, scrape, proxy or link to pirated streams, and it has no fake player. The site itself adds no ads, trackers, pop-ups or redirects. Outside services it links to (YouTube, JustWatch, Internet Archive, streaming services) may have their own ads or subscriptions.

## 1. What works without an API key (demo mode)

- A small **sample catalogue** (clearly labelled "Sample") with live title search, genre chips and language filter
- Movie details, "Find Legal Streams" (a JustWatch search link), "Official Trailer" (a YouTube search link) and "Find Free Classics" (Internet Archive search)
- A curated list of early films commonly described as public domain
- Watchlist saved in your browser

Demo mode is not live data, and it does not rank anything by popularity.

## 2. Add a TMDB API key (optional, for real data)

1. Create a free account at <https://www.themoviedb.org>.
2. Open **Settings → API** and request a key (free for non-commercial use; read TMDB's current terms).
3. In MovieBD, click the **⚙** button, paste the key, choose your region, and **Save settings**.

With a key you get popular/trending lists, language rows, search, genres, posters, ratings, trailers and where-to-watch data for your region. If a request fails, a banner explains why and sample data fills the gap.

> **Security:** a key used in front-end code is visible to anyone who inspects network requests. Never use a private secret. Do not commit a key to the repository (MovieBD only stores it in the visitor's own browser). For stronger protection, a future upgrade is a tiny server-side proxy (for example a Cloudflare Worker) that holds the key and forwards requests.

## 3. Attribution and licences

- Footer text required by TMDB is included: *"This product uses the TMDB API but is not endorsed or certified by TMDB."* TMDB's guidelines also ask for their logo in a credits section. Download it from TMDB's brand page and add it to the footer if you publish the site publicly. Re-check their terms before launch, as they change.
- Where-to-watch data is provided by JustWatch via TMDB and must be credited (done in the footer and details panel).
- MovieBD's own code is MIT licensed (see `LICENSE`). Movies, posters and metadata belong to their owners.

## 4. Run locally

The site uses JavaScript modules, so open it through a small web server (double-clicking `index.html` will not work in most browsers).

**VS Code:** open the `moviebd` folder (**File → Open Folder**), install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

**Or from a terminal:** `python3 -m http.server 8000` inside the folder, then visit <http://localhost:8000>.

## 5. Deploy to GitHub Pages (free)

1. Create a GitHub repository and push this folder (`index.html` at the repository root).
2. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, then save.
3. After a minute your site is at `https://<user>.github.io/<repo>/`.

## 6. Deploy to Cloudflare Pages (free)

1. In the Cloudflare dashboard open **Workers & Pages → Create → Pages** and connect your repository.
2. Build command: leave empty. Output directory: `/` (the root).
3. Deploy. You get a `*.pages.dev` address. No paid domain is needed.

## 7. Troubleshooting

| Problem | What to try |
| --- | --- |
| Red banner "TMDB rejected the API key (401)" | Re-copy the key; make sure it is a v3 key or v4 read token |
| "Network error" | Check your connection; ad blockers or strict privacy tools can block `api.themoviedb.org` |
| "Too many requests (429)" | Wait a minute and press **Retry** |
| Posters missing | Some titles have none (a coloured placeholder is shown); blockers may also block `image.tmdb.org` |
| Page is blank locally | Use a local server (section 4), not `file://` |
| Provider list empty | TMDB may have no data for your region; try another region in Settings or use the JustWatch button |

## 8. Add an authorised video source

Only add video you **own or are licensed to show**. Open `js/data.js` and fill `AUTHORISED_VIDEOS`:

```js
export const AUTHORISED_VIDEOS = {
  'sample:101': { src: 'https://your-host.example/film.mp4', licence: 'Public domain, verified at https://…' },
};
```

The key is the movie's key (`sample:<id>` or `tmdb:<id>`). Only `https` links ending in `.mp4`, `.webm` or `.ogv` are accepted. Without an entry, MovieBD shows a clear "no authorised source" message, never a fake player. The sample classics are **not** pre-wired to any video, because rights vary by country and edition.

## 9. Why the watchlist doesn't sync

The watchlist and settings use your browser's `localStorage`. They stay on that device and browser, and are lost if you clear site data. Syncing needs accounts and a database.

## 10. What needs a backend later

Accounts and cloud-synced watchlists, hiding the TMDB key behind a proxy, caching API responses, ratings or reviews by users, and any DRM-protected playback.

## Project layout

```
index.html        page structure
css/style.css     theme and layout
js/app.js         startup, rows, search, filters, modals, settings
js/api.js         TMDB requests and error handling
js/storage.js     localStorage (watchlist and settings)
js/ui.js          safe DOM builders (no innerHTML)
js/data.js        sample catalogue and authorised-video list
assets/favicon.svg
```

## Manual test checklist

Automated checks run during development covered only JavaScript syntax and storage logic. **No browser testing was done**, so please verify:

1. Page loads with no console errors; the demo-mode banner appears.
2. Resize to phone width: the menu button opens the nav; rows scroll sideways.
3. Nav links jump to Classics, Explore, Genres and Watchlist.
4. Type in search: the list filters instantly; ✕ and Esc clear it. Search for nonsense to see the empty state.
5. Click genre chips and the language select; "Clear search & filters" resets.
6. Open a movie: details show; Esc, ✕ and clicking outside close it; Tab stays inside the dialog.
7. Add to watchlist (+), check the counter, refresh, and confirm it persists; remove it; confirm the empty state.
8. Open a classic: "Find Free Classics" appears. Trailer and stream buttons open new tabs.
9. Settings: enter a bad key and see the error banner with sample fallback; enter a real key and see "Live metadata loaded from TMDB", provider chips and a real trailer link.
10. Use "Remove key" and "Reset all settings" to return to demo mode.
11. Network tab: no requests to ad or tracking hosts.
