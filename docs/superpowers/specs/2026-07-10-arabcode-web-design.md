# Engineering Design Spec: arabcode web rebrand (packages/web)

Date: 2026-07-10 · Architect output for team "arabcode web rebrand"
Goal: `docs/superpowers/specs/2026-07-10-arabcode-web-goal.md`
Blueprint: `docs/superpowers/specs/2026-07-10-arabcode-web-team-blueprint.md`

All paths below are relative to `/home/abotrf/Desktop/opencode/packages/web/` unless absolute.
Builders: follow this spec verbatim. Do NOT re-investigate. Do NOT touch files owned by another builder (ownership table in blueprint + per-builder sections here). Never `git add -A` or commit.

---

## 0. How theming actually works here (read before touching CSS)

Verified facts (do not re-derive):

1. **CSS load order** (toolbeam-docs-theme plugin, `node_modules/toolbeam-docs-theme/index.ts`) prepends its CSS and appends user CSS. Final order:
   `@fontsource/ibm-plex-mono/*.css` → `toolbeam-docs-theme/styles/theme.css` → `tsdoc.css` → `markdown.css` → `headings.css` → **`./src/styles/custom.css` (ours, last — wins ties)**.
   Starlight's own `props.css` variables are defined on `:root` (dark) and `:root[data-theme='light']` (light).
2. **`data-theme` is always resolved.** Starlight's inline `ThemeProvider` script sets `document.documentElement.dataset.theme` to exactly `'light'` or `'dark'` (never `'auto'`) — from `localStorage['starlight-theme']` or `prefers-color-scheme`. So keying tokens off `:root` (dark default) + `:root[data-theme="light"]` is reliable. **The current `custom.css` wrongly uses `@media (prefers-color-scheme: dark)` — the rewrite must replace every such media query with `[data-theme]` selectors** (exception: the `.shiki` rule, see B-5).
3. **The theme toggle is currently hidden**: `toolbeam-docs-theme/styles/theme.css` line 125 has `starlight-theme-select { display: none; }`, and toolbeam's Header override never renders `<ThemeSelect/>`. To deliver the required light variant with a working toggle, Builder B re-enables it (see B-4).
4. **toolbeam component overrides are inert here**: `overrideComponents()` skips any component already overridden in `astro.config.mjs` — and this project overrides Head, Header, Footer itself (only PageTitle falls through to toolbeam). So editing `src/components/{Head,Header,Footer}.astro` is sufficient; toolbeam's copies only matter for Header's `<Default>` import (removed in B-4).
5. **Starlight variables the whole UI hangs on** (from `node_modules/@astrojs/starlight/style/props.css` + `toolbeam-docs-theme/styles/theme.css`):
   `--sl-color-{white,black,gray-1..7,accent,accent-low,accent-high,text,text-accent,text-invert,bg,bg-nav,bg-sidebar,bg-inline-code,bg-accent,hairline,hairline-light,hairline-shade,border,text-secondary,text-dimmed}` plus semantic `--sl-color-{green,red,orange,blue}[-low|-high]`. The share components consume **only** `--sl-color-*` vars (verified: zero hardcoded colors in `share.module.css` + all `share/*.module.css`). Re-valuing these vars re-themes the share viewer for free.
6. **Fonts**: toolbeam sets `--__sl-font: "IBM Plex Mono", var(--sl-font-system-mono)` — the entire docs UI is monospace. IBM Plex Mono has no Arabic glyphs; Arabic text currently falls through to random system fonts. Fix in B-6.
7. **Hero/lander mechanism**: `@astrojs/starlight/components/Page.astro` renders the `Hero` override **only when the page frontmatter has a `hero:` key**, and sets `data-has-hero` on `<html>`. Neither `src/content/docs/index.mdx` nor `ar/index.mdx` currently has `hero:` — **the Lander is dead code on this branch until Builder C adds the frontmatter** (C-1).
8. **Middleware** (`src/middleware.ts`): requests to exactly `/docs/` get 302-redirected to `/docs/<locale>/` based on `oc_locale` cookie or `Accept-Language`. **Arabic-language browsers never see `/docs/` — they land on `/docs/ar/`.** Therefore the lander must mount on BOTH the root index and the ar index (C-1).
9. **Base path**: `astro.config.mjs` has `base: "/docs"`, `output: "server"`, adapter cloudflare. Dev URL: `http://localhost:4321/docs/`. All `src/pages/*` routes are prefixed too (share = `/docs/s/<id>`).

---

## 1. Token contract

Single source of values: **Builder B** defines everything below in `src/styles/custom.css`. Builders A, C, D consume **names only** — never redefine values.

### 1.1 Brand primitives `--ac-*` (new, published for lander/share/header use)

Defined on `:root` (dark, the default) and re-valued on `:root[data-theme="light"]`:

| Token | Dark | Light |
|---|---|---|
| `--ac-bg` | `#0c0a07` | `#faf6ec` |
| `--ac-panel` | `#14110b` | `#f4edda` |
| `--ac-elevated` | `#1b1710` | `#ede4cb` |
| `--ac-border` | `#2a2418` | `#d9cca9` |
| `--ac-hairline` | `#201b12` | `#e6dcc2` |
| `--ac-text` | `#ece7db` | `#2b2416` |
| `--ac-text-dim` | `#b8b09c` | `#5c523c` |
| `--ac-muted` | `#7d766a` | `#857a60` |
| `--ac-accent` | `#ffaf00` | `#c98a00` |
| `--ac-accent-bright` | `#ffc23d` | `#8a5c00` |
| `--ac-accent-deep` | `#c98a00` | `#a36d00` |
| `--ac-accent-soft` | `rgba(255,175,0,0.11)` | `rgba(163,109,0,0.10)` |
| `--ac-accent-line` | `rgba(255,175,0,0.28)` | `rgba(163,109,0,0.35)` |
| `--ac-code-bg` | `#0a0806` | `#f1e9d2` |
| `--ac-code-fg` | `#e6ddcb` | `#3a3220` |
| `--ac-diff-add` | `#57d38c` | `#1c7c47` |
| `--ac-diff-remove` | `#f2708a` | `#b3264a` |
| `--ac-grid` | `rgba(255,175,0,0.045)` | `rgba(163,109,0,0.05)` |
| `--ac-on-accent` | `#1a1200` | `#1a1200` |
| `--ac-radius` | `10px` | same |
| `--ac-radius-sm` | `7px` | same |
| `--ac-font-ui` | `"Segoe UI", system-ui, "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif` | same |
| `--ac-font-mono` | `"IBM Plex Mono", ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace` | same |

