# RTL Selection & Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** جعل تحديد النص العربي في arabcode يبقى مظلَّلاً حتى النسخ الصريح، وأن يخرج النص المنسوخ **منطقياً مرتّباً** لا بصرياً معكوساً.

**Architecture:** خريطة عمود-بصري→فهرس-منطقي تُبنى لكل عنصر عرض بنفس تمريرة تحويل RTL، ويغلّف خطاف `selection` دالة `getSelectedText()` على مستوى العنصر لِيَقصّ المصدر المنطقي وفق التحديد الانسيابي. الترقيع في باني `TextBufferRenderable` الأساسي يعمّ `TextRenderable` و`CodeRenderable` معاً. علم النسخ-عند-التحديد يُقلَب افتراضياً لِيَبقى التظليل.

**Tech Stack:** TypeScript, Bun test, SolidJS, `@opentui/core@0.4.3` (مُرقَّع عبر `bun patch`), `bidi-js`, `Intl.Segmenter`.

## Global Constraints

- وضع RTL الفعّال: `ARABCODE_RTL=app` (الافتراضي في الفرع). كل الخطافات تعمل فقط في وضع `app` (`rtlMode() === "app"`).
- الكود والـ diff (`CodeRenderable._filetype !== "markdown"`) يبقيان LTR — لا يُبنى لهما نموذج تحديد، فنسخهما خام = منطقي.
- لا تلمس ملفات المستخدم غير المُودَعة: `packages/tui/src/component/{dialog-model,logo,startup-loading,ornament}.tsx`, `src/logo.ts`, `routes/session/footer.tsx`, `ui/dialog-select.tsx`, `util/{presentation,arabic}.ts`, واختبارات arabic.
- بناء الخريطة يجب أن يستخدم **نفس العرض** الذي رُسم به التحويل (`transformChunks`)، وإلا انحرفت الأعمدة.
- الترقيع يمرّ عبر `patches/@opentui%2Fcore@0.4.3.patch` (لا تعديل مباشر دائم بلا `bun patch --commit`).
- كل الرسائل الظاهرة للمستخدم بالعربية (اتساقاً مع الفرع).

---

### Task 1: خريطة التحديد ودالة القصّ المنطقي (rtl.ts)

دوال نقية تعيد استخدام `shapeCells`/`reorderCells`/`wrapCells`/`cellsWidth` الموجودة. لا تعتمد على OpenTUI.

**Files:**
- Modify: `packages/tui/src/util/rtl.ts` (إضافة في نهاية الملف قبل أي تصدير مُجمَّع)
- Test: `packages/tui/test/util/rtl-map.test.ts` (إضافة `describe` جديد)

**Interfaces:**
- Consumes: `shapeCells`, `reorderCells`, `wrapCells`, `cellsWidth`, `hasRtl`, `segmenter` (داخلي في الوحدة), `RtlCell` — كلها موجودة في `rtl.ts`.
- Produces:
  - `export function isLamAlefForm(cp: number): boolean`
  - `export interface SelCell { start: number; width: number; gis: number[] }`
  - `export interface SelectionMap { graphemes: string[]; lines: SelCell[][] }`
  - `export interface LocalSelection { anchorX: number; anchorY: number; focusX: number; focusY: number; isActive?: boolean }`
  - `export function buildSelectionMap(source: string, width: number): SelectionMap`
  - `export function sliceLogicalBySelection(map: SelectionMap, sel: LocalSelection): string`

- [ ] **Step 1: اكتب الاختبارات الفاشلة**

في `packages/tui/test/util/rtl-map.test.ts`، عدّل سطر الاستيراد ليضيف الرموز الجديدة، وأضِف `describe` في نهاية الملف:

