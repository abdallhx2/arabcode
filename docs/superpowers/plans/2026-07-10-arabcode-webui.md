# arabcode Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the locally-built `packages/app` web UI at `http://127.0.0.1:4096` with full arabcode identity: gold theme (default), Arabic default locale, full RTL layout, arabcode logos/favicons, and zero visible "OpenCode" product mentions.

**Architecture:** Three layers on top of the existing app — (1) server-side: a local-dist fallback in `packages/opencode/src/server/shared/ui.ts` between the embedded UI and the upstream proxy; (2) identity: theme JSON + logo components + static assets + i18n value sweep; (3) RTL: `dir` driven by locale in `language.tsx`, with deliberate LTR islands for code/terminal/diff. No rewrite of session/layout engines.

**Tech Stack:** SolidJS, Tailwind v4 (logical utilities `ps-/pe-/ms-/me-/start-/end-`), Effect (server), Bun, theme JSON system in `packages/ui/src/theme/`.

**Spec:** `docs/superpowers/specs/2026-07-10-arabcode-webui-design.md`

## Global Constraints

- Branch `arabcode`. The worktree has extensive unrelated uncommitted changes — **NEVER `git add -A` / `git add .`**; always add named files only.
- i18n: `packages/app/src/i18n/parity.test.ts` enforces identical keys across locales — **change values only, never add/remove keys**.
- Keep unchanged: package names `@arabcode/*`, localStorage keys (`opencode-theme-id`, `opencode.global.dat:*`, `opencode-theme-css-*`), env vars `OPENCODE_*`, cookie `oc_locale`, CSS var prefixes `--v2-*`/`oc-`.
- Keep proper nouns of external services: "OpenCode Zen", "OpenCode Go", URL `opencode.ai/zen`, filename `opencode.json` (config file name is still real). Standalone product-name "OpenCode" → "arabcode".
- Brand color tokens: gold bright `#ffaf00`, gold deep `#c98a00`, warm black `#171207`, badge black `#0c0a07`, warm paper `#f6efe2`.
- Logo source assets: `/home/abotrf/Desktop/arabcode-landing/assets/{logo.png,logoS.png,favicon.svg}` (PNGs have **opaque black** backgrounds — must be processed to transparent before UI use).
- All commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Local dist serving in the server

**Files:**
- Modify: `packages/opencode/src/server/shared/ui.ts`
- Test: `packages/opencode/test/server/local-dist-ui.test.ts` (create)

**Interfaces:**
- Produces: `buildDistMap(dir: string): Record<string, string> | null` (exported, pure — maps request paths like `"assets/x.js"` to absolute file paths; `null` when `dir/index.html` missing), `localDistUI(): Record<string, string> | null` (cached), `localDistDir(): string` (env `ARABCODE_WEB_DIST` override, else `packages/app/dist` resolved relative to the source file).
- Consumes: existing `serveEmbeddedUIEffect(requestPath, fs, map)` in the same file (unchanged).

- [ ] **Step 1: Write the failing test**

Create `packages/opencode/test/server/local-dist-ui.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { buildDistMap } from "../../src/server/shared/ui"

describe("buildDistMap", () => {
  test("returns null when index.html is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "dist-"))
    expect(buildDistMap(dir)).toBeNull()
  })

  test("maps nested files to absolute paths with forward-slash keys", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "dist-"))
    writeFileSync(path.join(dir, "index.html"), "<html></html>")
    mkdirSync(path.join(dir, "assets"))
    writeFileSync(path.join(dir, "assets", "app.js"), "js")
    const map = buildDistMap(dir)!
    expect(map["index.html"]).toBe(path.join(dir, "index.html"))
    expect(map["assets/app.js"]).toBe(path.join(dir, "assets", "app.js"))
  })

  test("returns null for a nonexistent directory", () => {
    expect(buildDistMap("/nonexistent/path/xyz")).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abotrf/Desktop/opencode/packages/opencode && bun test test/server/local-dist-ui.test.ts`
Expected: FAIL — `buildDistMap` is not exported.

- [ ] **Step 3: Implement in ui.ts**

In `packages/opencode/src/server/shared/ui.ts`, add imports at the top:

```ts
import { existsSync, readdirSync } from "node:fs"
import nodePath from "node:path"
import { fileURLToPath } from "node:url"
```

Add after the `embeddedUI` function:

