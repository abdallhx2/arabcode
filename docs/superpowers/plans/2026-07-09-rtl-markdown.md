# RTL Markdown-Prose Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Arabic prose in assistant markdown responses renders shaped + reordered (RTL) + right-aligned, while real code blocks stay LTR.

**Architecture:** Markdown prose is drawn by `CodeRenderable` (filetype `"markdown"`), which the phase-1 RTL transform excludes (it only touches `TextRenderable`). We extend the transform to `CodeRenderable` **only when `_filetype === "markdown"`** by wrapping that renderable's `textBuffer.setStyledText`/`setText` sinks once (via a new `globalThis.__arabcodeRtl.code(renderable)` hook called from the patched `CodeRenderable` constructor). Real code (other filetypes) is untouched. Re-wrap on resize reuses the phase-1 `resize` hook dispatch, which already fires for `CodeRenderable`.

**Tech Stack:** Bun + TypeScript, SolidJS via `@opentui/solid`, `@opentui/core@0.4.3` (patched via `patches/@opentui%2Fcore@0.4.3.patch`), existing `packages/tui/src/util/rtl.ts` (`transformChunks`, `hasRtl`, `visualLine`) + `rtl-hook.ts`.

**Spec:** `docs/superpowers/specs/2026-07-09-rtl-markdown-design.md`

## Global Constraints

- Transform activates ONLY when `rtlMode() === "app"` AND `renderable._filetype === "markdown"` AND `hasRtl(text)`. Any other case (real code, LTR text, off mode) must call the ORIGINAL sink byte-for-byte.
- Reuse `transformChunks(chunks, {width, makePlain})` from `rtl.ts` — do NOT reimplement shaping/reorder. Width = `renderable.width` when > 0, else `undefined` (single-line shape+reorder, re-wrapped on resize).
- When active, set the renderable's `wrapMode` to `"none"` (app-side wrap replaces native wrap; native-wrapping visual text reverses line reading order).
- Store the incoming LOGICAL StyledText on the renderable (`__rtlCodeSource`) so `resize` can rebuild. CodeRenderable always passes logical text to its sinks, so transforming the incoming value each call is correct (never re-transform an already-visual buffer).
- Wrappers must not recurse: each wrapper calls the captured ORIGINAL method, never the wrapped one.
- node_modules edits persisted via `bun patch --commit 'node_modules/@opentui/core'`; the regenerated patch MUST retain all prior hooks (transform/resize/line/chunks/editor).
- Arabic comments in new code, matching existing `rtl.ts`/`rtl-hook.ts` style.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Pre-existing on branch: ~26 failing TUI tests from the translation phase — not ours; only ensure `test/util/rtl*` pass and no NEW failures elsewhere.

---

### Task 1: `code` hook — wrap CodeRenderable text sinks + resize support in `rtl-hook.ts`

**Files:**
- Modify: `packages/tui/src/util/rtl-hook.ts`
- Test: `packages/tui/test/util/rtl-code.test.ts` (create)

**Interfaces:**
- Consumes: `transformChunks`, `hasRtl` from `./rtl`; `StyledText`, `TextChunk` from `@opentui/core`.
- Produces: `installCode(renderable)` registered as `globalThis.__arabcodeRtl.code`; extended `resize` handling for code renderables.

Interface the wrapped renderable must satisfy (structural — real `CodeRenderable`):
```ts
interface RtlCodeRenderable {
  constructor: { name: string }
  _filetype?: string
  width: number
  wrapMode: "none" | "char" | "word"
  textBuffer: { setStyledText(st: StyledText): void; setText(text: string): void }
  __rtlCode?: boolean          // مُثبَّت الأغلفة
  __rtlCodeSource?: StyledText // آخر مصدر منطقي
  __rtlCodeWidth?: number      // آخر عرض بُني عليه
  __rtlCodeWrapped?: boolean   // هل عُطّل الالتفاف
}
```

- [ ] **Step 1: Write the failing test**

Create `packages/tui/test/util/rtl-code.test.ts`. It uses a fake renderable capturing what reaches the original sink:

```ts
import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { StyledText } from "@opentui/core"
import { installRtlHooks, uninstallRtlHooks } from "../../src/util/rtl-hook"
import { setRtlMode, visualLine } from "../../src/util/rtl"

beforeAll(() => { setRtlMode("app"); installRtlHooks() })
afterAll(() => { uninstallRtlHooks(); setRtlMode("off") })

function fakeCode(filetype: string, width = 40) {
  const applied: string[] = []
  const r: any = {
    constructor: { name: "CodeRenderable" },
    _filetype: filetype,
    width,
    wrapMode: "word",
    textBuffer: {
      setStyledText(st: StyledText) { applied.push(st.chunks.map((c: any) => c.text).join("")) },
      setText(t: string) { applied.push(t) },
    },
  }
  return { r, applied }
}

describe("code hook", () => {
  test("markdown Arabic prose is shaped + reordered on setStyledText", () => {
    const { r, applied } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setStyledText(new StyledText([{ __isChunk: true, text: "مرحبا بالعالم" }]))
    expect(applied[applied.length - 1]).toContain(visualLine("مرحبا بالعالم"))
    expect(applied[applied.length - 1]).not.toContain("مرحبا بالعالم")
    expect(r.wrapMode).toBe("none")
  })

  test("markdown Arabic prose via setText is transformed too", () => {
    const { r, applied } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setText("مرحبا بالعالم")
    expect(applied[applied.length - 1]).toContain(visualLine("مرحبا بالعالم"))
  })

  test("real code block (filetype js) is untouched", () => {
    const { r, applied } = fakeCode("javascript")
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setText("const x = 1")
    expect(applied[applied.length - 1]).toBe("const x = 1")
    expect(r.wrapMode).toBe("word")
  })

  test("markdown LTR prose is untouched (byte-identical)", () => {
    const { r, applied } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setText("hello world")
    expect(applied[applied.length - 1]).toBe("hello world")
  })

  test("resize rebuilds markdown prose at the new width", () => {
    const { r, applied } = fakeCode("markdown", 0)
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setStyledText(new StyledText([{ __isChunk: true, text: "مرحبا بالعالم يا اصدقاء" }]))
    const before = applied.length
    r.width = 12
    globalThis.__arabcodeRtl!.resize!(r, 12)
    // أُعيد البناء: خرج جديد، وملتفّ (أكثر من سطر)
    expect(applied.length).toBeGreaterThan(before)
    expect(applied[applied.length - 1]).toContain("\n")
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /home/abotrf/Desktop/opencode/packages/tui && bun test test/util/rtl-code.test.ts`
Expected: FAIL — `globalThis.__arabcodeRtl.code` is undefined.

- [ ] **Step 3: Implement in `rtl-hook.ts`**

Add to the `declare global` `__arabcodeRtl` object type:
```ts
        /** غلاف نثر Markdown (CodeRenderable filetype markdown): تشكيل + إعادة ترتيب عند الرسم */
        code(renderable: unknown): void
```

Add the implementation (near the other hooks). It wraps the two sinks once, gated dynamically:
```ts
interface RtlCodeRenderable {
  constructor: { name: string }
  _filetype?: string
  width: number
  wrapMode: "none" | "char" | "word"
  textBuffer: { setStyledText(st: StyledText): void; setText(text: string): void }
  __rtlCode?: boolean
  __rtlCodeSource?: StyledText
  __rtlCodeWidth?: number
  __rtlCodeWrapped?: boolean
}

function codeStyled(r: RtlCodeRenderable, source: StyledText): StyledText {
  const width = r.width > 0 ? r.width : undefined
  r.__rtlCodeWidth = r.width
  return new StyledText(transformChunks(source.chunks, { width, makePlain }))
}

/** يغلّف منافذ نص CodeRenderable مرة واحدة؛ يفعّل فقط لنثر Markdown العربي. */
function installCode(renderable: unknown): void {
  const r = renderable as RtlCodeRenderable
  if (r.__rtlCode || !r.textBuffer) return
  r.__rtlCode = true
  const origStyled = r.textBuffer.setStyledText.bind(r.textBuffer)
  const origText = r.textBuffer.setText.bind(r.textBuffer)
  const active = (text: string) => r._filetype === "markdown" && hasRtl(text)
  const ensureNoWrap = () => {
    if (!r.__rtlCodeWrapped) {
      r.wrapMode = "none"
      r.__rtlCodeWrapped = true
    }
  }
  r.textBuffer.setStyledText = (st: StyledText) => {
    const raw = st.chunks.map((c) => c.text).join("")
    if (!active(raw)) {
      r.__rtlCodeSource = undefined
      return origStyled(st)
    }
    r.__rtlCodeSource = st
    ensureNoWrap()
    origStyled(codeStyled(r, st))
  }
  r.textBuffer.setText = (text: string) => {
    if (!active(text)) {
      r.__rtlCodeSource = undefined
      return origText(text)
    }
    const st = new StyledText([makePlain(text)])
    r.__rtlCodeSource = st
    ensureNoWrap()
    origStyled(codeStyled(r, st))
  }
}
```