Semantics: `--ac-accent-bright` is the **small-text/link gold** (AA ≥ 4.5:1 in both themes: `#ffc23d` on `#0c0a07`, `#8a5c00` on `#faf6ec`). `--ac-accent` is for fills/large glyphs; solid gold fills always pair with `--ac-on-accent` text (`#1a1200`). Terminal mockups (lander `.term`, see C-4) use **fixed dark values, both themes** — the terminal stays dark; use the literal dark values there, not the vars.

### 1.2 Starlight variable mapping (Builder B writes these; everyone else just benefits)

Dark, on `:root, ::backdrop` (override AFTER the `--ac-*` block):

```css
--sl-color-white: #ece7db;   --sl-color-black: #0c0a07;
--sl-color-gray-1: #e8e2d2;  --sl-color-gray-2: #cfc7b2;
--sl-color-gray-3: #97907e;  --sl-color-gray-4: #4a4232;
--sl-color-gray-5: #2a2418;  --sl-color-gray-6: #14110b;  --sl-color-gray-7: #100d09;
--sl-color-accent-low: #3a2a00; --sl-color-accent: #ffaf00; --sl-color-accent-high: #ffc23d;
--sl-color-text: #d8d1bf;
--sl-color-text-accent: var(--ac-accent-bright);
--sl-color-text-invert: var(--ac-on-accent);
--sl-color-text-secondary: var(--ac-text-dim);   /* toolbeam var */
--sl-color-text-dimmed: var(--ac-muted);         /* toolbeam var */
--sl-color-bg: var(--ac-bg);
--sl-color-bg-nav: #0f0c08;
--sl-color-bg-sidebar: var(--ac-bg);
--sl-color-bg-inline-code: var(--ac-elevated);
--sl-color-bg-accent: var(--ac-accent);
--sl-color-bg-surface: var(--ac-panel);          /* share components */
--sl-color-divider: var(--ac-border);            /* share components */
--sl-color-hairline-light: #2a2418; --sl-color-hairline: var(--ac-hairline); --sl-color-hairline-shade: #0a0806;
--sl-color-border: var(--ac-border);             /* toolbeam var */
/* semantic */
--sl-color-green-low: #1b3a28;  --sl-color-green: var(--ac-diff-add); --sl-color-green-high: #86e2ae;
--sl-color-red-low: #3d1822;    --sl-color-red: var(--ac-diff-remove); --sl-color-red-high: #f6a2b3;
--sl-color-orange-low: #33260e; --sl-color-orange: #e0a94a;           --sl-color-orange-high: #edcc92;
/* GOLD REMAP of blue — share user-messages use blue vars; this brands them without touching module files */
--sl-color-blue-low: rgba(255,175,0,0.12); --sl-color-blue: var(--ac-accent); --sl-color-blue-high: var(--ac-accent-bright);
color-scheme: dark;
```

Light, on `:root[data-theme="light"], [data-theme="light"] ::backdrop`:

```css
--sl-color-white: #2b2416;   --sl-color-black: #faf6ec;
--sl-color-gray-1: #3a3220;  --sl-color-gray-2: #5c523c;
--sl-color-gray-3: #857a60;  --sl-color-gray-4: #b3a889;
--sl-color-gray-5: #d9cca9;  --sl-color-gray-6: #efe7d0;  --sl-color-gray-7: #f6f0e0;
--sl-color-accent-low: #f3e2bd; --sl-color-accent: #c98a00; --sl-color-accent-high: #6e4900;
--sl-color-text: #3a3220;
--sl-color-text-accent: var(--ac-accent-bright);   /* = #8a5c00 in light */
--sl-color-text-invert: #faf6ec;
--sl-color-text-secondary: var(--ac-text-dim);
--sl-color-text-dimmed: var(--ac-muted);
--sl-color-bg: var(--ac-bg); --sl-color-bg-nav: #f6f0e0; --sl-color-bg-sidebar: var(--ac-bg);
--sl-color-bg-inline-code: var(--ac-elevated); --sl-color-bg-accent: var(--ac-accent);
--sl-color-bg-surface: var(--ac-panel); --sl-color-divider: var(--ac-border);
--sl-color-hairline-light: #e6dcc2; --sl-color-hairline: var(--ac-hairline); --sl-color-hairline-shade: #e6dcc2;
--sl-color-border: var(--ac-border);
--sl-color-green-low: #d9efe1;  --sl-color-green: var(--ac-diff-add); --sl-color-green-high: #14572f;
--sl-color-red-low: #f7dbe1;    --sl-color-red: var(--ac-diff-remove); --sl-color-red-high: #7e1a34;
--sl-color-orange-low: #f3e4c8; --sl-color-orange: #c77d1d;           --sl-color-orange-high: #7a4c0e;
--sl-color-blue-low: rgba(163,109,0,0.10); --sl-color-blue: var(--ac-accent); --sl-color-blue-high: #8a5c00;
color-scheme: light;
```

### 1.3 Legacy app vars `--color-*`

Only `custom.css` itself consumes these (verified by grep). Builder B keeps the **names** (they appear in many override rules) and re-values them from `--ac-*`:
`--color-background: var(--ac-bg)`, `--color-background-weak: var(--ac-panel)`, `--color-background-weak-hover: var(--ac-elevated)`, `--color-background-strong: var(--ac-text)`, `--color-background-strong-hover: var(--ac-accent-bright)`, `--color-background-interactive: var(--ac-accent-soft)`, `--color-background-interactive-weaker: var(--ac-accent-soft)`, `--color-text: var(--ac-text-dim)`, `--color-text-weak: var(--ac-muted)`, `--color-text-weaker: var(--ac-muted)`, `--color-text-strong: var(--ac-text)`, `--color-text-inverted: var(--ac-on-accent)`, `--color-border: var(--ac-border)`, `--color-border-weak: var(--ac-hairline)`, `--color-icon: var(--ac-muted)`.
These need no separate light block — they resolve through `--ac-*`.

### 1.4 Font decision (final)

**No new dependency; system stack.** Only `@fontsource/ibm-plex-mono` exists in `node_modules`; no `@fontsource/noto-kufi-arabic` is installed and builders must not run `bun install` mid-flight (offline risk + verifier owns the single install/build pass). `site/assets/site.css` (brand source) already specifies the system stack above and states "system stacks only (no web fonts)". Noto Kufi/Sans Arabic ship with most Linux/Android; Windows/macOS fall back to Segoe UI/Tahoma/Geeza Pro which render Arabic correctly. If the orchestrator later confirms network, adding `@fontsource/noto-kufi-arabic` + four `@import`s in custom.css is a one-line follow-up — out of scope now.