```ts
// حدّث الاستيراد أعلى الملف ليصبح:
import {
  visualLineMap,
  buildSelectionMap,
  sliceLogicalBySelection,
  isLamAlefForm,
} from "../../src/util/rtl"

describe("buildSelectionMap + sliceLogicalBySelection", () => {
  test("سطر عربي بحت: التقطيع يعيد المقطع المنطقي المتصل لا البصري", () => {
    const src = "مرحبا بالعالم"
    const map = buildSelectionMap(src, 40)
    // سطر بصري واحد
    expect(map.lines.length).toBe(1)
    // تحديد كامل السطر
    const line = map.lines[0]!
    const maxCol = Math.max(...line.map((c) => c.start + c.width - 1))
    const minCol = Math.min(...line.map((c) => c.start))
    const all = sliceLogicalBySelection(map, { anchorY: 0, anchorX: minCol, focusY: 0, focusX: maxCol })
    expect(all).toBe(src) // منطقي مرتّب، ليس معكوساً
  })

  test("تحديد جزئي داخل جملة عربية يعيد مقطعاً منطقياً متصلاً", () => {
    const src = "مرحبا بالعالم"
    const map = buildSelectionMap(src, 40)
    const line = map.lines[0]!
    // اختر الخلايا الخمس الأولى بصرياً (يمين السطر = بداية النص منطقياً)
    const cols = line.slice(0, 5)
    const lo = Math.min(...cols.map((c) => c.start))
    const hi = Math.max(...cols.map((c) => c.start + c.width - 1))
    const out = sliceLogicalBySelection(map, { anchorY: 0, anchorX: lo, focusY: 0, focusX: hi })
    // الناتج مقطع متصل من المصدر المنطقي
    expect(src.includes(out)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  test("مزيج عربي/لاتيني: تحديد كامل السطر يعيد الترتيب المنطقي مع بقاء اللاتيني في موضعه", () => {
    const src = "مرحبا React بالعالم"
    const map = buildSelectionMap(src, 40)
    const line = map.lines[0]!
    const lo = Math.min(...line.map((c) => c.start))
    const hi = Math.max(...line.map((c) => c.start + c.width - 1))
    const out = sliceLogicalBySelection(map, { anchorY: 0, anchorX: lo, focusY: 0, focusX: hi })
    expect(out).toBe(src)
  })

  test("لام-ألف: الخلية البصرية الواحدة تمثّل حرفين منطقيين", () => {
    // "لا" = لام + ألف → رباط بصري واحد
    const src = "لا"
    const map = buildSelectionMap(src, 40)
    const line = map.lines[0]!
    // خلية واحدة تحمل فهرسين
    const lig = line.find((c) => c.gis.length === 2)
    expect(lig).toBeDefined()
    const out = sliceLogicalBySelection(map, { anchorY: 0, anchorX: lig!.start, focusY: 0, focusX: lig!.start })
    expect(out).toBe("لا")
  })

  test("أسطر منطقية متعددة: التحديد العابر يعيد فواصل الأسطر", () => {
    const src = "سطر اول\nسطر ثاني"
    const map = buildSelectionMap(src, 40)
    expect(map.lines.length).toBe(2)
    const l0 = map.lines[0]!
    const l1 = map.lines[1]!
    const out = sliceLogicalBySelection(map, {
      anchorY: 0,
      anchorX: Math.min(...l0.map((c) => c.start)),
      focusY: 1,
      focusX: Math.max(...l1.map((c) => c.start + c.width - 1)),
    })
    expect(out).toBe(src)
  })

  test("isLamAlefForm يميّز نطاق FEF5..FEFC", () => {
    expect(isLamAlefForm(0xfef7)).toBe(true)
    expect(isLamAlefForm(0x0644)).toBe(false) // لام عادية
  })

  test("تحديد فارغ يعيد سلسلة فارغة", () => {
    const map = buildSelectionMap("مرحبا", 40)
    // صف خارج النطاق
    expect(sliceLogicalBySelection(map, { anchorY: 5, anchorX: 0, focusY: 5, focusX: 0 })).toBe("")
  })
})
```

- [ ] **Step 2: شغّل الاختبار للتأكد من فشله**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-map.test.ts`
Expected: FAIL — `buildSelectionMap is not a function` / `sliceLogicalBySelection is not exported`.

- [ ] **Step 3: نفّذ الدوال في rtl.ts**

أضِف في نهاية `packages/tui/src/util/rtl.ts` (قبل أي `export * as` تجميعي إن وُجد؛ وإلا في آخر الملف):

```ts
// ---------------------------------------------------------------------------
// خريطة التحديد (النسخ المنطقي من تحديد بصري)
// ---------------------------------------------------------------------------