```ts
let localDistCache: Record<string, string> | null | undefined

/** Directory holding a locally built web UI (packages/app/dist) — used when
 * running from source, where no embedded UI was generated. Overridable via
 * ARABCODE_WEB_DIST. */
export function localDistDir() {
  const env = process.env["ARABCODE_WEB_DIST"]
  if (env) return env
  const here = nodePath.dirname(fileURLToPath(import.meta.url))
  // here = packages/opencode/src/server/shared → ../../../.. = packages
  return nodePath.resolve(here, "../../../..", "app", "dist")
}

export function buildDistMap(dir: string): Record<string, string> | null {
  try {
    if (!existsSync(nodePath.join(dir, "index.html"))) return null
    const map: Record<string, string> = {}
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue
      const abs = nodePath.join(entry.parentPath, entry.name)
      map[nodePath.relative(dir, abs).replaceAll("\\", "/")] = abs
    }
    return map
  } catch {
    return null
  }
}

export function localDistUI() {
  if (localDistCache !== undefined) return localDistCache
  localDistCache = buildDistMap(localDistDir())
  return localDistCache
}
```

In `serveUIEffect`, after the embedded check (`if (embeddedWebUI) return ...`), insert:

```ts
    const localUI = localDistUI()
    if (localUI) return yield* serveEmbeddedUIEffect(path, services.fs, localUI)
```