Arabic UI font wiring is B-6 (`--__sl-font` override for `[lang="ar"]`).

---

## 2. Builder A — brand-config

Owns: `config.mjs`, `astro.config.mjs`, `package.json`, `src/components/Head.astro`, `src/components/SiteTitle.astro`, `src/components/LanguageSelect.astro`, `src/assets/logo-*.svg`, `public/*`, `src/content/i18n/*`, `README.md`.

### A-1 `config.mjs` — full replacement

```js
const stage = process.env.SST_STAGE || "dev"

export default {
  url: process.env.ARABCODE_SITE_URL || "https://abdallhx2.github.io/arabcode",
  console: "https://github.com/abdallhx2/arabcode",
  email: "3bdallhx2@gmail.com",
  github: "https://github.com/abdallhx2/arabcode",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
```

Notes: `stage` kept for future SST use is optional — drop it if unused (it will be unused). **Delete `socialCard` and `discord` keys entirely**; grep confirms consumers: `socialCard` in `Head.astro` (A-4) and `pages/s/[id].astro` (Builder D, D-2 — coordinate: D's file must stop reading `config.socialCard`; this spec instructs D accordingly). `discord` consumer is `config.mjs`-internal only after A-2/B-7/C rewrite. `console` is imported by `src/content/docs/index.mdx` + `ar/index.mdx` (`export const console = config.console`) — keep the key to avoid breaking ~19 locale index files that copy this import (only root+ar get edited; **the other 17 locale `*/index.mdx` files also do `config.console` — the key MUST remain**).

### A-2 `astro.config.mjs` — precise edits (keep everything else byte-identical)

- `title: "OpenCode"` → `title: "arabcode"`.
- `favicon: "/favicon-v3.svg"` → `favicon: "/favicon.svg"`.
- Replace the whole `head: [...]` array with:
  ```js
  head: [
    { tag: "link", attrs: { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" } },
    { tag: "meta", attrs: { name: "theme-color", content: "#0c0a07" } },
  ],
  ```
  (drops the `-v3` ico/png/apple-touch links — those PNGs are opencode-branded; see A-6.)
- `expressiveCode: { themes: ["github-light", "github-dark"] }` → `expressiveCode: { themes: ["vitesse-light", "vitesse-dark"] }` (warm palette that sits well on gold; value fixed here so Builder D can match it in the share shiki calls).
- `social:` → `social: [{ icon: "github", label: "GitHub", href: config.github }]` (Discord entry deleted).
- `editLink.baseUrl` → `` `${config.github}/edit/main/packages/web/` `` (arabcode default branch is `main`).
- `locales`: **no changes** — `ar: { label: "العربية", lang: "ar", dir: "rtl" }` is already correct; Starlight emits `dir="rtl"` on `<html>` for it.
- Leave `base`, adapter, sidebar, components, plugins, configSchema untouched.

### A-3 `package.json`

- `"name": "@arabcode/web"` → `"name": "@arabcode/web"`.
- `"dev:remote"` script: keep as-is (VITE_API_URL still points at the live opencode share API — functional requirement, not branding).
- Do NOT touch the `"opencode": "workspace:*"` devDependency (type imports in Share/part/[id].astro resolve through it).

### A-4 `src/components/Head.astro`

Delete the dynamic social-card block. Precise change: remove the `ogImage`/`encodedTitle`/`truncatedDesc` computation (lines 21–42) and replace with:

```astro
const ogImage = `${config.url}/social-share.png`;
```

Keep the `isHome` title block, the `<Default>` render, and the `{!isShare && (...) }` og/twitter meta emission exactly as-is. (theme-color is added via astro.config head, A-2.)

### A-5 Logo + favicon assets

Overwrite `src/assets/logo-dark.svg` (shown on dark bg) and `src/assets/logo-light.svg` (shown on light bg) with a text wordmark. Keep the filenames — astro.config references them. Template (dark variant; light variant swaps `#ece7db`→`#2b2416` and `#ffaf00`→`#a36d00`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="42" viewBox="0 0 240 42">
  <rect x="2" y="5" width="32" height="32" rx="7" fill="none" stroke="#c98a00" stroke-width="2.5"/>
  <text x="18" y="29" text-anchor="middle" font-family="Noto Kufi Arabic, Noto Sans Arabic, Tahoma, sans-serif"
        font-size="19" font-weight="700" fill="#ffaf00">ع</text>
  <text x="44" y="30" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="24" font-weight="700">
    <tspan fill="#ece7db">arab</tspan><tspan fill="#ffaf00">code</tspan>
  </text>
</svg>
```

`logo-ornate-dark.svg` / `logo-ornate-light.svg`: unreferenced (verified) — delete or leave; deleting is cleaner.

`public/favicon.svg` — overwrite with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0c0a07"/>
  <rect x="64" y="64" width="384" height="384" rx="64" fill="none" stroke="#c98a00" stroke-width="20"/>
  <text x="256" y="360" text-anchor="middle" font-family="Noto Kufi Arabic, Tahoma, sans-serif"
        font-size="260" font-weight="700" fill="#ffaf00">ع</text>
</svg>
```

### A-6 `public/` cleanup

- Delete opencode-branded binaries no longer referenced after A-2: `favicon-v3.svg`, `favicon-v3.ico`, `favicon-96x96-v3.png`, `apple-touch-icon-v3.png`, `favicon-96x96.png`, `apple-touch-icon.png`, `favicon.ico`, `social-share-zen.png`.
- `social-share.png` (referenced by A-4): regenerate with ImageMagick (available at `/usr/bin/convert`):
  ```bash
  convert -size 1200x630 xc:'#0c0a07' -fill '#ffaf00' -stroke '#c98a00' \
    -font Noto-Kufi-Arabic-Bold -pointsize 96 -gravity center \
    -annotate +0-40 'arabcode' -fill '#b8b09c' -pointsize 40 \
    -annotate +0+80 'AI in your terminal — in Arabic' public/social-share.png
  ```
  If the font name isn't available (`convert -list font | grep -i kufi`), use `DejaVu-Sans-Bold` with the Latin-only text. If convert fails entirely, delete `social-share.png` AND remove the og:image block from Head.astro (A-4) — no opencode pixels may survive.
- `web-app-manifest-192x192.png` / `-512x512.png`: regenerate from the new favicon.svg via `convert -background none public/favicon.svg -resize 192x192 public/web-app-manifest-192x192.png` (and 512). If conversion mangles the SVG text, generate a plain gold-on-dark rounded square without the letter.
- `site.webmanifest`: `name`/`short_name` → `"arabcode"`, add `"theme_color": "#0c0a07", "background_color": "#0c0a07"` (keep icon entries pointing to the regenerated PNGs).
- `robots.txt`, `theme.json`: unchanged (no brand content).

### A-7 i18n UI strings — `src/content/i18n/en.json` and `ar.json`

**Hard rule: change VALUES only. Never add or rename keys** — `src/content.config.ts` builds a zod schema from `en.json`'s keys and requires every key in all 18 locale files; adding a key to en.json breaks the other 17 files at build time.

| Key | new `en.json` value | new `ar.json` value |
|---|---|---|
| `app.head.titleSuffix` | `AI in your terminal — in Arabic` | `الذكاء الاصطناعي في طرفيّتك، بالعربية` |
| `app.lander.hero.title` | `AI in your terminal — in Arabic.` | `الذكاء الاصطناعي في طرفيّتك، بالعربية.` |
| `app.lander.images.tui.caption` (+`.alt`) | `arabcode TUI — Arabic RTL session` | `واجهة arabcode في الطرفية — جلسة عربية RTL` |
| `app.lander.images.vscode.caption` (+`.alt`) | `arabcode in VS Code` | `arabcode في VS Code` |
| `app.lander.images.github.caption` (+`.alt`) | `arabcode in GitHub` | `arabcode في GitHub` |
| `share.meta_description` | `arabcode — the Arabic-first AI coding agent for the terminal.` | `arabcode — وكيل البرمجة بالذكاء الاصطناعي للطرفية، بالعربية.` |
| `share.opencode_version` | `arabcode version` | `إصدار arabcode` |
| `share.opencode_name` | `arabcode` | `arabcode` |

The other 16 locale files: replace the same 8 keys' **values** with the en.json values (mechanical; do NOT sed the whole file — key names contain the substring `opencode`). One safe command per concern, e.g. `grep -l '"share.opencode_name": "opencode"' src/content/i18n/*.json` then targeted `sed -i 's/"share.opencode_name": "opencode"/"share.opencode_name": "arabcode"/'` etc. If time-boxed, en+ar are mandatory, rest best-effort.

### A-8 `src/components/SiteTitle.astro`, `LanguageSelect.astro`, `middleware.ts`, `pages/[...slug].md.ts`

- `SiteTitle.astro`: stock Starlight copy, brand-neutral — **no changes**.
- `LanguageSelect.astro`: rename custom element `opencode-language-select` → `arabcode-language-select` in all three places (tag open/close, `closest("opencode-language-select")`, and the `<style>` selector). Cookie name `oc_locale` stays (middleware + this file must agree; renaming buys nothing user-visible).
- `middleware.ts`: no brand strings (verified) — untouched.
- `pages/[...slug].md.ts`: no brand strings (verified) — untouched. (It is not in A's ownership anyway.)

### A-9 `README.md` — replace the Starlight starter boilerplate

Short file: title `# @arabcode/web`, one paragraph (Astro 5 + Starlight docs site + Arabic-first lander + share viewer for arabcode), commands (`bun install` at repo root, `bun run dev` → http://localhost:4321/docs/, `bun run dev:remote` for live share data, `bun run build`), link to https://github.com/abdallhx2/arabcode. Note the gold token system lives in `src/styles/custom.css`.

---

## 3. Builder B — theme

Owns: `src/styles/custom.css` (full rewrite), `src/components/Header.astro`, `src/components/Footer.astro`.

### B-1 `custom.css` rewrite — structure

Replace the whole file with, in this order:
1. `:root, ::backdrop { ... }` — the `--ac-*` dark block (§1.1) then the `--sl-*` dark mapping (§1.2) then `--color-*` aliases (§1.3) then `--sl-nav-gap: 40px;`.
2. `:root[data-theme="light"], [data-theme="light"] ::backdrop { ... }` — light `--ac-*` + `--sl-*` values (§1.1/1.2).
3. Font + RTL rules (B-6).
4. Component overrides (B-2…B-5), ported from the current file's rules but re-tokened and RTL-safe.

Global rule conversions when porting the existing 405 lines:
- Every `@media (prefers-color-scheme: dark) { ... }` block: delete (dark is now the `:root` default; light overrides live in the `[data-theme="light"]` token block — the component rules below become theme-agnostic because they reference vars).
- Every physical property → logical: the only offender is `a[aria-current="page"] { border-left: 2px solid ... }` → `border-inline-start: 2px solid var(--ac-accent);`. Keep `.sidebar-pane { border-inline-end }` / `.right-sidebar { border-inline-start }` (already logical).
- Delete the dead hash-scoped rule `.header:where(.astro-tcroauqe) { ... }` (breaks the moment Header.astro is edited); replace with `body > .page > header { border-bottom: 1px solid var(--ac-hairline) !important; }`.
- Keep `body { font-size: 14px !important; color: var(--color-text) !important; }` but drop the nested media query.

### B-2 Docs chrome styling (gold identity)

Concrete rules to include (beyond straight ports):

```css
/* header */
body > .page > header, :root[data-has-sidebar] body > .page > header {
  background: color-mix(in srgb, var(--ac-bg) 92%, transparent) !important;
  backdrop-filter: blur(10px);
  padding: 24px !important;
}
/* search button — gold outline pill */
body > .page > header button[data-open-modal] {
  gap: 12px !important; background: var(--ac-panel);
  border: 1px solid var(--ac-border) !important;
  padding: 6px 12px !important; border-radius: var(--ac-radius-sm);
}
body > .page > header button[data-open-modal]:hover { border-color: var(--ac-accent-deep) !important; background: var(--ac-accent-soft); }
/* sidebar current page */
nav.sidebar a[aria-current="page"], nav.sidebar a[aria-current="page"]:hover {
  color: var(--ac-accent-bright) !important;
  background: var(--ac-accent-soft) !important;
  border-inline-start: 2px solid var(--ac-accent);
}
/* markdown links */
.sl-markdown-content a { color: var(--ac-accent-bright) !important; text-underline-offset: 3px; }
/* inline code */
.sl-markdown-content code:not(pre code) {
  background: var(--ac-elevated); border: 1px solid var(--ac-hairline);
  border-radius: 5px; color: var(--ac-accent-bright);
}
/* asides */
.starlight-aside { border-inline-start: 3px solid var(--ac-accent-deep); background: var(--ac-panel); border-radius: var(--ac-radius-sm); }
/* headings stay --color-text-strong ports from the old file */
/* theme select (see B-4) */
starlight-theme-select { display: contents; }
starlight-theme-select select { background: var(--ac-panel); color: var(--ac-text-dim); border: 1px solid var(--ac-border); border-radius: var(--ac-radius-sm); }
```

Port the remaining existing rules (sidebar paddings, right-sidebar, content-panel padding, social-icons sizing, kbd tweaks, ul/ol list-style reset, expressive-code margins) unchanged except swapping `--color-*`/hsl literals for the same `--color-*` names (now gold-valued) — they keep working because §1.3 re-values them.

### B-3 Expressive-code / shiki

- Keep `.expressive-code figure { background: var(--ac-code-bg) !important; }` (replaces `--color-background-weak`), `border: 1px solid var(--ac-border)` on `.expressive-code .frame`, radius `var(--ac-radius-sm)`.
- Replace the trailing `@media (prefers-color-scheme: dark) { .shiki ... }` block with:
  ```css
  [data-theme="dark"] .shiki, [data-theme="dark"] .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
    font-style: var(--shiki-dark-font-style) !important;
    font-weight: var(--shiki-dark-font-weight) !important;
    text-decoration: var(--shiki-dark-text-decoration) !important;
  }
  ```
  (Share/marked shiki output embeds dual-theme vars; this keys them off the resolved attribute.)

### B-4 `Header.astro` — redesign

Rewrite to a single unified header (drop the `sharePath ? custom : <Default>` split and the `toolbeam-docs-theme/overrides/Header.astro` import). Structure:

```astro
---
import config from "../../config.mjs"
import astroConfig from "virtual:starlight/user-config"
import { getRelativeLocaleUrl } from "astro:i18n"
import { Icon } from "@astrojs/starlight/components"
import Search from "virtual:starlight/components/Search"
import ThemeSelect from "@astrojs/starlight/components/ThemeSelect.astro"
import SiteTitle from "@astrojs/starlight/components/SiteTitle.astro"
---
<div class="header sl-flex">
  <div class="title-wrapper sl-flex"><SiteTitle {...Astro.locals.starlightRoute} /></div>
  <div class="middle-group sl-flex">{headerLinks nav — keep existing href()/t() logic}</div>
  <div class="sl-hidden md:sl-flex right-group">
    <Search {...Astro.locals.starlightRoute} />
    <div class="sl-flex social-icons">{github icon link from astroConfig.social}</div>
    <ThemeSelect {...Astro.locals.starlightRoute} />
  </div>
</div>
```

- Keep the existing grid CSS block (it is RTL-safe: uses logical `--sl-content-inline-start`), keep `.middle-group` behavior.
- Nav links: `الرئيسية` resolves via existing `t("app.header.home")` mechanism — unchanged keys.
- GitHub link comes from `astroConfig.social` (already arabcode after A-2); style social svg `color: var(--ac-muted)`, hover `var(--ac-accent-bright)`.
- Note: rendering `<Search>` on share pages too is a small behavior change (upstream share header had no search) — acceptable and simpler; pagefind search just won't index share pages.
- ThemeSelect renders the sun/moon/auto select; toolbeam's `display:none` is defeated by the `starlight-theme-select { display: contents }` rule in B-2.

### B-5 `Footer.astro` — redesign

Keep the `template === "doc"` guard, edit/issue links (they derive from config.social + editLink — already arabcode), keep `<LanguageSelect />`. Changes:
- **Delete the Discord block** (`discordLink` const + the `{discord && ...}` render + the `config.social?.find(... "discord")` lookup).
- Replace the copyright block:
  ```astro
  <p>© {new Date().getFullYear()} arabcode — <a href="https://github.com/abdallhx2/arabcode">abdallhx2/arabcode</a></p>
  <p class="lineage">مبني على <a href="https://opencode.ai">opencode</a> مفتوح المصدر (رخصة MIT)</p>
  ```
  Style `.lineage { color: var(--sl-color-text-dimmed); font-size: var(--sl-text-xs); }`. The Arabic sentence needs no explicit dir (it's inline flow), but add `dir="auto"` on the `<p>` for safety in ltr locales.
- CSS: `text-align: right` in the `@media (min-width: 30rem)` block → `text-align: end`.

### B-6 Arabic font + RTL wiring (in custom.css)

```css
/* Arabic locale: humanist Arabic UI stack instead of IBM Plex Mono */
:root[lang="ar"] { --__sl-font: var(--ac-font-ui); }
:root[lang="ar"] body { letter-spacing: 0; }
:root[lang="ar"] .sl-markdown-content { line-height: 1.9; }
/* code stays LTR everywhere, all locales */
code, pre, kbd, samp { direction: ltr; unicode-bidi: isolate; }
[dir="rtl"] .expressive-code { direction: ltr; }
```

(`--__sl-font` is toolbeam's resolved font var — overriding it on `:root[lang="ar"]` beats theme.css by specificity and load order. Starlight puts `lang`/`dir` on `<html>` per locale; `ar` is declared `dir: rtl` in astro.config — no config change needed.)

### B-7 Do-not-touch list for B

`Head.astro`, `SiteTitle.astro`, `LanguageSelect.astro`, logo SVGs (Builder A); `Lander.astro`, `Hero.astro` (Builder C); everything under `share/`, `share.module.css`, `pages/s/` (Builder D); `astro.config.mjs` (A owns the expressiveCode theme values — already specced).

---

## 4. Builder C — lander

Owns: `src/components/Lander.astro` (full rewrite), `src/components/Hero.astro`, `src/assets/lander/*`, plus (assigned here, unowned elsewhere) the frontmatter of `src/content/docs/index.mdx` and `src/content/docs/ar/index.mdx`.

### C-1 Mounting (critical — the lander is currently unreachable)

1. `Hero.astro`: change the condition to also cover the Arabic index:
   ```astro
   { ["", "ar"].includes(slug) ? <Lander {...Astro.props} /> : <Default {...Astro.props}><slot /></Default> }
   ```
2. `src/content/docs/index.mdx` frontmatter becomes:
   ```yaml
   ---
   title: arabcode
   description: الذكاء الاصطناعي في طرفيّتك، بالعربية — arabcode
   template: splash
   hero:
     title: arabcode
   ---
   ```
   Keep the body below the frontmatter but rebrand it: `OpenCode` → `arabcode`, install script line → `curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash`, npm tab → `npm i -g arabcode` (body renders under the lander as a quick-start; `template: splash` removes the sidebar; Starlight's `data-has-hero` + the lander's global CSS hide the doc header so the lander owns the viewport). Remove the screenshot image line (opencode-branded PNG).
3. `src/content/docs/ar/index.mdx`: same frontmatter treatment (`title: arabcode`, `template: splash`, `hero: { title: arabcode }`) + same body rebrand (Arabic text already there; swap OpenCode→arabcode, install URLs as above). Rationale: middleware 302s Arabic browsers from `/docs/` to `/docs/ar/` — both entries must be the lander.
4. Keep the existing `<style is:global> :root[data-has-hero] { header.header { display:none } ... }</style>` block from the old Lander verbatim — it's the header-hiding mechanism.

### C-2 `Lander.astro` — full rewrite, new structure

Root element: `<div class="lander" dir="rtl" lang="ar">`. Static Astro only — no new deps, no Solid. Copy tone mirrors `site/index.html`. All colors/typography via `--ac-*` tokens only (§1.1); the page must look right in dark AND light (tokens flip automatically), except `.term` which is pinned dark. Reuse the old file's copy-button `<script>` pattern verbatim (`button.command` + `data-command` + `.success` class); reuse `src/assets/lander/copy.svg` + `check.svg`. Delete the three opencode screenshot PNGs from `src/assets/lander/` (`screenshot-splash.png`, `screenshot-vscode.png`, `screenshot-github.png`, `screenshot.png`) and all `<Image>` usage — the new lander uses a CSS terminal mockup instead (no binary assets).

Layout wrapper: `max-width: 1120px; margin-inline: auto; padding-inline: 20px;` per section; sections separated by `border-top: 1px solid var(--ac-hairline)`. Page background: `background: var(--ac-bg) radial-gradient(circle at 1px 1px, var(--ac-grid) 1px, transparent 0); background-size: 26px 26px;` on `.lander`.

Sections, in order:

**(1) `.topbar`** — the doc header is hidden on hero pages, so the lander carries its own minimal bar: right side (RTL start) brand `<a>`: glyph box `ع` (26px, `border:1px solid var(--ac-accent-deep); background: var(--ac-accent-soft); color: var(--ac-accent); border-radius:6px`) + mono wordmark `arab<span class="dot">code</span>` (`.dot { color: var(--ac-accent) }`); left side links: `الوثائق` → `/docs/ar/config` (plain `href`, base-prefixed automatically? NO — hardcode `/docs/ar/config`; `getRelativeLocaleUrl` returns root-locale paths on the root page, so for the two docs links use literals `/docs/ar/` is wrong for root… **use `getRelativeLocaleUrl(locale, "config")` exactly like the old lander did for docs hrefs**) and `GitHub` → `https://github.com/abdallhx2/arabcode` styled as a bordered pill. Sticky not required.

**(2) `.hero`** — padding-block `clamp(2.6rem, 7vw, 5rem)`; a `::before` radial gold wash: `radial-gradient(60% 55% at 82% 0%, var(--ac-accent-soft), transparent 70%)`.
- eyebrow (mono, uppercase, `--ac-accent-bright`, letter-spacing .08em): `الطرفية بالعربية الكاملة · RTL + تشكيل`
- `<h1>` (font: `--ac-font-ui`, `clamp(1.9rem, 5vw, 3rem)`, weight 800, max-width 22ch): `<span class="code-name">arabcode</span> — الذكاء الاصطناعي في طرفيّتك، بالعربية.` with `.code-name { font-family: var(--ac-font-mono); color: var(--ac-accent) }`.
- tagline (`--ac-text-dim`, 1.15rem, max-width 60ch): `أول أداة ذكاء اصطناعي للطرفية بعرضٍ عربي صحيح — اتجاه RTL وتشكيل وحروف متصلة. مبنية على محرّك opencode مفتوح المصدر.`
- `.hero-cta` row (flex, gap .8rem, margin-top 1.8rem): primary button `ابدأ من الوثائق` → `getRelativeLocaleUrl('ar', "")` (`background: var(--ac-accent); color: var(--ac-on-accent); border:1px solid var(--ac-accent-deep); border-radius: var(--ac-radius-sm); padding:.62rem 1.15rem; font-weight:600`), ghost button `GitHub ↗` (`border:1px solid var(--ac-border); color: var(--ac-text)`; hover `border-color: var(--ac-accent-deep); background: var(--ac-accent-soft)`).
- Install one-liner directly under the CTAs — `.cmd` box, **`dir="ltr"`**: `background: var(--ac-code-bg); border:1px solid var(--ac-border); border-radius: var(--ac-radius-sm); font-family: var(--ac-font-mono); padding:.55rem .9rem; overflow-x:auto` containing `<button class="command" data-command="curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash">` with `<code><span class="tok-cmd">curl -fsSL </span><span class="tok-pkg">https://raw.githubusercontent.com/abdallhx2/arabcode/main/install</span> | bash</code>` (`.tok-cmd { color: var(--ac-text-dim) } .tok-pkg { color: var(--ac-accent-bright); font-weight:600 }`) + copy icon span.

**(3) `.terminal-demo`** — heading `هكذا تبدو الجلسة بالعربية` + lead `نصّ عربي متصل الحروف واتجاه صحيح، ومقاطع الكود تبقى LTR في مكانها.`; then the mockup (adapt markup/copy from `site/index.html` lines 127–142):
```html
<div class="term" dir="rtl">
  <div class="term-bar"><span class="tb-dot"/><span class="tb-dot"/><span class="tb-dot"/>
    <span class="tb-title" dir="ltr">arabcode — ~/my-app</span></div>
  <div class="term-body">
    <p class="ln ltr"><span class="comment"># افتح مشروعك وشغّل الأداة</span></p>
    <p class="ln ltr"><span class="prompt">~/my-app $</span> arabcode</p>
    <p class="ln"><span class="who">أنت ›</span> اشرح لي كيف تُدار المصادقة في <span class="ltr">@src/auth.ts</span></p>
    <p class="ln"><span class="who">arabcode ›</span> <span class="ar-reply">تُدار المصادقة عبر وسيط يتحقق من التوكن في كل طلب، ثم يمرّر هوية المستخدم إلى بقية الدوال…</span></p>
    <p class="ln"><span class="comment">— اضغط Tab للتبديل بين وضعَي build و plan —</span></p>
  </div>
</div>
```
`.term` styles pinned dark in BOTH themes (literals, not vars): `background:#0a0806; border:1px solid #2a2418; border-radius:10px; box-shadow:0 20px 50px -30px rgba(0,0,0,.9); font-family: var(--ac-font-mono)`. `.term-bar { background:#1b1710; border-bottom:1px solid #2a2418 } .tb-dot { width:11px;height:11px;border-radius:50%;background:#3a3226 } .term-body { padding:1rem 1.1rem; font-size:.92rem; line-height:1.9; color:#ece7db } .prompt{color:#ffaf00} .who{color:#ffc23d;font-weight:600} .comment{color:#7d766a} .ln.ltr,.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}`.

**(4) `.install`** — heading `التثبيت` + 3-column grid (1fr×3, collapses to 1 col ≤ 620px, gap 1rem) of cards (`background: var(--ac-panel); border:1px solid var(--ac-border); border-radius: var(--ac-radius); padding:1.1rem`), each: mono label h3 (`npm`, `bun`, `سكربت التثبيت`) + `.cmd`-style copy button (dir=ltr):
- `npm i -g arabcode`
- `bun i -g arabcode`
- `curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash`
(no brew/paru/mise — arabcode isn't published there; this is a deliberate structural break from the upstream lander.)

**(5) `.features`** — eyebrow `لماذا arabcode`, heading `قوّة أداة برمجة حديثة، بعربية تُقرأ كما ينبغي`, 3×2 card grid (`grid-template-columns: repeat(3,1fr)`, 2 cols ≤ 860px, 1 col ≤ 620px). Cards use `--ac-panel/--ac-border`; title row has a 34px gold icon chip (`color: var(--ac-accent); background: var(--ac-accent-soft); border:1px solid var(--ac-accent-line); border-radius:8px` — inline SVGs, reuse/trace simple stroke icons, no new assets). The six cards:
1. **عرض RTL صحيح** — اتجاه من اليمين لليسار وحروف عربية متصلة داخل أي طرفية.
2. **إدخال عربي** — اكتب بالعربية مباشرة في الجلسة مع محاذاة منطقية للمؤشر.
3. **تحديد ونسخ منطقي** — تحديد النص يتبع ترتيب القراءة لا ترتيب البايتات.
4. **أي طرفية** — يعمل في WezTerm وGhostty وKitty وAlacritty وغيرها.
5. **جلسات ومشاركة** — جلسات متوازية وروابط مشاركة عبر `/share`.
6. **مبني على opencode** — محرّك مفتوح المصدر برخصة MIT؛ طبقة العربية هي إسهام arabcode. (card gets `border-color: var(--ac-accent-deep)` highlight)

**(6) `.foot`** — final CTA band + lineage: centered `جاهز؟` h2, primary button `اقرأ الوثائق` → `getRelativeLocaleUrl('ar', "")`, ghost `GitHub`; below, `.lineage` paragraph (`color: var(--ac-muted); border-top:1px solid var(--ac-hairline); font-size:.9rem`): `arabcode مبني على opencode مفتوح المصدر (MIT). الميزات الموروثة من المحرّك؛ إسهام arabcode هو طبقة العربية: الاتجاه والتشكيل والإدخال.` + `© 2026 arabcode`.

### C-3 i18n rule for C

Do NOT add i18n keys (schema landmine, §A-7). The lander is Arabic-first by design: hardcode the Arabic copy above directly in `Lander.astro`. The only `t()` call worth keeping is none — drop the old `t('app.lander.*')` usage. (The keys stay in i18n files for schema stability; A updates their values.)

### C-4 RTL/LTR discipline

- Root `div.lander[dir="rtl"][lang="ar"]` — all layout inside must use logical properties (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-inline-start`, `text-align: start`). No `left/right` properties anywhere in the new CSS.
- Every command string, URL, file path, and the terminal title is wrapped in `dir="ltr"` (or the `.ltr` class with `unicode-bidi: isolate`).
- The copy `<script>` stays identical to the old lander's (lines 709–721 of the old file).

---

## 5. Builder D — share

Owns: `src/components/share/**`, `src/components/share.module.css`, `src/components/Share.tsx` (style-level), `src/pages/s/[id].astro`. Additive-only exception: may append one icon export to `src/components/icons/custom.tsx`.

### D-1 Re-token inventory — mostly free

Verified: **no hardcoded colors exist** in `share.module.css`, `part.module.css`, `content-{bash,code,diff,error,markdown,text}.module.css`, `copy-button.module.css`. Every color rides on `--sl-color-*` (top consumers: `divider`, `text-secondary`, `text-dimmed`, `bg-surface`, `text`, `green-*`, `red-*`, `blue-*`, `white`, `hairline`, `bg`, `border`, `orange-*`, `text-invert`). Builder B's §1.2 mapping re-themes all of it, including the gold user-message bubbles via the blue→gold remap. **Do not rename any var in the modules.** Only touch what's listed below.

### D-2 `src/pages/s/[id].astro`

- `config.socialCard` is being deleted (A-1). Replace lines 95–109 (`encodedTitle`, `modelsArray`, `modelParam`, `ogImage`) with:
  ```ts
  const ogImage = `${config.url}/social-share.png`
  ```
  (keep the `models` Set + `version` — still rendered in the header stats). Delete the now-unused `Base64` import.
- Everything else (StarlightPage frontmatter, messages map, global style block) unchanged. `VITE_API_URL` data flow untouched.

### D-3 Brand mark + shiki themes in Solid components

- `src/components/icons/custom.tsx`: append (do not modify existing exports):
  ```tsx
  export function IconArabcode(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
    return (
      <svg {...props} viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="58" height="58" rx="12" stroke="currentColor" stroke-width="5" fill="none" />
        <text x="35" y="49" text-anchor="middle" font-family="Noto Kufi Arabic, Tahoma, sans-serif"
          font-size="34" font-weight="700" fill="currentColor">ع</text>
      </svg>
    )
  }
  ```
- `Share.tsx` line 5: import `IconArabcode` instead of `IconOpencode`; line 308: `<IconOpencode .../>` → `<IconArabcode width={16} height={16} />`. No other Share.tsx changes (labels come from i18n values fixed in A-7).
- `share/content-code.tsx` (~line 18) and `share/content-markdown.tsx` (~line 22): `themes: { light: "github-light", dark: "github-dark" }` → `themes: { light: "vitesse-light", dark: "vitesse-dark" }` in both files (matches A-2's expressiveCode pair; both are bundled shiki themes — no dep change).

### D-4 LTR guarantee for code/terminal/diff content

Share pages render under the root (en, ltr) locale, but content must stay LTR even if Arabic text or a future ar share chrome flips direction. Append to the respective modules:

```css
/* share.module.css — inside .message-terminal [data-section="content"] */
pre { direction: ltr; unicode-bidi: isolate; text-align: left; }
/* share.module.css — .message-text pre gets bidi-aware plaintext (user prose may be Arabic) */
.message-text pre { unicode-bidi: plaintext; }
```
```css
/* content-code.module.css, content-bash.module.css, content-diff.module.css — on the root class */
direction: ltr; unicode-bidi: isolate;
```

(`content-markdown` stays direction-neutral — prose.)

### D-5 Share chrome

Header/footer of `/docs/s/[id]` come from `Header.astro` (Builder B) + logo (Builder A) — nothing for D. The gold identity lands through tokens. Optional polish if trivial: in `share.module.css` `[data-component="header-title"]`, add `font-family: var(--ac-font-ui);` so Arabic session titles render with the Arabic stack.

---

## 6. Verification plan (Verifier)

```bash
cd /home/abotrf/Desktop/opencode/packages/web
bun run build          # astro build — must exit 0
```
- No env needed for build: `config.mjs` no longer reads SST at all (or defaults harmlessly); the cloudflare adapter builds a worker bundle locally without wrangler config; the `configSchema` hook spawns `../opencode/script/schema.ts` on build:done via `spawnSync` with unchecked result — even if it fails it cannot fail the build.
- Type sanity (optional, non-blocking): `bunx astro check` — pre-existing errors are not regressions; only fail on errors in files this team edited.

Dev server + screenshots (Playwright or claude-in-chrome), viewport 1440×900 and 390×844:

```bash
bun run dev            # http://localhost:4321/docs/
```
1. `http://localhost:4321/docs/` — the Arabic lander (dark). Assert: RTL layout, gold hero, terminal mockup, no "opencode"/"OpenCode" visible (except the deliberate "مبني على opencode" lineage lines).
2. Same URL after clicking the theme toggle → light lander (warm paper).
   ⚠️ The middleware may 302 `/docs/` to a locale if the browser sends Arabic `Accept-Language` or an `oc_locale` cookie — use a clean profile or check `/docs/ar/` explicitly.
3. `http://localhost:4321/docs/ar/` — Arabic lander via ar index (RTL html, `dir="rtl"` on `<html>`).
4. `http://localhost:4321/docs/config/` — docs page dark + light: gold sidebar highlight, gold links, vitesse code blocks, arabcode logo in header, footer without Discord/Anomaly.
5. `http://localhost:4321/docs/ar/config/` — RTL docs page: sidebar on the right, current-page gold bar on the correct (inline-start) side, Arabic UI font.
6. Share page: `VITE_API_URL=https://api.opencode.ai bun run dev` (the `dev:remote` script) then `http://localhost:4321/docs/s/<id>` with a real share id if one is available; otherwise verify the route returns a clean 404 (`Not found`) and skip the visual — note it in the report.
7. Grep gate: `grep -rn -iE 'opencode\.ai|anomalyco|anoma\.ly|social-cards\.sst\.dev|discord' src/ config.mjs astro.config.mjs public/site.webmanifest --include='*.astro' --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.css' --include='*.json'` → only acceptable hits: lineage links to `https://opencode.ai` in Footer/Lander copy, `dev:remote`'s `api.opencode.ai`, type imports from the `opencode` workspace package, and `src/content/docs/**` prose (out of scope).

Screenshots go to `/tmp/claude-1000/-home-abotrf-Desktop-opencode/7156dea1-ea9f-4993-8fda-f28b49a1088a/scratchpad/screenshots/`.

---

## 7. Risks / gotchas

1. **i18n schema is strict** (`src/content.config.ts` requires every `en.json` key in all 18 locale files). Never add/rename keys; values only. This is why the lander hardcodes Arabic copy.
2. **`config.console` is imported by all 19 `*/index.mdx` files** — the `console` key must survive in `config.mjs` even though only 2 index files get edited.
3. **Middleware redirect**: `/docs/` 302s to `/docs/<locale>/` for non-English browsers — the lander must exist on both root and `ar` indexes (C-1), and the verifier must not mistake the redirect for a broken lander.
4. **`data-has-hero` hides the site header** (global CSS in Lander). The lander's own topbar (C-2 §1) is therefore mandatory, and the `<style is:global>` block must be preserved in the rewrite.
5. **toolbeam-docs-theme hides `starlight-theme-select` and never renders `<ThemeSelect>`** — light mode is unreachable unless B-4 (ThemeSelect in Header) AND the `display: contents` override both land.
6. **`custom.css` currently themes via `prefers-color-scheme`** — any rule ported without converting to `[data-theme]` will desync from the new toggle.
7. **Load order dependency**: custom.css must remain the LAST entry in Starlight's customCss (it is, via the toolbeam plugin appending user css). Don't move `customCss` ordering in astro.config.
8. **Blue→gold remap** (§1.2) recolors anything that referenced Starlight blue (share user bubbles — intended; rare docs elements — acceptable). If a blue-dependent element looks wrong, fix locally, don't un-remap.
9. **`opencode` workspace devDependency** provides type-only imports (`opencode/session/*`) in `Share.tsx`, `part.tsx`, `[id].astro`. Keep the dep name; the workspace package is still named `opencode`.
10. **Old dead selector** `.header:where(.astro-tcroauqe)` is hash-coupled to the current Header.astro markup; B deletes it (B-1). Any builder editing an .astro file invalidates such hashes — never rely on `astro-*` scoped classes in custom.css.
11. **ImageMagick SVG-with-`<text>` rasterization is unreliable** (font resolution). A-6 has explicit fallbacks (Latin-only text / plain mark / drop og:image). Do not block the build on asset generation.
12. **`sst-env.d.ts`** references the repo-root `sst-env.d.ts` (exists) — leave both alone; not part of the build output.
13. **Share screenshot needs a live API** (`VITE_API_URL`) and a valid share id; treat as best-effort (verification step 6).
14. **`expressive-code` theme names**: `vitesse-light`/`vitesse-dark` are bundled in shiki/expressive-code 3.x — if the build errors on the name (unlikely), fall back to `min-light`/`min-dark` in BOTH astro.config (A) and the two share tsx files (D) — they must always match.
15. **Do not run `bun install`** unless a builder changed dependencies (none should — this design adds zero deps). The verifier runs the existing lockfile state.
16. **Uncommitted TUI work exists in the repo** — nobody stages or commits anything; the orchestrator commits named files at the end.