/** أشكال لام-ألف التقديمية: خليتان منطقيتان في خلية بصرية واحدة. */
const LAM_ALEF_FORMS = new Set<number>([0xfef5, 0xfef6, 0xfef7, 0xfef8, 0xfef9, 0xfefa, 0xfefb, 0xfefc])
export function isLamAlefForm(cp: number): boolean {
  return LAM_ALEF_FORMS.has(cp)
}

export interface SelCell {
  /** عمود العرض الابتدائي في السطر البصري المرسوم */
  start: number
  /** عرض الخلية بالأعمدة */
  width: number
  /** فهارس الحروف (graphemes) في المصدر التي تمثّلها هذه الخلية */
  gis: number[]
}

export interface SelectionMap {
  /** حروف المصدر المنطقي بالترتيب (يشمل "\n" كعنصر) */
  graphemes: string[]
  /** لكل سطر بصري مرسوم: خلايا مرتّبة يسار→يمين */
  lines: SelCell[][]
}

export interface LocalSelection {
  anchorX: number
  anchorY: number
  focusX: number
  focusY: number
  isActive?: boolean
}

/**
 * يبني خريطة عمود-بصري→فهرس-منطقي مطابقة لِما يرسمه transformChunks
 * (تشكيل + التفاف منطقي + إعادة ترتيب + حشو يميني). العرض يجب أن يساوي
 * العرض المستخدم في الرسم.
 */
export function buildSelectionMap(source: string, width: number): SelectionMap {
  const graphemes = Array.from(segmenter.segment(source), (s) => s.segment)
  const lines: SelCell[][] = []
  let lineCells: RtlCell[] = []

  const flushLogical = () => {
    const joined = lineCells.map((c) => c.text).join("")
    const rtl = hasRtl(joined)
    const shaped = rtl ? shapeCells(lineCells) : lineCells
    const wrapped = width > 0 ? wrapCells(shaped, width) : [shaped]
    for (const wl of wrapped) {
      const visual = rtl ? reorderCells(wl) : wl
      const pad = rtl && width > 0 ? width - cellsWidth(wl) : 0
      let col = pad > 0 && visual.length > 0 ? pad : 0
      const cells: SelCell[] = []
      for (const cell of visual) {
        const w = Bun.stringWidth(cell.text)
        const base = typeof cell.ref === "number" ? cell.ref : -1
        const gis = base >= 0 && isLamAlefForm(cell.text.codePointAt(0)!) ? [base, base + 1] : [base]
        cells.push({ start: col, width: w, gis })
        col += w
      }
      lines.push(cells)
    }
  }

  let gi = 0
  for (const g of graphemes) {
    if (g === "\n") {
      flushLogical()
      lineCells = []
      gi++
      continue
    }
    lineCells.push({ text: g, ref: gi })
    gi++
  }
  flushLogical()
  return { graphemes, lines }
}

/**
 * يترجم تحديداً انسيابياً (إحداثيات بصرية محلية) إلى نص منطقي.
 * التحديد الانسيابي: من نقطة إلى نقطة عبر الأسطر (لا مستطيل).
 */
export function sliceLogicalBySelection(map: SelectionMap, sel: LocalSelection): string {
  let sy = sel.anchorY
  let sx = sel.anchorX
  let ey = sel.focusY
  let ex = sel.focusX
  if (sy > ey || (sy === ey && sx > ex)) {
    ;[sy, sx, ey, ex] = [ey, ex, sy, sx]
  }
  const selected = new Set<number>()
  for (let y = sy; y <= ey; y++) {
    const line = map.lines[y]
    if (!line) continue
    const colLo = y === sy ? sx : 0
    const colHi = y === ey ? ex : Number.POSITIVE_INFINITY
    for (const cell of line) {
      const cellLo = cell.start
      const cellHi = cell.start + cell.width - 1
      if (cellHi >= colLo && cellLo <= colHi) {
        for (const g of cell.gis) if (g >= 0) selected.add(g)
      }
    }
  }
  if (selected.size === 0) return ""
  const sorted = [...selected].sort((a, b) => a - b)
  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!
  let out = ""
  for (let i = min; i <= max; i++) {
    if (selected.has(i)) out += map.graphemes[i]!
    else if (map.graphemes[i] === "\n") out += "\n"
  }
  return out
}
```

- [ ] **Step 4: شغّل الاختبار للتأكد من نجاحه**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-map.test.ts`
Expected: PASS (كل الاختبارات، القديمة والجديدة).