(`path` here is the existing `const path = new URL(request.url, ...)` local — that is why the node module is imported as `nodePath`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/abotrf/Desktop/opencode/packages/opencode && bun test test/server/local-dist-ui.test.ts`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add packages/opencode/src/server/shared/ui.ts packages/opencode/test/server/local-dist-ui.test.ts
git commit -m "feat(server): serve locally built web UI from packages/app/dist before proxying upstream"
```

---

### Task 2: Brand static assets (favicons, manifest, hero logos, Arabic font)

**Files:**
- Create/overwrite in `packages/app/public/`: `favicon.svg`, `favicon-v3.svg`, `favicon.ico`, `favicon-v3.ico`, `favicon-96x96.png`, `favicon-96x96-v3.png`, `apple-touch-icon.png`, `apple-touch-icon-v3.png`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `social-share.png`, `site.webmanifest`
- Create: `packages/app/public/assets/arabcode-wordmark.png` (transparent), `packages/app/public/assets/arabcode-wordmark-light.png` (dark-ink variant), `packages/app/public/assets/IBMPlexSansArabic-{Regular,Medium,Bold}.woff2`

**Interfaces:**
- Produces: static files referenced by later tasks (Task 3 index.html, Task 8 fonts CSS, Task 9 home hero).

- [ ] **Step 1: Copy the vector favicon and generate raster icons**

```bash
cd /home/abotrf/Desktop/opencode/packages/app/public
cp /home/abotrf/Desktop/arabcode-landing/assets/favicon.svg favicon.svg
cp favicon.svg favicon-v3.svg
```

Then write and run this script from the scratchpad (uses the AC monogram `logoS.png` on the badge-black rounded square — avoids SVG-text font issues in ImageMagick):

```python
from PIL import Image, ImageDraw

SRC = "/home/abotrf/Desktop/arabcode-landing/assets/logoS.png"
OUT = "/home/abotrf/Desktop/opencode/packages/app/public"

def make_icon(size, out, pad_ratio=0.16, radius_ratio=0.22):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(12, 10, 7, 255))
    d.rounded_rectangle([int(size*0.04), int(size*0.04), size - 1 - int(size*0.04), size - 1 - int(size*0.04)],
                        radius=int(r * 0.85), outline=(201, 138, 0, 255), width=max(1, size // 48))
    logo = Image.open(SRC).convert("RGBA")
    pad = int(size * pad_ratio)
    box = size - 2 * pad
    ratio = min(box / logo.width, box / logo.height)
    logo = logo.resize((int(logo.width * ratio), int(logo.height * ratio)), Image.LANCZOS)
    img.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    img.save(out)

make_icon(96,  f"{OUT}/favicon-96x96.png")
make_icon(96,  f"{OUT}/favicon-96x96-v3.png")
make_icon(180, f"{OUT}/apple-touch-icon.png")
make_icon(180, f"{OUT}/apple-touch-icon-v3.png")
make_icon(192, f"{OUT}/web-app-manifest-192x192.png")
make_icon(512, f"{OUT}/web-app-manifest-512x512.png")
make_icon(64,  "/tmp/claude-1000/-home-abotrf-Desktop-opencode/2f458bdc-0435-4c1e-ad92-cd70c1247537/scratchpad/fav64.png")
print("icons done")
```

```bash
convert /tmp/claude-1000/-home-abotrf-Desktop-opencode/2f458bdc-0435-4c1e-ad92-cd70c1247537/scratchpad/fav64.png -define icon:auto-resize=16,32,48,64 favicon.ico
cp favicon.ico favicon-v3.ico
```

- [ ] **Step 2: Generate transparent wordmark variants + social share**

```python
from PIL import Image

SRC = "/home/abotrf/Desktop/arabcode-landing/assets/logo.png"
OUT = "/home/abotrf/Desktop/opencode/packages/app/public/assets"

img = Image.open(SRC).convert("RGBA")
px = img.load()
w, h = img.size
# black background -> transparent (threshold keeps gold/white glyph pixels)
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if r < 40 and g < 40 and b < 40:
            px[x, y] = (0, 0, 0, 0)
img.save(f"{OUT}/arabcode-wordmark.png")

# light-mode variant: near-white pixels -> warm dark ink
light = img.copy(); lp = light.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = lp[x, y]
        if a > 0 and r > 170 and g > 170 and b > 170:
            lp[x, y] = (36, 28, 18, a)
light.save(f"{OUT}/arabcode-wordmark-light.png")

# social share 1200x630: warm black bg + centered wordmark
share = Image.new("RGBA", (1200, 630), (23, 18, 7, 255))
ratio = min(1000 / w, 300 / h)
mark = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
share.alpha_composite(mark, ((1200 - mark.width) // 2, (630 - mark.height) // 2))
share.convert("RGB").save("/home/abotrf/Desktop/opencode/packages/app/public/social-share.png")
print("wordmarks done")
```

- [ ] **Step 3: Download IBM Plex Sans Arabic (arabic+latin subsets)**

```bash
cd /tmp/claude-1000/-home-abotrf-Desktop-opencode/2f458bdc-0435-4c1e-ad92-cd70c1247537/scratchpad
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap" -o plex.css
grep -o "https://[^)]*\.woff2" plex.css | sort -u
```

Inspect `plex.css`: each `@font-face` block has a `/* arabic */` or `/* latin */` comment and a weight. Download the **arabic** URL for weights 400, 500, 700 as `IBMPlexSansArabic-Regular.woff2`, `IBMPlexSansArabic-Medium.woff2`, `IBMPlexSansArabic-Bold.woff2` into `packages/app/public/assets/`. If Google Fonts is unreachable, fall back to the IBM plex GitHub release (`https://github.com/IBM/plex/releases` → `ibm-plex-sans-arabic.zip`, use the woff2 files inside).

- [ ] **Step 4: Rewrite site.webmanifest**

Overwrite `packages/app/public/site.webmanifest` with:

```json
{
  "name": "arabcode",
  "short_name": "arabcode",
  "description": "طرفية الذكاء الاصطناعي بالعربية — واجهة الويب",
  "lang": "ar",
  "dir": "rtl",
  "icons": [
    { "src": "/web-app-manifest-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/web-app-manifest-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#171207",
  "background_color": "#171207",
  "display": "standalone"
}
```

- [ ] **Step 5: Verify and commit**

Run: `file packages/app/public/favicon.ico packages/app/public/assets/*.woff2` — expect ICO + woff2 types. View `packages/app/public/assets/arabcode-wordmark.png` and `arabcode-wordmark-light.png` (Read tool) — expect transparent background, gold+white and gold+dark variants.

```bash
cd /home/abotrf/Desktop/opencode
git add packages/app/public/favicon.svg packages/app/public/favicon-v3.svg packages/app/public/favicon.ico packages/app/public/favicon-v3.ico packages/app/public/favicon-96x96.png packages/app/public/favicon-96x96-v3.png packages/app/public/apple-touch-icon.png packages/app/public/apple-touch-icon-v3.png packages/app/public/web-app-manifest-192x192.png packages/app/public/web-app-manifest-512x512.png packages/app/public/social-share.png packages/app/public/site.webmanifest packages/app/public/assets/arabcode-wordmark.png packages/app/public/assets/arabcode-wordmark-light.png packages/app/public/assets/IBMPlexSansArabic-Regular.woff2 packages/app/public/assets/IBMPlexSansArabic-Medium.woff2 packages/app/public/assets/IBMPlexSansArabic-Bold.woff2
git commit -m "feat(app): arabcode static brand assets — favicons, manifest, wordmarks, Arabic font"
```

---

### Task 3: index.html + theme preload rebrand

**Files:**
- Modify: `packages/app/index.html`
- Modify: `packages/app/public/oc-theme-preload.js`
- Modify: `packages/ui/src/theme/context.tsx:155,159` (hardcoded flash colors)

**Interfaces:**
- Consumes: assets from Task 2. Default theme id `"arabcode"` (registered in Task 4 — this task only changes the *fallback string*; until Task 4 lands the id resolves to a missing theme and oc-2 CSS remains, which is fine mid-plan).

- [ ] **Step 1: Rewrite index.html head**

Replace lines 2 and 9 and 15 of `packages/app/index.html`:

```html
<html lang="ar" dir="rtl" style="background-color: var(--v2-background-bg-deep, #171207)">
```

```html
    <title>arabcode — عرب كود</title>
```

```html
    <meta name="theme-color" content="#171207" />
```

- [ ] **Step 2: Update oc-theme-preload.js**

In `packages/app/public/oc-theme-preload.js`:
- Line 3: `var themeId = localStorage.getItem(key) || "arabcode"`
- Line 18: `document.documentElement.style.backgroundColor = isDark ? "#171207" : "#f6efe2"`
- Line 22: `if (metas.length > 0) metas[0].setAttribute("content", isDark ? "#171207" : "#f6efe2")`
- Line 24 stays `if (themeId === "oc-2") return` (oc-2 is still the no-CSS builtin).

- [ ] **Step 3: Update hardcoded flash colors in theme context**

In `packages/ui/src/theme/context.tsx` `applyThemeCss`:

```ts
  document.documentElement.style.backgroundColor = isDark ? "#171207" : "#f6efe2"
```

```ts
  if (meta) meta.setAttribute("content", isDark ? "#171207" : "#f6efe2")
```

- [ ] **Step 4: Commit**

```bash
git add packages/app/index.html packages/app/public/oc-theme-preload.js packages/ui/src/theme/context.tsx
git commit -m "feat(app): arabcode page shell — RTL html, Arabic title, warm flash colors, arabcode preload default"
```

---

### Task 4: arabcode gold theme, registered as default

**Files:**
- Create: `packages/ui/src/theme/themes/arabcode.json`
- Modify: `packages/ui/src/theme/context.tsx` (names map)
- Modify: `packages/ui/src/theme/default-themes.ts` (import + `DEFAULT_THEMES`)
- Modify: `packages/app/src/app.tsx:322` (`defaultTheme` prop)
- Check/modify: `packages/ui/src/theme/loader.ts:39`

**Interfaces:**
- Produces: theme id `"arabcode"` — consumed by Task 3's preload default and by ThemeProvider.

- [ ] **Step 1: Create the theme JSON**

`packages/ui/src/theme/themes/arabcode.json` (palette + light overrides; v2 tokens derive automatically like other themes such as vesper/dracula):

```json
{
  "$schema": "https://opencode.ai/desktop-theme.json",
  "name": "arabcode",
  "id": "arabcode",
  "light": {
    "palette": {
      "neutral": "#f6efe2",
      "ink": "#241c12",
      "primary": "#c98a00",
      "success": "#2e9e44",
      "warning": "#d97706",
      "error": "#d64533",
      "info": "#2b6cb0",
      "interactive": "#a06e00",
      "diffAdd": "#c8e6b9",
      "diffDelete": "#f2b3a6"
    },
    "overrides": {
      "border-weak-base": "#e3d6bd",
      "border-weaker-base": "#ece2cd",
      "surface-raised-base": "#f0e7d5",
      "surface-raised-base-hover": "#eadfc9"
    }
  },
  "dark": {
    "palette": {
      "neutral": "#171207",
      "ink": "#f3e9d2",
      "primary": "#ffaf00",
      "success": "#58c472",
      "warning": "#ffd166",
      "error": "#ff6b57",
      "info": "#6fa8ff",
      "interactive": "#ffaf00",
      "diffAdd": "#24422a",
      "diffDelete": "#54231d"
    },
    "overrides": {
      "border-weak-base": "#3a2f1a",
      "border-weaker-base": "#2b2312",
      "surface-raised-base": "#211a0c",
      "surface-raised-base-hover": "#2a2110"
    }
  }
}
```

(If `bun run --cwd packages/app build` later complains about unknown override keys, drop the `overrides` blocks — palette alone is valid per `ThemeVariant` in `types.ts`.)

- [ ] **Step 2: Register name + default**

In `packages/ui/src/theme/context.tsx` `names` map (line ~47), add alphabetically:

```ts
  arabcode: "arabcode",
```

In `packages/ui/src/theme/default-themes.ts`: add `import arabcodeThemeJson from "./themes/arabcode.json"`, `export const arabcodeTheme = arabcodeThemeJson as DesktopTheme`, and an `"arabcode": arabcodeTheme,` entry in `DEFAULT_THEMES`.

In `packages/app/src/app.tsx` (line ~322):

```tsx
      <ThemeProvider
        defaultTheme="arabcode"
        onThemeApplied={(_, mode, scheme) => {
```

- [ ] **Step 3: Check loader.ts special case**

Read `packages/ui/src/theme/loader.ts`. Line 39 has `const isDefaultTheme = themeId === "oc-2"`. Understand what it gates (likely: skip loading CSS for the builtin). If it gates "no dynamic theme file exists", leave it (arabcode DOES have a JSON file and must load). If it gates "which theme is the app default", change to `themeId === "arabcode"`. Apply the reading, note the decision in the commit message.

- [ ] **Step 4: Verify by building**

Run: `cd /home/abotrf/Desktop/opencode && bun run --cwd packages/app build`
Expected: build succeeds (this also validates arabcode.json import through `import.meta.glob`).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/theme/themes/arabcode.json packages/ui/src/theme/context.tsx packages/ui/src/theme/default-themes.ts packages/app/src/app.tsx packages/ui/src/theme/loader.ts
git commit -m "feat(ui): arabcode gold theme (dark + warm paper light), set as default"
```

---

### Task 5: Logo components + desktop menu labels

**Files:**
- Modify: `packages/ui/src/components/logo.tsx` (all three exports)
- Modify: `packages/app/src/desktop-menu.ts:75`, `packages/app/src/components/windows-app-menu.tsx:80`

**Interfaces:**
- Produces: same component signatures (`Mark`, `Splash`, `Logo` each taking `{ class?: string }` — `Splash` also `ref`) so all existing call sites (error.tsx, session-side-panel.tsx, session-new-view.tsx, session.tsx, app.tsx, home.tsx, session-question-dock.tsx) keep compiling.

- [ ] **Step 1: Rewrite logo.tsx**

The new identity: a badge (rounded square, badge-black `#0c0a07` fill, gold border, gold ع) as the mark, and a wordmark "arabcode" using theme text vars (gold "arab" + theme-strong "code" so it adapts to light/dark). Replace the whole file:

```tsx
import { type ComponentProps } from "solid-js"

const BADGE_BG = "#0c0a07"
const GOLD = "var(--arabcode-gold, #ffaf00)"
const GOLD_DEEP = "#c98a00"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill={BADGE_BG} />
      <rect x="1.5" y="1.5" width="29" height="29" rx="6" fill="none" stroke={GOLD_DEEP} stroke-width="1.5" />
      <text
        x="16"
        y="22.5"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="19"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="18" width="64" height="64" rx="14" fill={BADGE_BG} />
      <rect x="11" y="21" width="58" height="58" rx="12" fill="none" stroke={GOLD_DEEP} stroke-width="3" />
      <text
        x="40"
        y="63"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="38"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <rect x="0" y="5" width="32" height="32" rx="7" fill={BADGE_BG} />
      <rect x="1.5" y="6.5" width="29" height="29" rx="6" fill="none" stroke={GOLD_DEEP} stroke-width="1.5" />
      <text
        x="16"
        y="27.5"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="19"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
      <text
        x="42"
        y="32"
        font-family="'IBM Plex Sans Arabic', Inter, sans-serif"
        font-size="26"
        font-weight="700"
        letter-spacing="0.5"
      >
        <tspan fill={GOLD}>arab</tspan>
        <tspan fill="var(--icon-strong-base)">code</tspan>
      </text>
    </svg>
  )
}
```

- [ ] **Step 2: Update menu labels**

`packages/app/src/desktop-menu.ts:75`: `label: "OpenCode",` → `label: "arabcode",`
`packages/app/src/components/windows-app-menu.tsx:80`: `>OpenCode<` → `>arabcode<`

- [ ] **Step 3: Verify usages compile**

Run: `cd /home/abotrf/Desktop/opencode && bun run --cwd packages/app build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/logo.tsx packages/app/src/desktop-menu.ts packages/app/src/components/windows-app-menu.tsx
git commit -m "feat(ui): arabcode logo mark/splash/wordmark, menu labels"
```

---

### Task 6: i18n sweep — visible "OpenCode" → "arabcode"

**Files:**
- Modify: every locale in `packages/app/src/i18n/*.ts` and `packages/ui/src/i18n/*.ts` (values only)
- Modify: any component with hardcoded visible "OpenCode" text found by grep

**Interfaces:** none (string values only).

- [ ] **Step 1: Sweep locale files, protecting service proper nouns**

```bash
cd /home/abotrf/Desktop/opencode
for f in packages/app/src/i18n/*.ts packages/ui/src/i18n/*.ts; do
  [ "$(basename $f)" = "parity.test.ts" ] && continue
  sed -i 's/OpenCode Zen/@@ZEN@@/g; s/OpenCode Go/@@GO@@/g; s/OpenCode/arabcode/g; s/@@ZEN@@/OpenCode Zen/g; s/@@GO@@/OpenCode Go/g' "$f"
done
grep -rn "OpenCode" packages/app/src/i18n/ packages/ui/src/i18n/ | grep -v "OpenCode Zen\|OpenCode Go"
```

Expected: last grep prints nothing.

- [ ] **Step 2: Grep remaining hardcoded UI strings**

```bash
grep -rn '"OpenCode\|>OpenCode\|OpenCode<\|'"'"'OpenCode' packages/app/src packages/ui/src --include="*.tsx" --include="*.ts" | grep -v "/i18n/\|test\|stories\|Zen\|Go"
```

For each hit that renders to the user (JSX text, labels, aria-labels, placeholders, notification titles): replace "OpenCode" with "arabcode". Leave identifiers, imports, URLs, storage keys. Also check `packages/app/src/components/help-button.tsx` — if it links to `opencode.ai` marketing/docs pages, point the primary link to `https://github.com/abdallhx2/arabcode` instead.

- [ ] **Step 3: Run the parity test**

Run: `cd /home/abotrf/Desktop/opencode/packages/app && bun test --preload ./happydom.ts src/i18n/parity.test.ts`
Expected: PASS (keys untouched).

- [ ] **Step 4: Commit**

```bash
git add packages/app/src/i18n packages/ui/src/i18n
git add -u packages/app/src packages/ui/src   # only if step 2 touched named component files — otherwise add them explicitly by name
git commit -m "feat(i18n): rebrand visible OpenCode product mentions to arabcode (values only; Zen/Go service names kept)"
```

**تنبيه:** `git add -u` ممنوع هنا فعليًا بسبب تغييرات غير ذات صلة في الشجرة — أضف الملفات التي عدّلتها في الخطوة 2 **بالاسم** فقط.

---

### Task 7: RTL wiring — Arabic default, `dir` switching, LTR islands

**Files:**
- Modify: `packages/app/src/context/language.tsx`
- Modify: `packages/app/src/index.css` (LTR-island rules + logical-property fix)
- Test: `packages/app/src/context/language-direction.test.ts` (create)

**Interfaces:**
- Produces: `document.documentElement.dir` reactively follows locale (`"rtl"` for `ar`, else `"ltr"`); default locale is `"ar"` when nothing is stored.

- [ ] **Step 1: Write the failing test**

Create `packages/app/src/context/language-direction.test.ts`:

```ts
import { describe, expect, test } from "bun:test"
import { directionFor, DEFAULT_LOCALE } from "./language"

describe("locale direction", () => {
  test("arabic is rtl", () => {
    expect(directionFor("ar")).toBe("rtl")
  })
  test("english is ltr", () => {
    expect(directionFor("en")).toBe("ltr")
  })
  test("default locale is arabic", () => {
    expect(DEFAULT_LOCALE).toBe("ar")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/abotrf/Desktop/opencode/packages/app && bun test --preload ./happydom.ts src/context/language-direction.test.ts`
Expected: FAIL — `directionFor` not exported.

- [ ] **Step 3: Implement in language.tsx**

Add exports near the top of `packages/app/src/context/language.tsx`:

```ts
export const DEFAULT_LOCALE: Locale = "ar"

export function directionFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}
```

Make Arabic the default (arabcode is Arabic-first — browser language no longer decides):
- `detectLocale()`: change the final `return "en"` to `return DEFAULT_LOCALE`, and delete the `{ locale: "en", match: ... }` entry? **No** — keep matchers intact; instead stop consulting them: change line 196 to `const warm = readStoredLocale() ?? DEFAULT_LOCALE` and line 203 to `const initial = props.locale ?? readStoredLocale() ?? DEFAULT_LOCALE`. (`detectLocale` becomes unused — delete the function and `localeMatchers` array to keep the file clean.)
- `normalizeLocale` (line 180): change fallback `"en"` → stays `"en"`?? No: it normalizes *stored* values; an invalid stored value should fall back to the default. Change `: "en"` to `: DEFAULT_LOCALE`.

In the existing `createEffect` (line ~225), add the `dir` line:

```ts
    createEffect(() => {
      if (typeof document !== "object") return
      document.documentElement.lang = locale()
      document.documentElement.dir = directionFor(locale())
      document.cookie = cookie(locale())
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/abotrf/Desktop/opencode/packages/app && bun test --preload ./happydom.ts src/context/language-direction.test.ts`
Expected: PASS.

- [ ] **Step 5: LTR islands + logical-property fixes in index.css**

Append to `packages/app/src/index.css` (inside a new `@layer components` block at the end):

```css
/* arabcode RTL: code, terminals, diffs and file paths are inherently LTR. */
[dir="rtl"] pre,
[dir="rtl"] code,
[dir="rtl"] kbd,
[dir="rtl"] samp,
[dir="rtl"] [data-component="terminal-panel"],
[dir="rtl"] .xterm,
[dir="rtl"] [data-component="code-block"],
[dir="rtl"] [data-component="diff"],
[dir="rtl"] [data-slot="file-path"] {
  direction: ltr;
  text-align: left;
  unicode-bidi: isolate;
}

/* Mixed-language chat content resolves direction per paragraph. */
[dir="rtl"] [data-component="message-text"] {
  unicode-bidi: plaintext;
}
```

Then verify the selectors actually exist and adjust to reality:

```bash
grep -rn "data-component=\"terminal" packages/app/src/pages/session/terminal-panel-v2.tsx packages/app/src/pages/session/terminal-panel.tsx | head -3
grep -rn "data-component" packages/ui/src/components/ | grep -i "code\|diff" | head -10
```

Use the data-component/data-slot names the grep reveals (e.g. if the terminal root is `data-component="terminal-panel-v2"`, target that). If a terminal/diff root has no data attribute, add `dir="ltr"` directly on its root JSX element instead.

Fix the physical property at `packages/app/src/index.css:77`:

```css
  [data-slot="desktop-app-menu-keybind"] {
    margin-inline-start: auto;
```

- [ ] **Step 6: Chrome audit for physical Tailwind utilities**

```bash
grep -n "pl-\|pr-\|ml-\|mr-\|left-\|right-\|text-left\|text-right\|rounded-l\|rounded-r\|border-l\|border-r" packages/app/src/pages/layout.tsx packages/app/src/pages/home.tsx | head -60
```

Convert hits **in these two files** to logical equivalents (`pl-→ps-`, `pr-→pe-`, `ml-→ms-`, `mr-→me-`, `left-→start-`, `right-→end-`, `text-left→text-start`, `rounded-l→rounded-s`, `border-l→border-s`, etc.). Skip anything inside terminal/code/diff contexts. Do NOT sweep the whole codebase — flex/grid auto-mirroring covers most of it; remaining glitches are caught visually in Task 10.

- [ ] **Step 7: Commit**

```bash
git add packages/app/src/context/language.tsx packages/app/src/context/language-direction.test.ts packages/app/src/index.css packages/app/src/pages/layout.tsx packages/app/src/pages/home.tsx
git commit -m "feat(app): full RTL — Arabic default locale, dir follows locale, LTR islands for code/terminal/diff"
```

(اذكر بالاسم أي ملف إضافي لمستَه في الخطوة 5 عند إضافة `dir=\"ltr\"` على جذر الطرفية/الفروقات.)

---

### Task 8: Arabic font wiring

**Files:**
- Modify: `packages/app/src/index.css` (@font-face + sans chain)

**Interfaces:**
- Consumes: woff2 files from Task 2 at `/assets/IBMPlexSansArabic-*.woff2`.

- [ ] **Step 1: Find where the sans font-family is set for the app**

```bash
grep -rn -- "--font-family-sans" packages/app/src packages/ui/src/v2 packages/ui/src/styles | grep -v node_modules | head
```

`packages/ui/src/styles/theme.css:2` defines the base chain (no Inter). Note whichever file wins for the app (v2 styles may redefine it).

- [ ] **Step 2: Add @font-face and the chain override**

In `packages/app/src/index.css`, after the existing Inter `@font-face` (line ~18), add:

```css
@font-face {
  font-family: "IBM Plex Sans Arabic";
  src: url("/assets/IBMPlexSansArabic-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans Arabic";
  src: url("/assets/IBMPlexSansArabic-Medium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans Arabic";
  src: url("/assets/IBMPlexSansArabic-Bold.woff2") format("woff2");
  font-weight: 600 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-family-sans:
    "Inter", "IBM Plex Sans Arabic", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}
```

(Inter first is intentional: Inter has no Arabic glyphs, so Latin renders in Inter and Arabic falls through to Plex Arabic — matching sizes well. If Step 1 showed a higher-specificity definition elsewhere, override at that same layer.)

- [ ] **Step 3: Build and commit**

Run: `bun run --cwd packages/app build` — expect success.

```bash
git add packages/app/src/index.css
git commit -m "feat(app): IBM Plex Sans Arabic for Arabic text"
```

---

### Task 9: Home screen redesign

**Files:**
- Modify: `packages/app/src/pages/home.tsx` (hero block, lines ~1584-1600)
- Modify: `packages/app/src/index.css` (hero styles)

**Interfaces:**
- Consumes: `Logo` from Task 5, wordmark PNGs from Task 2, i18n `t()` from `useLanguage()` (already in scope in home.tsx as `language`).

- [ ] **Step 1: Replace the hero block**

In `home.tsx`, the current hero (line ~1585):

```tsx
    <div class="mx-auto mt-55 w-full md:w-auto px-4">
      <Logo class="md:w-xl opacity-12" />
```

becomes:

```tsx
    <div class="mx-auto mt-40 w-full md:w-auto px-4">
      <div data-component="home-hero">
        <img data-slot="home-hero-wordmark" src="/assets/arabcode-wordmark.png" alt="arabcode" />
        <img data-slot="home-hero-wordmark-light" src="/assets/arabcode-wordmark-light.png" alt="arabcode" />
        <div data-slot="home-hero-tagline">طرفية الذكاء الاصطناعي — بالعربية الكاملة</div>
        <div data-slot="home-hero-rule" />
      </div>
```

(Keep everything after the old `<Logo …/>` line — the server Button, the `<Switch>` with recent projects — unchanged, still inside the outer div.)

- [ ] **Step 2: Hero styles**

Append to `packages/app/src/index.css`:

```css
[data-component="home-hero"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

[data-slot="home-hero-wordmark"],
[data-slot="home-hero-wordmark-light"] {
  width: min(420px, 80vw);
  image-rendering: pixelated;
}

[data-color-scheme="dark"] [data-slot="home-hero-wordmark-light"],
[data-color-scheme="light"] [data-slot="home-hero-wordmark"] {
  display: none;
}

[data-slot="home-hero-tagline"] {
  font-size: var(--font-size-large, 16px);
  color: var(--text-weak);
  letter-spacing: 0.01em;
}

[data-slot="home-hero-rule"] {
  width: 96px;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, #c98a00, transparent);
}
```

- [ ] **Step 3: Gold accents on project cards**

In the recent-projects section of `home.tsx` (starts right after the hero, `home.recentProjects`), find the project card/list-item container and add `data-component="home-project-card"` on its root element, then append:

```css
[data-component="home-project-card"] {
  border: 1px solid var(--border-weaker-base);
  border-radius: 10px;
  transition: border-color 120ms ease;
}

[data-component="home-project-card"]:hover {
  border-color: #c98a0066;
}
```

If the list rows are plain flex rows without a card container, apply the attribute to the row root — the hover ring is the deliverable, exact node is implementer's choice.

- [ ] **Step 4: Build, visual sanity, commit**

`bun run --cwd packages/app build` — success. (Full visual check happens in Task 10.)

```bash
git add packages/app/src/pages/home.tsx packages/app/src/index.css
git commit -m "feat(app): redesigned Arabic-first home hero with arabcode wordmark and gold accents"
```

---

### Task 10: End-to-end verification at 127.0.0.1:4096

**Files:** none created (fixes go into the files of earlier tasks if bugs surface).

- [ ] **Step 1: Fresh build + start server**

```bash
cd /home/abotrf/Desktop/opencode
bun run --cwd packages/app build
bun run packages/opencode/src/index.ts serve   # background; port 4096 default
```

- [ ] **Step 2: HTTP-level checks**

```bash
curl -s http://127.0.0.1:4096/ | grep -o "<title>[^<]*</title>"        # expect: arabcode — عرب كود
curl -s http://127.0.0.1:4096/ | grep -c 'dir="rtl"'                    # expect: 1
curl -s -o /dev/null -w "%{content_type}\n" http://127.0.0.1:4096/favicon.svg   # expect image/svg+xml
curl -s http://127.0.0.1:4096/site.webmanifest | grep arabcode          # expect hits
```

If the title still says OpenCode, the server is proxying — check `localDistUI()` found the dist (`ls packages/app/dist/index.html`).

- [ ] **Step 3: Browser verification (playwright MCP or claude-in-chrome)**

Open `http://127.0.0.1:4096/` and verify with screenshots:
1. Dark mode: warm-black bg, gold accents, arabcode wordmark on home, Arabic UI, layout mirrored (sidebar right).
2. Light mode (toggle via command palette or settings): warm paper bg, light wordmark variant shown.
3. Open a session with code output: code block and terminal remain LTR/left-aligned.
4. Switch language to English via the command palette: `dir` flips to ltr; switch back to Arabic: rtl returns.
5. No "OpenCode" text anywhere on home, settings dialog, server dialog (except OpenCode Zen/Go provider names).

- [ ] **Step 4: Test suites**

```bash
cd packages/app && bun test --preload ./happydom.ts src/i18n/parity.test.ts src/context/language-direction.test.ts
cd ../opencode && bun test test/server/local-dist-ui.test.ts
```

Expected: all pass. Also run `bun run --cwd packages/app typecheck` and confirm no NEW errors versus `git stash`-free baseline (pre-existing branch errors are known).

- [ ] **Step 5: Final sweep + commit any fixes**

```bash
grep -rn "OpenCode" packages/app/src packages/ui/src --include="*.tsx" --include="*.ts" | grep -v "test\|stories\|Zen\|Go\|import\|@opencode-ai\|opencode-ai\|opencode\." | head
```

Review the remainder; fix visible ones. Commit fixes with named files.

---

## Self-Review Notes

- Spec §1 → Task 1; §2 → Tasks 2, 3, 5, 6; §3 → Tasks 3, 4; §4 → Task 7; §5 → Tasks 8, 9; §6 → Task 10. No gaps.
- Preload default flips to "arabcode" in Task 3 but the theme JSON lands in Task 4 — between the two commits the app falls back to oc-2 rendering (theme id set on `<html>` but no CSS cached), which is cosmetically stale but functional; Tasks 3+4 should be executed back-to-back.
- "OpenCode Zen"/"OpenCode Go" retention is a deliberate deviation from a literal reading of "remove every mention": they name the upstream vendor's hosted model services which the provider dialog genuinely connects to. Flag to the user in the final summary.