Extend `resize(renderable, width)` — at its top, before the existing TextRenderable logic, handle code renderables:
```ts
function resize(renderable: unknown, width: number): void {
  const c = renderable as RtlCodeRenderable
  if (c?.__rtlCode) {
    if (c.__rtlCodeSource && width > 0 && width !== c.__rtlCodeWidth) {
      c.textBuffer.setStyledText(c.__rtlCodeSource) // يمرّ عبر الغلاف فيعيد البناء بالعرض الجديد
    }
    return
  }
  // ...المنطق الحالي لـ TextRenderable كما هو
}
```

Register in `installRtlHooks()`:
```ts
  globalThis.__arabcodeRtl = { transform, resize, line, chunks, editor: editorHooks, code: installCode }
```

Note: `makePlain` already exists in the file (`{ __isChunk: true, text }`). Reuse it.

- [ ] **Step 4: Run to verify pass**

Run: `cd /home/abotrf/Desktop/opencode/packages/tui && bun test test/util/rtl-code.test.ts`
Expected: PASS (5 tests). Then regression: `bun test test/util/rtl.test.ts test/util/rtl-editor.test.ts test/util/rtl-map.test.ts` all PASS, and `bun run typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/util/rtl-hook.ts packages/tui/test/util/rtl-code.test.ts
git commit -m "feat(tui): RTL transform for markdown-prose CodeRenderable (code hook)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Patch `@opentui/core` — call the `code` hook from CodeRenderable constructor

**Files:**
- Modify (patched dep): `node_modules/@opentui/core/index-xt9f071j.js` — `CodeRenderable` constructor (~line 3138, after option assignments, before the `if (this._content.length > 0)` block at ~3139)
- Regenerate: `patches/@opentui%2Fcore@0.4.3.patch`

**Interfaces:**
- Consumes: `globalThis.__arabcodeRtl.code` from Task 1.
- Produces: every `CodeRenderable` instance is wrapped at construction (before its own content-setting sinks run), so markdown prose is transformed from the first paint; the `resize` dispatch already reaches it via the phase-1 `TextBufferRenderable.onResize` hook.

- [ ] **Step 1: Prepare the dependency for patching**

```bash
cd /home/abotrf/Desktop/opencode && bun patch @opentui/core@0.4.3
```
Verify prior hooks still present: `grep -c "__arabcodeRtl" node_modules/@opentui/core/index-xt9f071j.js` (should be > 5).

- [ ] **Step 2: Patch the CodeRenderable constructor**

In `node_modules/@opentui/core/index-xt9f071j.js`, find (in the `CodeRenderable` constructor, ~line 3136-3139):

```js
    this._baseHighlight = options.baseHighlight;
    this._onHighlight = options.onHighlight;
    this._onChunks = options.onChunks;
    if (this._content.length > 0) {
```

Change to:

```js
    this._baseHighlight = options.baseHighlight;
    this._onHighlight = options.onHighlight;
    this._onChunks = options.onChunks;
    globalThis.__arabcodeRtl?.code?.(this);
    if (this._content.length > 0) {
```

(Placing it before the content block ensures the constructor's own `setStyledText`/`setText` calls at ~3141/3143 go through the wrappers. `this.textBuffer` exists — created in the `TextBufferRenderable` super constructor. `this._filetype` is already assigned at ~3129.)

- [ ] **Step 3: Persist the patch**

```bash
cd /home/abotrf/Desktop/opencode && bun patch --commit 'node_modules/@opentui/core'
```
Verify: `grep -c "__arabcodeRtl?.code" 'patches/@opentui%2Fcore@0.4.3.patch'` ≥ 1, and prior markers still present: `grep -o "__arabcodeRtl?[.][a-z]*" 'patches/@opentui%2Fcore@0.4.3.patch' | sort -u` shows chunks, code, editor, line, resize, transform.

- [ ] **Step 4: Sanity + commit**

Run: `cd /home/abotrf/Desktop/opencode/packages/tui && bun test test/util/rtl.test.ts test/util/rtl-render.test.tsx test/util/rtl-code.test.ts && bun run typecheck`
Expected: PASS + clean. `package.json`/`bun.lock` untouched by commit (only patch file); never commit node_modules.

```bash
cd /home/abotrf/Desktop/opencode
git add packages/tui/src/util/rtl-hook.ts 'patches/@opentui%2Fcore@0.4.3.patch'
git commit -m "feat(tui): wire code hook into CodeRenderable constructor for markdown RTL

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(If Task 1's rtl-hook.ts changes were already committed, only the patch file is staged here.)

---

### Task 3: Integration tests — Arabic markdown renders RTL; code stays LTR

**Files:**
- Modify: `packages/tui/test/util/rtl-render.test.tsx` (append)

**Interfaces:**
- Consumes: `testRender` from `@opentui/solid`, installed hooks, `visualLine` from `rtl.ts`. Markdown highlighting is async — await a short tick + a second `renderOnce()` before capturing.

- [ ] **Step 1: Write the tests**

Append to `packages/tui/test/util/rtl-render.test.tsx`:

```tsx
async function settle(app: any) {
  await app.renderOnce()
  await new Promise((r) => setTimeout(r, 400)) // تلوين tree-sitter اللا-متزامن
  await app.renderOnce()
}

test("markdown Arabic prose is shaped and reordered (assistant response)", async () => {
  const app = await testRender(() => (<markdown content="مرحبا بالعالم" width={30} /> as any))
  try {
    await settle(app)
    const frame = app.captureCharFrame()
    expect(frame).toContain(visualLine("مرحبا بالعالم"))
    expect(frame).not.toContain("مرحبا بالعالم")
  } finally {
    app.renderer.destroy()
  }
})

test("markdown Arabic paragraph with an English term keeps the term LTR", async () => {
  const app = await testRender(() => (<markdown content="استخدم مكتبة React الآن" width={40} /> as any))
  try {
    await settle(app)
    const frame = app.captureCharFrame()
    expect(frame).toContain("React")
    expect(frame).not.toContain("استخدم مكتبة") // النثر العربي غير خام
  } finally {
    app.renderer.destroy()
  }
})

test("markdown code block stays LTR (not transformed)", async () => {
  const app = await testRender(() => (<markdown content={"```js\nconst x = 1\n```"} width={30} /> as any))
  try {
    await settle(app)
    const frame = app.captureCharFrame()
    expect(frame).toContain("const x = 1")
  } finally {
    app.renderer.destroy()
  }
})
```

- [ ] **Step 2: Run**

Run: `cd /home/abotrf/Desktop/opencode/packages/tui && bun test test/util/rtl-render.test.tsx`
Expected: PASS (existing 13 + 3 new). If the first test still shows raw "مرحبا بالعالم", the constructor patch or hook gate is wrong — debug: confirm `globalThis.__arabcodeRtl.code` is registered and the markdown block's renderable really has `_filetype === "markdown"` (log it). Do NOT weaken the assertion.

Then full regression: `bun test test/util/` — rtl* all pass, no NEW failures elsewhere; `bun run typecheck` clean.

- [ ] **Step 3: Commit**

```bash
cd /home/abotrf/Desktop/opencode
git add packages/tui/test/util/rtl-render.test.tsx
git commit -m "test(tui): integration tests for RTL markdown prose vs LTR code

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Real-app verification, menu/command audit, memory update

**Files:**
- Modify: `/home/abotrf/.claude/projects/-home-abotrf-Desktop-opencode/memory/arabcode-rtl-display.md`

- [ ] **Step 1: Real-app verification (tmux char-grid)**

```bash
cd /home/abotrf/Desktop/opencode
tmux kill-server 2>/dev/null; tmux new-session -d -s md -x 110 -y 30 'bun dev'; sleep 13
```
Send a message that elicits an Arabic response, OR paste an assistant-style Arabic line into a session if reachable; then `tmux capture-pane -t md -p` and confirm the assistant Arabic prose renders shaped + reordered + right-aligned (presentation-form glyphs, correct top-down order). tmux does not apply BiDi, so the captured grid IS the app's true output. Kill the session after.

- [ ] **Step 2: Menu/command audit**

Grep for other Arabic text that may bypass the transform (like Box titles/placeholder did earlier). Check select-list items, command palette entries, status/footer text: `grep -rn "drawText\|StyledText\|setStyledText\|content=" packages/tui/src/ui/dialog-select.tsx` and confirm dialog list items flow through `TextRenderable` (covered) or `<markdown>` (now covered) — NOT a native draw path. Report any newly-found bypass as a follow-up finding (do not fix here unless trivial and same-pattern).

- [ ] **Step 3: Update memory**

In `/home/abotrf/.claude/projects/-home-abotrf-Desktop-opencode/memory/arabcode-rtl-display.md`, add a bullet: markdown-prose RTL done via `code` hook — `CodeRenderable` (filetype "markdown") text sinks wrapped at construction; real code stays LTR; resize reuses phase-1 dispatch. Note the deferred conceal/line-source scroll mapping caveat.

- [ ] **Step 4: Final verification and report**

Run: `cd /home/abotrf/Desktop/opencode/packages/tui && bun test test/util/ && bun run typecheck`
Expected: rtl* PASS + clean. Report to the user (Arabic): assistant Arabic responses now render RTL correctly, code stays LTR, with the v1 caveats (conceal scroll mapping, tables audited separately).