- [ ] **Step 5: تحقّق من الأنواع**

Run: `cd /home/abotrf/Desktop/opencode && bun run --cwd packages/tui typecheck` (أو `bunx tsc --noEmit` حسب سكربت المشروع)
Expected: لا أخطاء.

- [ ] **Step 6: أودِع**

```bash
cd /home/abotrf/Desktop/opencode
git add packages/tui/src/util/rtl.ts packages/tui/test/util/rtl-map.test.ts
git commit -m "feat(tui): buildSelectionMap + sliceLogicalBySelection for RTL logical copy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: خطاف selection ونموذج التحديد (rtl-hook.ts)

يغلّف `getSelectedText()` على العنصر، ويبني نموذج التحديد في مساري `transform`/`resize`/`code` الحاليين.

**Files:**
- Modify: `packages/tui/src/util/rtl-hook.ts`
- Test: `packages/tui/test/util/rtl-selection.test.ts` (إنشاء)

**Interfaces:**
- Consumes: `buildSelectionMap`, `sliceLogicalBySelection`, `SelectionMap`, `hasRtl` من `rtl.ts` (Task 1).
- Produces:
  - إضافة `selection(renderable: unknown): void` إلى نوع `globalThis.__arabcodeRtl`.
  - تسجيل `selection: installSelection` في `installRtlHooks`.
  - سلوك: أي عنصر مُرقَّع يستدعي `getSelectedText()` يعيد النص المنطقي حين يكون `__rtlSelSource` عربياً وتحديدُه نشط.

- [ ] **Step 1: اكتب الاختبار الفاشل**

أنشئ `packages/tui/test/util/rtl-selection.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { installRtlHooks, uninstallRtlHooks } from "../../src/util/rtl-hook"
import { buildSelectionMap, setRtlMode, type SelectionMap } from "../../src/util/rtl"

beforeAll(() => {
  setRtlMode("app")
  installRtlHooks()
})
afterAll(() => {
  uninstallRtlHooks()
  setRtlMode("off")
})

type Sel = { anchorX: number; anchorY: number; focusX: number; focusY: number; isActive?: boolean }

/**
 * عنصر وهمي يحاكي TextBufferRenderable. الخطاف يقرأ __rtlSelSource/__rtlSelMap
 * (اللذين يبنيهما مسار التحويل في التطبيق الحقيقي)؛ نضبطهما هنا يدوياً.
 */
function fakeRenderable(orig: string, source?: string) {
  const map: SelectionMap | undefined = source ? buildSelectionMap(source, 40) : undefined
  return {
    width: 40,
    getSelectedText: () => orig, // الأصل يعيد النص البصري
    lastLocalSelection: null as null | Sel,
    __rtlSelSource: source,
    __rtlSelMap: map,
  }
}

/** أقصى/أدنى عمود يغطّي كامل السطر البصري الأول. */
function fullLineSel(map: SelectionMap): Sel {
  const line = map.lines[0]!
  return {
    anchorY: 0,
    anchorX: Math.min(...line.map((c) => c.start)),
    focusY: 0,
    focusX: Math.max(...line.map((c) => c.start + c.width - 1)),
    isActive: true,
  }
}

describe("selection hook", () => {
  test("يعيد النص المنطقي حين المصدر عربي والتحديد نشط", () => {
    const r = fakeRenderable("BIDI-VISUAL", "مرحبا بالعالم")
    globalThis.__arabcodeRtl!.selection!(r)
    r.lastLocalSelection = fullLineSel(r.__rtlSelMap!)
    expect(r.getSelectedText()).toBe("مرحبا بالعالم")
  })

  test("يعيد الأصل حين لا مصدر عربي (كود/لاتيني)", () => {
    const r = fakeRenderable("plain code text") // بلا مصدر عربي → لا نموذج
    globalThis.__arabcodeRtl!.selection!(r)
    r.lastLocalSelection = { anchorY: 0, anchorX: 0, focusY: 0, focusX: 5, isActive: true }
    expect(r.getSelectedText()).toBe("plain code text")
  })

  test("يعيد الأصل حين لا تحديد نشط", () => {
    const r = fakeRenderable("BIDI-VISUAL", "مرحبا بالعالم")
    globalThis.__arabcodeRtl!.selection!(r)
    r.lastLocalSelection = null
    expect(r.getSelectedText()).toBe("BIDI-VISUAL")
  })

  test("لا يغلّف مرتين", () => {
    const r = fakeRenderable("x")
    globalThis.__arabcodeRtl!.selection!(r)
    const wrapped = r.getSelectedText
    globalThis.__arabcodeRtl!.selection!(r)
    expect(r.getSelectedText).toBe(wrapped)
  })
})
```

- [ ] **Step 2: شغّل الاختبار للتأكد من فشله**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-selection.test.ts`
Expected: FAIL — `globalThis.__arabcodeRtl.selection is not a function`.

