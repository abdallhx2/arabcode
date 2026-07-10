# Goal: rebrand packages/web (opencode.ai site) into the arabcode web — full arabcode identity, redesigned Arabic-first UI/UX

## What success looks like
- `packages/web` builds (`bun run build` / `astro build`) and runs (`astro dev`) with zero opencode branding visible in the UI chrome: title, logos, favicons, social meta, header, footer, lander, share pages all say **arabcode**.
- The lander (`/`) is a **new design, not a reskin**: Arabic-first, `lang="ar" dir="rtl"`, gold-on-dark arabcode identity (tokens from `site/assets/site.css`: bg `#0c0a07`, accent `#ffaf00`, Noto Kufi/Sans Arabic type), with arabcode install commands (`npm i -g arabcode`, curl installer from github.com/abdallhx2/arabcode) and layout/sections visibly different from the upstream opencode lander.
- The Starlight docs theme is re-tokened to the arabcode palette (dark **and** a derived light variant), Arabic (`ar`) locale renders correctly RTL, and the docs UI strings (sidebar, search, header links) are rebranded.
- The share viewer (`/s/[id]`) keeps its function but wears the arabcode theme (colors, fonts, header/footer); terminal/code content stays LTR.
- `config.mjs` / `astro.config.mjs` point at arabcode URLs (github.com/abdallhx2/arabcode) instead of opencode.ai/anomalyco; package renamed to `@arabcode/web` style naming consistent with `packages/opencode/brand.ts`.
- Visual verification exists: dev server screenshots (lander RTL, docs ar + en, share page) confirming the identity, plus a passing production build.

## What is OUT of scope
- Rewriting the ~50 docs pages' prose × 19 locales to say `arabcode` in every command sample — only `index.mdx` (root + ar) and brand-bearing chrome/i18n strings are updated; full content rebrand is a separate goal.
- Deploying (SST/Cloudflare/GitHub Pages) or DNS/domain work — build must pass, deployment is later.
- Touching the TUI, core, or `site/` static pages (site/ is reference material only).
- npm publishing.
- The user's uncommitted TUI work — never `git add -A`; commit named files only.

## Known context
- Repo: `/home/abotrf/Desktop/opencode`, branch `arabcode` (remote `arabcode` = github.com/abdallhx2/arabcode, default `main`).
- Stack: Astro 5 + Starlight 0.34 + Solid, `toolbeam-docs-theme`, styles in `src/styles/custom.css` (405 lines), lander `src/components/Lander.astro` (721 lines), share components under `src/components/share/`.
- Existing brand source of truth: `packages/opencode/brand.ts` (PUBLISH_NAME=arabcode, GH_OWNER=abdallhx2) and the gold design system in `site/assets/site.css`.
- `ar` docs locale already exists in `src/content/docs/ar/` and `src/content/i18n/`.
- Constraints: keep all existing locales functional; don't break the share viewer's data flow (`VITE_API_URL`); Bun workspace — run installs/builds with bun.

## Open questions (resolved with best guesses)
- Make `ar` the root/default docs locale? *Guess: no structural swap — Arabic-first lander + prominent ar docs; swapping Starlight root locale moves every URL and is risky. Architect may propose a redirect instead.*
- Light theme? *Guess: yes, derive a light gold variant so Starlight's theme toggle keeps working.*

## Why this matters
arabcode's whole identity is "الذكاء الاصطناعي في طرفيتك، بالعربية" — the web must look Arabic-first and unmistakably arabcode, not a recolored opencode.

## Outcome (2026-07-10) — COMPLETE
All success criteria met. Executed by a 6-agent team (architect → 4 parallel builders → verification): design spec in `2026-07-10-arabcode-web-design.md`, ~60 files changed in packages/web, `astro build` green, visually verified via Playwright (lander ar dark/light/mobile, docs en/ar RTL dark/light). Resolved open questions: no root-locale swap (lander mounts on both root and ar indexes; middleware 302s Arabic browsers to /docs/ar/); light theme shipped (warm-paper gold, AA). Known leftovers: docs prose still says opencode (out of scope), share page 500s in dev without VITE_API_URL (pre-existing upstream behavior), `app.footer.discordLink` i18n values dormant (schema forbids key removal, Footer no longer renders it).
