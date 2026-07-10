# Team Blueprint: arabcode web rebrand (packages/web)

Goal artifact: `docs/superpowers/specs/2026-07-10-arabcode-web-goal.md`

## Shape: hybrid — chain [Architect] → flat parallel [4 Builders] → [Verifier] → orchestrator synthesis/fix loop
## Effort tier: large-small (6 agents total)
## Total budget estimate: ~6 invocations, ~500–700k tokens

## Roles
- **Architect** (×1) — deep-read packages/web + site/assets/site.css + brand.ts; write the full engineering design spec: token system (dark+light), exact CSS custom-property names, file-by-file work breakdown with contracts so builders don't collide.
- **Builder: brand-config** (×1) — config.mjs, astro.config.mjs (title/social/sidebar brand strings), package.json name, Head.astro meta/OG, SiteTitle, logo/favicon assets, i18n UI strings (root + ar), README.
- **Builder: theme** (×1) — `src/styles/custom.css` full re-token to arabcode gold (dark + light), Starlight overrides, Arabic webfont wiring, Header.astro + Footer.astro redesign with RTL awareness.
- **Builder: lander** (×1) — brand-new `Lander.astro` + `Hero.astro`: Arabic-first RTL gold landing, new sections/layout distinct from upstream.
- **Builder: share** (×1) — re-theme `src/components/share/*.module.css` + `share.module.css` + `pages/s/[id].astro` chrome to arabcode tokens; keep terminal/code content LTR.
- **Verifier** (×1) — `astro build` + typecheck, boot dev server, Playwright screenshots (lander, docs root, docs ar RTL, share page) saved to scratchpad for orchestrator review.

## Sequence / fan-out
Architect (sync) → spec at `docs/superpowers/specs/2026-07-10-arabcode-web-design.md`
→ 4 builders in parallel (disjoint file sets; theme builder owns the token definitions, others consume token *names* fixed by the spec)
→ Verifier → orchestrator reviews screenshots, dispatches fixes if needed → commit named files only.

## File-ownership boundaries (collision prevention)
| Builder | Owns |
|---|---|
| brand-config | config.mjs, astro.config.mjs, package.json, Head.astro, SiteTitle.astro, LanguageSelect.astro, src/assets/* (logos), public/*, src/content/i18n/*, README.md |
| theme | src/styles/custom.css, Header.astro, Footer.astro |
| lander | Lander.astro, Hero.astro, src/assets/lander/* |
| share | src/components/share/**, share.module.css, Share.tsx (style-level only), src/pages/s/[id].astro |

Token contract: all builders use ONLY the custom-property names published in the spec's "Token contract" section; only the theme builder defines their values.

## Handoff & synthesis
- Agent reports → `/tmp/claude-1000/-home-abotrf-Desktop-opencode/7156dea1-ea9f-4993-8fda-f28b49a1088a/scratchpad/agents/<role>.md`; spec committed in docs/superpowers/specs/.
- Orchestrator (main session) synthesizes, reviews screenshots visually, runs fix round if needed.
- Failure handling: builder failure → re-dispatch that role with the error appended; verifier build failure → orchestrator triages and dispatches targeted fix.
- Forbidden for everyone: `git add -A` / committing (user has uncommitted TUI work); touching packages/tui, packages/opencode, site/; deploying.