- [ ] **Step 3: أضِف الخطاف والنموذج في rtl-hook.ts**

في `packages/tui/src/util/rtl-hook.ts`:

(أ) حدّث الاستيراد من `./rtl`:
```ts
import { buildSelectionMap, hasRtl, rtlMode, sliceLogicalBySelection, transformChunks, visualLine, type SelectionMap } from "./rtl"
```

(ب) أضِف إلى نوع `globalThis.__arabcodeRtl` (داخل `declare global`) بعد سطر `code(renderable: unknown): void`:
```ts
        /** غلاف getSelectedText: يعيد النص المنطقي لتحديد بصري (النسخ الصحيح) */
        selection(renderable: unknown): void
```

(ج) أضِف الواجهة والدوال (قرب أعلى الملف بعد الاستيرادات، أو قبل `installRtlHooks`):
```ts
interface RtlSelectable {
  getSelectedText?: () => string
  lastLocalSelection?: { anchorX: number; anchorY: number; focusX: number; focusY: number; isActive?: boolean } | null
  /** مُثبَّت غلاف getSelectedText */
  __rtlSel?: boolean
  /** النص المنطقي المصدر لهذا العنصر */
  __rtlSelSource?: string
  /** خريطة عمود-بصري→فهرس-منطقي */
  __rtlSelMap?: SelectionMap
}

/** يبني/يمسح نموذج التحديد على العنصر بنفس عرض الرسم. */
function updateSelectionModel(renderable: unknown, source: string, width: number): void {
  const r = renderable as RtlSelectable
  if (!hasRtl(source)) {
    r.__rtlSelSource = undefined
    r.__rtlSelMap = undefined
    return
  }
  r.__rtlSelSource = source
  r.__rtlSelMap = buildSelectionMap(source, width > 0 ? width : 0)
}

/** يغلّف getSelectedText مرة واحدة؛ يعيد النص المنطقي حين توفّر نموذج وتحديد نشط. */
function installSelection(renderable: unknown): void {
  const r = renderable as RtlSelectable
  if (r.__rtlSel || typeof r.getSelectedText !== "function") return
  r.__rtlSel = true
  const orig = r.getSelectedText.bind(r)
  r.getSelectedText = () => {
    const source = r.__rtlSelSource
    const map = r.__rtlSelMap
    const sel = r.lastLocalSelection
    if (!source || !map || !sel || sel.isActive === false) return orig()
    const text = sliceLogicalBySelection(map, sel)
    return text || orig()
  }
}
```

(د) ابْنِ النموذج في مسار `transform()`: عدّل الدالة لتضبط النموذج في كلا الفرعين:
```ts
function transform(st: StyledText, renderable: unknown): StyledText | undefined {
  const r = renderable as RtlTextRenderable
  if (r?.constructor?.name !== "TextRenderable") return undefined
  const plain = plainText(st)
  if (!hasRtl(plain)) {
    if (r.__rtlWrapped) {
      r.textBufferView.setWrapMode(r._wrapMode)
      r.__rtlWrapped = false
    }
    r.__rtlSource = undefined
    updateSelectionModel(r, plain, 0) // يمسح النموذج
    return undefined
  }
  r.__rtlSource = st
  const width = r.__rtlWidth && r.__rtlWidth > 0 ? r.__rtlWidth : r.width > 0 ? r.width : 0
  if (width > 0 && !r.__rtlWrapped) {
    r.textBufferView.setWrapMode("none")
    r.__rtlWrapped = true
  }
  updateSelectionModel(r, plain, width)
  return rebuild(st, width)
}
```

(هـ) أعِد بناء النموذج في `resize()` لِـ TextRenderable (بعد سطر `r.textBuffer.setStyledText(rebuild(r.__rtlSource, width))`):
```ts
  r.textBuffer.setStyledText(rebuild(r.__rtlSource, width))
  updateSelectionModel(r, plainText(r.__rtlSource), width)
```

(و) ابْنِ النموذج في مسار `code`: داخل `installCode`، في فرعَي التفعيل لكل من `setStyledText` و`setText` (بعد `ensureNoWrap()` وقبل/بعد `origStyled(codeStyled(r, st))`) أضِف `updateSelectionModel(r, raw, r.width)`؛ وفي فرعَي عدم التفعيل أضِف `updateSelectionModel(r, "", 0)` للمسح. مثال للفرع `setStyledText`:
```ts
  r.textBuffer.setStyledText = (st: StyledText) => {
    const raw = st.chunks.map((c) => c.text).join("")
    if (!active(raw)) {
      r.__rtlCodeSource = undefined
      restoreWrap()
      updateSelectionModel(r, "", 0)
      return origStyled(st)
    }
    r.__rtlCodeSource = st
    ensureNoWrap()
    updateSelectionModel(r, raw, r.width)
    origStyled(codeStyled(r, st))
  }
```
وبالمثل داخل `setText` (استخدم `text` كـ `raw`).

ملاحظة: `RtlCodeRenderable` و`RtlSelectable` حقول مختلفة على نفس الكائن — لا تعارض؛ الحقول `__rtlSel*` منفصلة عن `__rtlCode*`.

(ز) سجّل الخطاف في `installRtlHooks`:
```ts
  globalThis.__arabcodeRtl = { transform, resize, line, chunks, editor: editorHooks, code: installCode, selection: installSelection }
```

- [ ] **Step 4: شغّل الاختبار للتأكد من نجاحه**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-selection.test.ts`
Expected: PASS.

- [ ] **Step 5: شغّل كل اختبارات RTL + الأنواع**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl*.test.* && bun run --cwd packages/tui typecheck`
Expected: كل الاختبارات تمر؛ لا أخطاء أنواع.

- [ ] **Step 6: أودِع**

```bash
cd /home/abotrf/Desktop/opencode
git add packages/tui/src/util/rtl-hook.ts packages/tui/test/util/rtl-selection.test.ts
git commit -m "feat(tui): selection hook returns logical text from visual selection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ترقيع باني TextBufferRenderable + اختبار تكامل

سطر واحد في الباني الأساسي يعمّ `TextRenderable` و`CodeRenderable`.

**Files:**
- Modify (عبر `bun patch`): `node_modules/@opentui/core/index-xt9f071j.js` (باني `TextBufferRenderable`, نهاية الباني قرب السطر 2799)
- Modify: `patches/@opentui%2Fcore@0.4.3.patch` (يُعاد توليده تلقائياً بـ `bun patch --commit`)
- Test: `packages/tui/test/util/rtl-render.test.tsx` (إضافة اختبار تكامل)

**Interfaces:**
- Consumes: `globalThis.__arabcodeRtl.selection` (Task 2).
- Produces: كل `TextRenderable`/`CodeRenderable` جديد يُغلَّف `getSelectedText` عند الإنشاء.

- [ ] **Step 1: اكتب اختبار التكامل الفاشل**

في `packages/tui/test/util/rtl-render.test.tsx` أضِف (استخدم `testRender` و`renderOnce` كبقية الملف):

```ts
test("selection copy returns logical Arabic from a rendered text renderable", async () => {
  let ref: any
  const app = await testRender(() => <text ref={(r: any) => (ref = r)}>مرحبا بالعالم</text>)
  try {
    await app.renderOnce()
    // العنصر مُغلَّف getSelectedText عبر خطاف selection في الباني
    expect(ref.__rtlSel).toBe(true)
    expect(ref.__rtlSelSource).toBe("مرحبا بالعالم")
    const line = ref.__rtlSelMap.lines[0]
    ref.lastLocalSelection = {
      anchorY: 0,
      anchorX: Math.min(...line.map((c: any) => c.start)),
      focusY: 0,
      focusX: Math.max(...line.map((c: any) => c.start + c.width - 1)),
      isActive: true,
    }
    expect(ref.getSelectedText()).toBe("مرحبا بالعالم")
  } finally {
    app.destroy?.()
  }
})
```

- [ ] **Step 2: شغّل الاختبار للتأكد من فشله**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-render.test.tsx -t "selection copy returns logical"`
Expected: FAIL — `ref.__rtlSel` غير معرّف (الباني لم يُرقَّع بعد).

- [ ] **Step 3: افتح جلسة ترقيع**

Run: `cd /home/abotrf/Desktop/opencode && bun patch @opentui/core@0.4.3`
Expected: يطبع مسار نسخة قابلة للتحرير في `node_modules/@opentui/core` (الترقيع الحالي مُطبَّق مسبقاً).

- [ ] **Step 4: أدخِل استدعاء الخطاف في باني TextBufferRenderable**

في `node_modules/@opentui/core/index-xt9f071j.js`، باني `TextBufferRenderable` ينتهي بـ:
```js
    this.textBufferView.setTruncate(this._truncate);
    this.updateTextInfo();
  }
```
عدّله بإضافة سطر قبل `this.updateTextInfo();`:
```js
    this.textBufferView.setTruncate(this._truncate);
    globalThis.__arabcodeRtl?.selection?.(this);
    this.updateTextInfo();
  }
```
(استخدم أداة التحرير للاستبدال الدقيق لهذا المقطع الفريد.)

- [ ] **Step 5: ثبّت الترقيع**

Run: `cd /home/abotrf/Desktop/opencode && bun patch --commit <المسار المطبوع في الخطوة 3>`
Expected: يُحدَّث `patches/@opentui%2Fcore@0.4.3.patch`. تأكّد بأن الملف يحوي علامة `selection?.(this)` الجديدة إضافةً للعلامات الست القائمة (transform/resize/line/chunks/editor/code):
Run: `grep -c "arabcodeRtl" patches/@opentui%2Fcore@0.4.3.patch` (يجب أن يزيد بمقدار 1 عن السابق).

- [ ] **Step 6: شغّل اختبار التكامل للتأكد من نجاحه**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/rtl-render.test.tsx`
Expected: PASS (كل اختبارات الملف).

- [ ] **Step 7: عدم انحدار شامل + أنواع**

Run: `cd /home/abotrf/Desktop/opencode && bun test packages/tui/test/util/ && bun run --cwd packages/tui typecheck`
Expected: لا انحدار في اختبارات RTL؛ لا أخطاء أنواع. (فشل ~36 اختباراً سابقاً من مرحلة الترجمة غير متعلّق — تأكّد أنها هي نفسها لا اختبارات RTL.)

- [ ] **Step 8: أودِع**

```bash
cd /home/abotrf/Desktop/opencode
git add "patches/@opentui%2Fcore@0.4.3.patch" packages/tui/test/util/rtl-render.test.tsx
git commit -m "feat(tui): patch TextBufferRenderable ctor to install selection hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: قلب النسخ-عند-التحديد افتراضياً (إبقاء التحديد)

**Files:**
- Modify: `packages/core/src/flag/flag.ts:43-44`

**Interfaces:**
- Consumes: `Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` (يُقرأ في `app.tsx` و`ui/dialog.tsx`).
- Produces: افتراض جديد — التحديد يبقى، والنسخ صريح؛ يمكن إعادة تفعيل النسخ-عند-التحديد بـ `OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT=false`.

- [ ] **Step 1: عدّل الافتراض**

في `packages/core/src/flag/flag.ts`، السطر:
```ts
  OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
```
غيّره إلى (افتراض arabcode: تعطيل النسخ-عند-التحديد لِيَبقى التظليل):
```ts
  // arabcode: افتراضياً يبقى التحديد مظلَّلاً (لا نسخ فوري)، والنسخ صريح
  // (ctrl+y / زر يمين / ctrl+c). أعِد التفعيل بـ ...=false.
  OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? true : truthy("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
```

- [ ] **Step 2: تحقّق من عدم كسر البناء/الأنواع**

Run: `cd /home/abotrf/Desktop/opencode && bun run --cwd packages/core typecheck 2>/dev/null || bunx tsc --noEmit -p packages/core`
Expected: لا أخطاء (تغيير قيمة منطقية فقط).

- [ ] **Step 3: تحقّق يدوي منطقي**

اقرأ `packages/tui/src/app.tsx:1104-1116` وتأكّد أن المنطق الآن:
- `onMouseUp` لا ينسخ تلقائياً (لأن العلم صار `true` افتراضياً)،
- `onMouseDown` بزر يمين ينسخ التحديد،
- (خارج هذا الملف) `ctrl+y`/`ctrl+c` ينسخان عبر `Selection.handleSelectionKey`.
لا تعديل مطلوب هنا — المنطق موجود ويُفعَّل بقلب العلم.

- [ ] **Step 4: أودِع**

```bash
cd /home/abotrf/Desktop/opencode
git add packages/core/src/flag/flag.ts
git commit -m "feat(tui): default to persistent selection (explicit copy) in arabcode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: التحقّق الفعلي + التوثيق

**Files:**
- Modify: `/home/abotrf/.claude/projects/-home-abotrf-Desktop-opencode/memory/arabcode-rtl-display.md`
- (لا كود جديد)

**Interfaces:**
- Consumes: البناء الكامل من المهام 1–4.

- [ ] **Step 1: شغّل التطبيق وتحقّق فعلياً**

Run: `cd /home/abotrf/Desktop/opencode && bun dev` (أو أمر التشغيل المعتاد للفرع)، ثم:
1. أرسل/افتح جلسة فيها رد مساعد عربي.
2. حدّد بالفأرة جزءاً من النص العربي → **يجب أن يبقى التظليل** (لا يختفي فوراً).
3. اضغط `ctrl+y` (أو زر الفأرة الأيمن) → توست «تم النسخ».
4. الصق في محرّر خارجي → **يجب أن يخرج النص عربياً منطقياً متّصلاً** (لا معكوساً ولا بأشكال presentation منفصلة).
5. جرّب تحديداً جزئياً (كلمة/سطر) وتأكّد أن المقطع الملصوق يطابق ما اخترته منطقياً.

سجّل الملاحظات. إن كان `focusX` يبدو مزاحاً بعمود (آخر/أول حرف ناقص أو زائد)، فهذا حدّ inclusive/exclusive: عدّل `sliceLogicalBySelection` (المدى inclusive حالياً) بعد التأكد تجريبياً، وأعِد اختبار Task 1.

- [ ] **Step 2: تحقّق أن الكود يبقى LTR عند النسخ**

في التطبيق، حدّد جزءاً من كتلة كود (```js) وانسخه → يجب أن يخرج خاماً (LTR) بلا تحويل. (البوابة: `CodeRenderable._filetype !== "markdown"` لا يبني نموذج تحديد.)

- [ ] **Step 3: حدّث الذاكرة**

أضِف قسم «التحديد والنسخ» إلى `arabcode-rtl-display.md` يلخّص: خطاف `selection` يغلّف `getSelectedText` في باني `TextBufferRenderable`؛ `buildSelectionMap`/`sliceLogicalBySelection` في `rtl.ts`؛ خريطة عمود→فهرس عبر `ref`؛ لام-ألف = فهرسان؛ قلب افتراض `DISABLE_COPY_ON_SELECT`؛ حدّ الإدخال (محتوى النسخ منطقي أصلاً، مواءمة إحداثيات النقر متابعة موثّقة)؛ وحدّ العناصر المتعددة على نفس السطر البصري.

- [ ] **Step 4: أودِع (إن تغيّر شيء في الكود نتيجة التحقّق)**

```bash
cd /home/abotrf/Desktop/opencode
git add -A -- packages/tui packages/core   # لا تُضِف ملفات المستخدم غير المُودَعة المذكورة في القيود
git status   # تأكّد أن ملفات المستخدم (logo/dialog-model/... إلخ) لم تُدرَج
git commit -m "test(tui): verify RTL selection/copy end-to-end; document limits

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## ملخّص التبعيات

- Task 1 مستقل (دوال نقية).
- Task 2 يعتمد على Task 1.
- Task 3 يعتمد على Task 2.
- Task 4 مستقل (يمكن تنفيذه بالتوازي، لكن يُراجَع أخيراً).
- Task 5 يعتمد على 1–4.
