# Arabic-First Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keyboard-layout autocorrection (hybrid), bilingual Arabic slash-command aliases, and a default "Arabic chat / English files" output policy for the arabcode TUI.

**Architecture:** Three independent components. (1) A pure logic module `layout-fix.ts` (Arabic-101↔QWERTY maps, conservative gibberish detection, slash-command correction, prose scanning) wired into the prompt autocomplete (instant `/` fix) and prompt input (passive hint + Tab). (2) A `commands-ar.ts` alias table injected centrally in `useCommandSlashes()` (keymap.tsx) — the single source feeding `/` autocomplete. (3) A core-side system-prompt directive (`bilingual.ts`) appended in `session/prompt.ts`, gated by new `arabcode.bilingual` config + `ARABCODE_BILINGUAL` env.

**Tech Stack:** Bun + TypeScript, SolidJS TUI (@opentui), Effect (core), bun:test.

**Spec:** `docs/superpowers/specs/2026-07-10-arabic-first-bundle-design.md`

## Global Constraints

- Slash commands: **auto-correct instantly**; prose: **suggest only** (hint + Tab accept, Escape dismiss, Enter submits WITHOUT applying).
- Correction NEVER fires when the original input already matches a known command/alias prefix, and NEVER when the mapped result matches nothing.
- Autocomplete list shows **Arabic name as `display`** and the canonical English name inside `description` (dim); both spellings must remain typeable — the English canonical `/name` MUST be added to `aliases` when display becomes Arabic.
- Bilingual directive: Arabic conversation, English for EVERYTHING written into project files (code, comments, identifiers, commit messages, docs). Default ON; disabled via `{"arabcode":{"bilingual":false}}` or `ARABCODE_BILINGUAL=false`. Env var wins over config.
- Prose detection is conservative: latin candidates need length ≥ 4, vowel ratio < 0.15, all chars mappable, not in tech-exceptions; Arabic candidates need mapped result (length ≥ 3) present in the embedded common-English wordlist.
- Words containing digits or any of ``/ . _ - ` @ # \ :`` are never prose candidates.
- Do not modify `patches/@opentui%2Fcore@0.4.3.patch` or any `rtl*.ts` module. All existing `packages/tui/test/util/rtl*` tests and `bun run typecheck` must stay green.
- All new user-visible strings in Arabic (matching the fork's existing style); code comments in Arabic are OK in this repo (existing convention).
- Never `git add -A` / `git add .` — stage named files only.

---

### Task 1: `layout-fix.ts` core module (pure logic)

**Files:**
- Create: `packages/tui/src/util/layout-fix.ts`
- Test: `packages/tui/test/util/layout-fix.test.ts`

**Interfaces (Produces — later tasks rely on these exact signatures):**
```ts
export function mapEnToAr(text: string): string
export function mapArToEn(text: string): string
export function looksLikeArTypedAsEn(word: string): boolean
export function looksLikeEnTypedAsAr(word: string): boolean
export interface LayoutFix { fixed: string; direction: "en→ar" | "ar→en" }
export function fixWord(word: string): LayoutFix | undefined
export function fixSlashCommand(line: string, knownNames: readonly string[]): string | undefined
export interface ProseCandidate { word: string; fixed: string; start: number; end: number }
export function scanProse(text: string): ProseCandidate[]
export function applyProseFix(text: string, candidates: readonly ProseCandidate[]): string
```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/tui/test/util/layout-fix.test.ts
import { describe, expect, test } from "bun:test"
import {
  applyProseFix,
  fixSlashCommand,
  fixWord,
  looksLikeArTypedAsEn,
  looksLikeEnTypedAsAr,
  mapArToEn,
  mapEnToAr,
  scanProse,
} from "../../src/util/layout-fix"

describe("layout maps", () => {
  test("en→ar base layer", () => {
    expect(mapEnToAr("hgsghl")).toBe("السلام")
    expect(mapEnToAr("dkjv")).toBe("ينتر") // أحرف فردية
  })
  test("ar→en base layer", () => {
    expect(mapArToEn("السلام")).toBe("hgsghl")
    expect(mapArToEn("اثمح")).toBe("help")
  })
  test("لا ligature key: b ↔ لا", () => {
    expect(mapEnToAr("b")).toBe("لا")
    expect(mapArToEn("لا")).toBe("b")
    expect(mapArToEn("لازم")).toBe("b.l") // لا→b ثم ز→"." ثم م→l
  })
  test("hamza forms round-trip", () => {
    expect(mapEnToAr("H")).toBe("أ")
    expect(mapEnToAr("Y")).toBe("إ")
    expect(mapEnToAr("N")).toBe("آ")
    expect(mapArToEn("أهلا")).toBe("Hib") // أ→H ثم ه→i ثم لا→b
  })
  test("unmapped chars pass through", () => {
    expect(mapEnToAr("h1!")).toBe("ا1!")
  })
})

describe("detection", () => {
  test("vowel-poor latin gibberish detected", () => {
    expect(looksLikeArTypedAsEn("hgsghl")).toBe(true) // السلام
    expect(looksLikeArTypedAsEn("hgvshgm")).toBe(true) // الرسالة (بلا علّة)
  })
  test("real English words NOT detected", () => {
    expect(looksLikeArTypedAsEn("hello")).toBe(false) // علّة غنية
    expect(looksLikeArTypedAsEn("main")).toBe(false)
    expect(looksLikeArTypedAsEn("fix")).toBe(false) // طول < 4
  })
  test("tech exceptions NOT detected", () => {
    expect(looksLikeArTypedAsEn("html")).toBe(false)
    expect(looksLikeArTypedAsEn("http")).toBe(false)
    expect(looksLikeArTypedAsEn("https")).toBe(false)
    expect(looksLikeArTypedAsEn("pnpm")).toBe(false)
    expect(looksLikeArTypedAsEn("ctrl")).toBe(false)
  })
  test("arabic gibberish mapping to common English detected", () => {
    expect(looksLikeEnTypedAsAr("اثممخ")).toBe(true) // hello
    expect(looksLikeEnTypedAsAr("اثمح")).toBe(true) // help
  })
  test("real Arabic words NOT detected", () => {
    expect(looksLikeEnTypedAsAr("السلام")).toBe(false) // hgsghl ليست إنجليزية
    expect(looksLikeEnTypedAsAr("مرحبا")).toBe(false)
  })
  test("short words NOT detected", () => {
    expect(looksLikeEnTypedAsAr("هي")).toBe(false) // id — أقصر من 3
  })
})

describe("fixWord", () => {
  test("en→ar", () => {
    expect(fixWord("hgsghl")).toEqual({ fixed: "السلام", direction: "en→ar" })
  })
  test("ar→en", () => {
    expect(fixWord("اثممخ")).toEqual({ fixed: "hello", direction: "ar→en" })
  })
  test("clean words untouched", () => {
    expect(fixWord("hello")).toBeUndefined()
    expect(fixWord("مرحبا")).toBeUndefined()
    expect(fixWord("main.ts")).toBeUndefined()
  })
})

describe("fixSlashCommand", () => {
  const known = ["help", "new", "sessions", "مساعدة", "جديد", "جلسات"]
  test("arabic-typed english command corrected", () => {
    expect(fixSlashCommand("/اثمح", known)).toBe("/help") // help بتخطيط عربي
  })
  test("prefix is enough", () => {
    expect(fixSlashCommand("/اثم", known)).toBe("/hel")
  })
  test("english-typed arabic alias corrected", () => {
    // "جديد" على QWERTY: ج=[ د=] ي=d د=] → "[]d]"
    expect(fixSlashCommand("/[]d]", known)).toBe("/جديد")
  })
  test("valid input never touched", () => {
    expect(fixSlashCommand("/help", known)).toBeUndefined()
    expect(fixSlashCommand("/he", known)).toBeUndefined()
    expect(fixSlashCommand("/جديد", known)).toBeUndefined()
    expect(fixSlashCommand("/جد", known)).toBeUndefined()
  })
  test("no match after mapping → untouched", () => {
    expect(fixSlashCommand("/قذقذ", known)).toBeUndefined()
  })
  test("too short or has args → untouched", () => {
    expect(fixSlashCommand("/ا", known)).toBeUndefined()
    expect(fixSlashCommand("/اثمح arg", known)).toBeUndefined()
  })
})

describe("scanProse + applyProseFix", () => {
  test("detects candidates with correct offsets", () => {
    const text = "hgsghl عليكم"
    const c = scanProse(text)
    expect(c).toHaveLength(1)
    expect(c[0]).toEqual({ word: "hgsghl", fixed: "السلام", start: 0, end: 6 })
    expect(applyProseFix(text, c)).toBe("السلام عليكم")
  })
  test("code-like tokens skipped", () => {
    expect(scanProse("hgsghl src/main.ts v2 foo_bar")).toHaveLength(1)
  })
  test("multiple candidates applied right-to-left", () => {
    const text = "hgsghl ثم hgvshgm"
    const c = scanProse(text)
    expect(c).toHaveLength(2)
    expect(applyProseFix(text, c)).toBe("السلام ثم الرسالة")
  })
  test("clean text → empty", () => {
    expect(scanProse("fix the login bug")).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/test/util/layout-fix.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// packages/tui/src/util/layout-fix.ts
/**
 * مصحّح تخطيط لوحة المفاتيح (عربي 101 ↔ QWERTY).
 *
 * حالتان يوميّتان: كتابة أمر إنجليزي والتخطيط عربي (`/يثمح` → `/help`)،
 * وكتابة عربية والتخطيط إنجليزي (`hgsghl` → «السلام»).
 * الأوامر تُصحَّح فوراً (مجموعة معروفة، لا لبس)؛ النثر اقتراح فقط —
 * الكشف محافظ عمداً كي لا يقترح على إدخال مقصود.
 */

// الطبقة الأساسية لتخطيط عربي 101 القياسي (مفتاح QWERTY → حرف عربي)
const EN_TO_AR: Record<string, string> = {
  q: "ض", w: "ص", e: "ث", r: "ق", t: "ف", y: "غ", u: "ع", i: "ه", o: "خ", p: "ح",
  "[": "ج", "]": "د",
  a: "ش", s: "س", d: "ي", f: "ب", g: "ل", h: "ا", j: "ت", k: "ن", l: "م",
  ";": "ك", "'": "ط",
  z: "ئ", x: "ء", c: "ؤ", v: "ر", b: "لا", n: "ى", m: "ة",
  ",": "و", ".": "ز", "/": "ظ", "`": "ذ",
  // طبقة Shift الأساسية (الهمزات وعلامات الترقيم العربية)
  H: "أ", Y: "إ", N: "آ", T: "لإ", B: "لآ", G: "لأ", K: "،", "?": "؟", J: "ـ",
  Q: "َ", W: "ً", E: "ُ", R: "ٌ", A: "ِ", S: "ٍ", X: "ْ",
}

// المعكوس: حرف عربي → مفتاح. الثنائيات (لا لإ لأ لآ) تُعالَج قبل الأحادية.
const AR_TO_EN = new Map<string, string>()
for (const [en, ar] of Object.entries(EN_TO_AR)) {
  if (!AR_TO_EN.has(ar)) AR_TO_EN.set(ar, en)
}
const AR_DIGRAPHS = ["لا", "لإ", "لأ", "لآ"] as const

export function mapEnToAr(text: string): string {
  let out = ""
  for (const ch of text) out += EN_TO_AR[ch] ?? ch
  return out
}

export function mapArToEn(text: string): string {
  let out = ""
  let i = 0
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (AR_DIGRAPHS.includes(two as (typeof AR_DIGRAPHS)[number]) && AR_TO_EN.has(two)) {
      out += AR_TO_EN.get(two)!
      i += 2
      continue
    }
    const one = text[i]!
    out += AR_TO_EN.get(one) ?? one
    i += 1
  }
  return out
}

// كلمات تقنية شائعة عديمة/فقيرة العلّة — تُستثنى من كشف الهراء اللاتيني
const TECH_EXCEPTIONS = new Set([
  "html", "http", "https", "pnpm", "grpc", "ctrl", "glsl", "sftp", "smtp", "dhcp",
  "xhtml", "xml", "sql", "css", "ssh", "npm", "git", "tsx", "jsx", "zsh", "gcc",
  "wsl", "gpg", "svg", "png", "jpg", "pdf", "csv", "yml", "cfg", "src", "dst",
  "cmd", "std", "tmp", "dns", "tcp", "udp", "ftp", "php", "cpp", "js", "ts", "md", "sh",
])

const LATIN_VOWELS = /[aeiou]/gi

/** لاتيني يبدو عربياً مكتوباً بالتخطيط الخاطئ: طويل، قابل للتحويل كلياً، فقير العلّة. */
export function looksLikeArTypedAsEn(word: string): boolean {
  if (word.length < 4) return false
  if (TECH_EXCEPTIONS.has(word.toLowerCase())) return false
  for (const ch of word) if (!(ch in EN_TO_AR)) return false
  const vowels = word.match(LATIN_VOWELS)?.length ?? 0
  return vowels / word.length < 0.15
}

// أشيع الكلمات الإنجليزية في المحادثة التقنية — مرجع كشف العربي المقصود إنجليزياً
const COMMON_EN = new Set(
  (
    "the and for you that this with have not are was but all can what when how why who where will would could should " +
    "there here they them then than these those from into over under about after before again just only also very much " +
    "more most some any each other which their your yours mine ours been being does did doing done goes going gone want " +
    "wants wanted need needs needed make makes making made take takes taking took give gives giving gave find finds finding " +
    "found look looks looking looked show shows showing showed tell tells telling told help helps helping helped work works " +
    "working worked call calls calling called try tries trying tried ask asks asking asked feel feels feeling felt seem seems " +
    "let lets know knows knowing knew think thinks thinking thought good great nice fine okay yes yeah sure right wrong true " +
    "false new old big small long short high low fast slow easy hard open close start stop begin end first last next prev " +
    "previous please thanks thank sorry hello world time day week month year today tomorrow yesterday now later soon never " +
    "always often maybe perhaps really actually probably definitely exactly almost enough too many few little lot line lines " +
    "word words name names file files folder folders code codes test tests testing tested run runs running ran build builds " +
    "building built fix fixes fixing fixed bug bugs error errors issue issues problem problems change changes changing changed " +
    "update updates updating updated create creates creating created delete deletes deleting deleted remove removes removing " +
    "removed add adds adding added edit edits editing edited save saves saving saved load loads loading loaded read reads " +
    "reading write writes writing wrote check checks checking checked review reviews commit commits branch branches merge " +
    "merges push pushes pull pulls clone install installs installed import imports export exports function functions method " +
    "methods class classes type types value values string strings number numbers array arrays object objects list lists item " +
    "items key keys index while loop loops return returns returned print prints log logs debug server client request response " +
    "data database query queries user users login logout password page pages button click clicks input output result results " +
    "search searches replace replaces version versions project projects package packages module modules component components " +
    "style styles color colors text texts image images link links form forms table tables row rows column columns copy paste " +
    "cut undo redo select selects selected send sends sending sent receive receives received message messages email chat "
  )
    .trim()
    .split(/\s+/),
)

const ARABIC_WORD = /^[ء-ي]+$/

/** عربي يبدو إنجليزية مكتوبة بالتخطيط الخاطئ: تحويله كلمة إنجليزية شائعة. */
export function looksLikeEnTypedAsAr(word: string): boolean {
  if (!ARABIC_WORD.test(word)) return false
  const mapped = mapArToEn(word)
  if (mapped.length < 3) return false
  if (!/^[a-z]+$/i.test(mapped)) return false
  return COMMON_EN.has(mapped.toLowerCase())
}

export interface LayoutFix {
  fixed: string
  direction: "en→ar" | "ar→en"
}

export function fixWord(word: string): LayoutFix | undefined {
  if (looksLikeArTypedAsEn(word)) return { fixed: mapEnToAr(word), direction: "en→ar" }
  if (looksLikeEnTypedAsAr(word)) return { fixed: mapArToEn(word), direction: "ar→en" }
  return undefined
}

/**
 * تصحيح فوري لسطر أمر يبدأ بـ"/" (بلا وسائط بعد).
 * يعيد السطر المصحَّح، أو undefined إن كان الأصل سليماً أو التصحيح بلا مطابقة.
 */
export function fixSlashCommand(line: string, knownNames: readonly string[]): string | undefined {
  if (!/^\/\S+$/.test(line)) return undefined
  const body = line.slice(1)
  if (body.length < 2) return undefined
  // الأصل يطابق بادئةً → لا تصحيح (لا نفسد إدخالاً صحيحاً)
  if (knownNames.some((name) => name.startsWith(body))) return undefined
  const isArabic = ARABIC_WORD.test(body)
  const mapped = isArabic ? mapArToEn(body) : mapEnToAr(body)
  if (mapped === body) return undefined
  if (!knownNames.some((name) => name.startsWith(mapped))) return undefined
  return `/${mapped}`
}

export interface ProseCandidate {
  word: string
  fixed: string
  start: number
  end: number
}

// كلمة تشبه كوداً/مساراً/معرّفاً — لا تُفحص أبداً
const CODE_LIKE = /[0-9/._\-`@#\\:]/

/** يفحص كلمات النص المكتملة ويعيد المرشّحات للتصحيح مع مواضعها. */
export function scanProse(text: string): ProseCandidate[] {
  const out: ProseCandidate[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const word = m[0]
    if (CODE_LIKE.test(word)) continue
    const fix = fixWord(word)
    if (fix) out.push({ word, fixed: fix.fixed, start: m.index, end: m.index + word.length })
  }
  return out
}

/** يطبّق المرشّحات على النص (من النهاية للبداية حفاظاً على المواضع). */
export function applyProseFix(text: string, candidates: readonly ProseCandidate[]): string {
  let out = text
  for (const c of [...candidates].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, c.start) + c.fixed + out.slice(c.end)
  }
  return out
}
```

**Implementation notes for this step:**
- Verify every expected literal by hand against the map (e.g. `hgvshgm` ↔ `الرسالة`: ا=h ل=g ر=v س=s ا=h ل=g ة=m). If a test literal disagrees with the map, the MAP is authoritative (it is the standard Arabic-101 layout) — fix the test literal.
- `COMMON_EN` must contain every word used as a mapped-detection expectation in tests (`hello`, `help`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/test/util/layout-fix.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Typecheck and commit**

```bash
cd packages/tui && bun run typecheck && cd ../..
git add packages/tui/src/util/layout-fix.ts packages/tui/test/util/layout-fix.test.ts
git commit -m "feat(tui): keyboard layout-fix core (ar101<->qwerty maps, detection, slash/prose fixers)"
```

---

### Task 2: Arabic command aliases (`commands-ar.ts` + `useCommandSlashes`)

**Files:**
- Create: `packages/tui/src/util/commands-ar.ts`
- Modify: `packages/tui/src/keymap.tsx:270-290` (the `useCommandSlashes` memo)
- Test: `packages/tui/test/util/commands-ar.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
```ts
export const COMMAND_AR: Record<string, string>
export interface SlashEntryParts { display: string; description?: string; aliases?: string[] }
export function arabizeSlashEntry(slashName: string, desc: string | undefined, aliases: string[] | undefined): SlashEntryParts
```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/tui/test/util/commands-ar.test.ts
import { describe, expect, test } from "bun:test"
import { arabizeSlashEntry, COMMAND_AR } from "../../src/util/commands-ar"

describe("COMMAND_AR", () => {
  test("all values are non-empty Arabic and unique", () => {
    const seen = new Set<string>()
    for (const [en, ar] of Object.entries(COMMAND_AR)) {
      expect(en.length).toBeGreaterThan(0)
      expect(ar).toMatch(/^[ء-ي][ء-ي-]*$/)
      expect(seen.has(ar)).toBe(false)
      seen.add(ar)
    }
  })
  test("core commands covered", () => {
    for (const name of ["help", "new", "sessions", "models", "themes", "undo", "redo", "share", "compact", "export", "exit"]) {
      expect(COMMAND_AR[name]).toBeDefined()
    }
  })
})

describe("arabizeSlashEntry", () => {
  test("translated command: arabic display, english canonical in description + aliases", () => {
    const r = arabizeSlashEntry("new", "جلسة جديدة", undefined)
    expect(r.display).toBe("/جديد")
    expect(r.description).toBe("جلسة جديدة · /new")
    expect(r.aliases).toContain("/new")
    expect(r.aliases).toContain("/جديد")
  })
  test("existing aliases preserved", () => {
    const r = arabizeSlashEntry("help", "المساعدة", ["h"])
    expect(r.aliases).toEqual(expect.arrayContaining(["/h", "/help", "/مساعدة"]))
  })
  test("untranslated command unchanged", () => {
    const r = arabizeSlashEntry("somecustom", "desc", ["sc"])
    expect(r.display).toBe("/somecustom")
    expect(r.description).toBe("desc")
    expect(r.aliases).toEqual(["/sc"])
  })
  test("translated command with no desc: description is just the english canonical", () => {
    const r = arabizeSlashEntry("exit", undefined, undefined)
    expect(r.description).toBe("/exit")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/test/util/commands-ar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `commands-ar.ts`**

```ts
// packages/tui/src/util/commands-ar.ts
/**
 * الأسماء العربية لأوامر الشرطة المائلة — تُحقن مركزياً في useCommandSlashes.
 * كل أمر يعمل بالاسمين؛ القائمة تعرض العربي أولاً والإنجليزي القانوني خافتاً.
 */
export const COMMAND_AR: Record<string, string> = {
  help: "مساعدة",
  new: "جديد",
  sessions: "جلسات",
  models: "نماذج",
  agents: "وكلاء",
  themes: "سمات",
  connect: "اتصال",
  exit: "خروج",
  share: "مشاركة",
  unshare: "إلغاء-المشاركة",
  compact: "ضغط",
  undo: "تراجع",
  redo: "إعادة",
  thinking: "تفكير",
  export: "تصدير",
  editor: "محرر",
  skills: "مهارات",
  status: "حالة",
  mcps: "خوادم",
  variants: "تنويعات",
  workspaces: "مساحات",
  org: "منظمة",
  debug: "تنقيح",
  diff: "فروقات",
  move: "نقل",
  warp: "وورب",
}

export interface SlashEntryParts {
  display: string
  description?: string
  aliases?: string[]
}

/** يبني حقول مدخلة الإكمال لأمر: عربي المعروض إن وُجدت ترجمة، والاسمان قابلان للكتابة. */
export function arabizeSlashEntry(
  slashName: string,
  desc: string | undefined,
  aliases: string[] | undefined,
): SlashEntryParts {
  const base = (aliases ?? []).map((alias) => `/${alias}`)
  const ar = COMMAND_AR[slashName]
  if (!ar) {
    return {
      display: `/${slashName}`,
      description: desc,
      aliases: base.length > 0 ? base : undefined,
    }
  }
  return {
    display: `/${ar}`,
    description: desc ? `${desc} · /${slashName}` : `/${slashName}`,
    aliases: [...base, `/${slashName}`, `/${ar}`],
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/test/util/commands-ar.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into `useCommandSlashes` (keymap.tsx)**

Replace the object literal inside the `flatMap` of the `createMemo` in `useCommandSlashes()` (`packages/tui/src/keymap.tsx`, currently lines ~270-289) with:

```ts
  return createMemo<CommandSlashEntry[]>(() =>
    entries().flatMap((entry) => {
      const slashName = entry.command.slashName
      if (typeof slashName !== "string" || !slashName) return []
      const slashAliases = entry.command.slashAliases
      const desc =
        typeof entry.command.desc === "string"
          ? entry.command.desc
          : typeof entry.command.title === "string"
            ? entry.command.title
            : undefined
      const rawAliases = Array.isArray(slashAliases)
        ? slashAliases.filter((alias): alias is string => typeof alias === "string")
        : undefined
      // arabcode: الاسم العربي معروضاً + الإنجليزي القانوني قابلاً للكتابة والبحث
      const parts = arabizeSlashEntry(slashName, desc, rawAliases)
      return {
        display: parts.display,
        description: parts.description,
        aliases: parts.aliases,
        onSelect: () => keymap.dispatchCommand(entry.command.name),
      }
    }),
  )
```

Add the import at the top of `keymap.tsx`: `import { arabizeSlashEntry } from "./util/commands-ar"`.

- [ ] **Step 6: Run full TUI util tests + typecheck**

Run: `bun test packages/tui/test/util/ && (cd packages/tui && bun run typecheck)`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/util/commands-ar.ts packages/tui/test/util/commands-ar.test.ts packages/tui/src/keymap.tsx
git commit -m "feat(tui): bilingual Arabic slash-command aliases in autocomplete"
```

---

### Task 3: Instant `/` autocorrect in autocomplete

**Files:**
- Modify: `packages/tui/src/component/prompt/autocomplete.tsx` (the `onInput` handler registered via `props.ref({...})`, currently lines ~676-708)
- Test: extend `packages/tui/test/util/layout-fix.test.ts` (edge cases surfaced by real alias lists)

**Interfaces:**
- Consumes: `fixSlashCommand` (Task 1), the `slashes()` accessor (`useCommandSlashes()` entries, shape `{display, aliases?}` — Task 2 makes display Arabic and aliases bilingual), textarea ref API: `props.input().logicalCursor`, `.deleteRange(0,0,row,col)`, `.insertText(text)`, `.cursorOffset`.

- [ ] **Step 1: Add a `knownSlashNames` memo and correction call in `autocomplete.tsx`**

Inside the component (near the existing `commands` memo), add:

```ts
  // arabcode: كل الأسماء القابلة للكتابة (عربي + إنجليزي، بلا "/") لتصحيح التخطيط
  const knownSlashNames = createMemo(() => {
    const names: string[] = []
    for (const item of commands()) {
      names.push(item.display.trim().replace(/^\//, ""))
      for (const alias of item.aliases ?? []) names.push(alias.replace(/^\//, ""))
    }
    return names
  })

  // arabcode: تصحيح فوري لأمر مكتوب بالتخطيط الخاطئ (/يثمح → /help)
  function maybeFixSlashLayout(value: string): boolean {
    const fixed = fixSlashCommand(value, knownSlashNames())
    if (fixed === undefined) return false
    const cursor = props.input().logicalCursor
    props.input().deleteRange(0, 0, cursor.row, cursor.col)
    props.input().insertText(fixed)
    props.input().cursorOffset = Bun.stringWidth(fixed)
    props.setPrompt((draft) => {
      draft.input = props.input().plainText
    })
    return true
  }
```

Import at top: `import { fixSlashCommand } from "../../util/layout-fix"`.

- [ ] **Step 2: Call it from `onInput`**

In the `onInput(value)` handler, insert the correction check as the FIRST statement when the value is a sole-token slash line — both while the popup is open and when it would reopen:

```ts
      onInput(value) {
        // arabcode: تصحيح التخطيط قبل أي منطق إظهار/إخفاء
        if (/^\/\S+$/.test(value) && maybeFixSlashLayout(value)) return

        if (store.visible) {
          // ... (بقية المعالج الحالي دون تغيير)
```

Note: after the programmatic replacement, `onContentChange` fires again with the fixed text and re-enters `onInput`. No recursion risk: the corrected value prefix-matches a known name, so `fixSlashCommand` returns `undefined` (original-matches guard), `maybeFixSlashLayout` returns `false`, and the normal show/filter flow proceeds against the corrected value.

- [ ] **Step 3: Manual verification scenario (no automated UI test — logic is unit-tested in Task 1)**

Run: `bun test packages/tui/test/util/layout-fix.test.ts packages/tui/test/util/commands-ar.test.ts && (cd packages/tui && bun run typecheck)`
Expected: PASS. (Live check happens in Task 6.)

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/component/prompt/autocomplete.tsx
git commit -m "feat(tui): instant keyboard-layout autocorrect for slash commands"
```

---

### Task 4: Prose layout hint (suggest + Tab)

**Files:**
- Modify: `packages/tui/src/component/prompt/index.tsx` — hint state + `onContentChange` scan + `onKeyDown` Tab/Escape intercept + hint render above the input box (the `<box paddingLeft={2} ...>` wrapping the `<textarea>`, currently ~line 1361).
- Test: `packages/tui/test/util/layout-fix.test.ts` already covers `scanProse`/`applyProseFix`; this task adds only thin wiring.

**Interfaces:**
- Consumes: `scanProse`, `applyProseFix`, `ProseCandidate` (Task 1); textarea ref API as in Task 3.

- [ ] **Step 1: Add hint state and scanning**

In the prompt component (`packages/tui/src/component/prompt/index.tsx`), add near other signals:

```ts
  // arabcode: تلميح تصحيح التخطيط للنثر (اقتراح سلبي، Tab يقبل)
  const [layoutHint, setLayoutHint] = createSignal<ProseCandidate[]>([])
  const [layoutHintDismissed, setLayoutHintDismissed] = createSignal(false)
```

Imports: `import { applyProseFix, scanProse, type ProseCandidate } from "../../util/layout-fix"`.

In the existing `onContentChange` handler (after `auto()?.onInput(value)`), add:

```ts
                // arabcode: افحص النثر عند إتمام كلمة فقط (المسافة)، ولا تلميح فوق قائمة الإكمال
                if (value.length === 0) setLayoutHintDismissed(false)
                if (!layoutHintDismissed() && !value.startsWith("/") && !auto()?.visible && value.endsWith(" ")) {
                  setLayoutHint(scanProse(value))
                } else if (layoutHint().length > 0 && (auto()?.visible || value.length === 0)) {
                  setLayoutHint([])
                }
```

- [ ] **Step 2: Tab accepts, Escape dismisses**

Extend the existing `onKeyDown` handler on the `<textarea>`:

```ts
              onKeyDown={(e: { name?: string; preventDefault(): void }) => {
                if (props.disabled) {
                  e.preventDefault()
                  return
                }
                // arabcode: التلميح النشط يستهلك Tab (قبول) وEscape (رفض لهذا السطر)
                if (layoutHint().length > 0) {
                  if (e.name === "tab") {
                    e.preventDefault()
                    const fixed = applyProseFix(input.plainText, layoutHint())
                    const cursor = input.logicalCursor
                    input.deleteRange(0, 0, cursor.row, cursor.col)
                    input.insertText(fixed)
                    input.cursorOffset = Bun.stringWidth(fixed)
                    setLayoutHint([])
                    return
                  }
                  if (e.name === "escape") {
                    setLayoutHint([])
                    setLayoutHintDismissed(true)
                    return
                  }
                }
              }}
```

**Note:** the exact key-event field (`name` vs `key`) must match what `@opentui` passes to `onKeyDown` — check a nearby usage in the repo (e.g. search `onKeyDown` handlers reading key names under `packages/tui/src/`) and use the same field. `e.preventDefault()` on tab must stop the global `agent_cycle` binding; verify by the live check. If `onKeyDown` cannot suppress the global binding, register a scoped `useBindings` command with a `when` condition of `layoutHint().length > 0` instead — whichever the codebase supports; keep the same behavior.

- [ ] **Step 3: Render the hint**

Directly ABOVE the `<box paddingLeft={2} paddingRight={2} paddingTop={1} ...>` that wraps the `<textarea>` (inside the bordered container), add:

```tsx
            <Show when={layoutHint().length > 0}>
              <box paddingLeft={2} paddingRight={2} flexShrink={0} backgroundColor={theme.backgroundElement} width="100%">
                <text fg={theme.textMuted}>
                  {`هل تقصد: ${layoutHint()
                    .map((c) => c.fixed)
                    .join(" ")}؟ ‹Tab›`}
                </text>
              </box>
            </Show>
```

(`Show` is already imported in this file; if not, add it to the `solid-js` import.)

- [ ] **Step 4: Typecheck + full util tests**

Run: `(cd packages/tui && bun run typecheck) && bun test packages/tui/test/util/`
Expected: PASS. RTL tests must be untouched and green.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/component/prompt/index.tsx
git commit -m "feat(tui): passive prose layout-fix hint with Tab accept"
```

---

### Task 5: Bilingual output mode (core)

**Files:**
- Create: `packages/opencode/src/session/bilingual.ts`
- Modify: `packages/core/src/config.ts:96-107` (add `arabcode` key to `Config.Info`)
- Modify: `packages/opencode/src/session/prompt.ts:1264-1271` (append directive to `system`)
- Test: `packages/opencode/test/session/bilingual.test.ts`

**Interfaces:**
- Produces:
```ts
export const BILINGUAL_PROMPT: string
export function bilingualEnabled(cfg: { arabcode?: { bilingual?: boolean } } | undefined): boolean
```

- [ ] **Step 1: Write the failing tests**

```ts
// packages/opencode/test/session/bilingual.test.ts
import { afterEach, describe, expect, test } from "bun:test"
import { BILINGUAL_PROMPT, bilingualEnabled } from "../../src/session/bilingual"

const ENV = "ARABCODE_BILINGUAL"

describe("bilingualEnabled", () => {
  afterEach(() => {
    delete process.env[ENV]
  })
  test("default is ON", () => {
    expect(bilingualEnabled(undefined)).toBe(true)
    expect(bilingualEnabled({})).toBe(true)
    expect(bilingualEnabled({ arabcode: {} })).toBe(true)
  })
  test("config can disable", () => {
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(false)
    expect(bilingualEnabled({ arabcode: { bilingual: true } })).toBe(true)
  })
  test("env wins over config", () => {
    process.env[ENV] = "false"
    expect(bilingualEnabled({ arabcode: { bilingual: true } })).toBe(false)
    process.env[ENV] = "true"
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(true)
    process.env[ENV] = "0"
    expect(bilingualEnabled(undefined)).toBe(false)
    process.env[ENV] = "1"
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(true)
  })
})

describe("BILINGUAL_PROMPT", () => {
  test("covers the language boundary", () => {
    expect(BILINGUAL_PROMPT).toContain("Arabic")
    expect(BILINGUAL_PROMPT).toContain("English")
    expect(BILINGUAL_PROMPT).toContain("commit")
    expect(BILINGUAL_PROMPT).toContain("comments")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/opencode/test/session/bilingual.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `bilingual.ts`**

```ts
// packages/opencode/src/session/bilingual.ts
/**
 * سياسة اللغة الافتراضية في arabcode: الحوار عربي، محتوى الملفات إنجليزي.
 * التوجيه بالإنجليزية لأنها الأوثق التزاماً لدى النماذج؛ الناتج السلوكي عربي.
 */
export const BILINGUAL_PROMPT = `<arabcode_language_policy>
Address the user in Arabic: explanations, summaries, questions, and progress notes.
Everything written INTO project files stays in English: code, identifiers, comments,
commit messages, PR titles/descriptions, and documentation files. Technical terms may
remain in English inside Arabic prose. If the user consistently writes in a language
other than Arabic, mirror the user's language instead.
</arabcode_language_policy>`

/** الأولوية: متغيّر البيئة ARABCODE_BILINGUAL ثم الإعداد arabcode.bilingual ثم التفعيل الافتراضي. */
export function bilingualEnabled(cfg: { arabcode?: { bilingual?: boolean } } | undefined): boolean {
  const env = process.env["ARABCODE_BILINGUAL"]
  if (env !== undefined) return env === "true" || env === "1"
  return cfg?.arabcode?.bilingual !== false
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/opencode/test/session/bilingual.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the config key**

In `packages/core/src/config.ts`, inside `Config.Info`'s field list (after the `plugins` field, before `experimental`), add:

```ts
  arabcode: Schema.Struct({
    bilingual: Schema.Boolean.pipe(Schema.optional).annotate({
      description: "Arabic conversation / English file content output policy (default true)",
    }),
  })
    .pipe(Schema.optional)
    .annotate({
      description: "arabcode-specific behavior",
    }),
```

Follow the exact `Schema` idiom already used in the surrounding fields (check how nested structs like `compaction` are declared — if the codebase prefers a named `Schema.Class`, an inline `Schema.Struct` is still acceptable here since it's a single boolean; match whichever compiles cleanly with the project's `Schema` import).

- [ ] **Step 6: Inject into the system prompt assembly**

In `packages/opencode/src/session/prompt.ts`, right after the `system` array is built (currently lines 1264-1269, before `const format = ...`):

```ts
            // arabcode: سياسة اللغة — حوار عربي، ملفات إنجليزية (قابلة للتعطيل)
            const appConfig = yield* config.get()
            if (bilingualEnabled(appConfig)) system.push(BILINGUAL_PROMPT)
```

Import at top of the file: `import { BILINGUAL_PROMPT, bilingualEnabled } from "./bilingual"`.
The `config` service is already in scope in this function (`yield* config.get()` is used elsewhere in the same file at ~L522 and ~L1399 — confirm the service variable name used in THIS scope and reuse it; if a `cfg`/`config.get()` call already exists earlier in the same generator scope, reuse its result instead of fetching twice).

- [ ] **Step 7: Typecheck + tests + commit**

```bash
bun test packages/opencode/test/session/bilingual.test.ts
(cd packages/opencode && bun run typecheck)
(cd packages/core && bun run typecheck)
git add packages/opencode/src/session/bilingual.ts packages/opencode/test/session/bilingual.test.ts packages/core/src/config.ts packages/opencode/src/session/prompt.ts
git commit -m "feat(core): bilingual output policy — Arabic chat, English file content (default on)"
```

---

### Task 6: Full regression + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-arabic-first-bundle-design.md` (only if implementation deviated — record deviations)

- [ ] **Step 1: Full test sweep**

```bash
bun test packages/tui/test/util/
bun test packages/opencode/test/session/bilingual.test.ts
(cd packages/tui && bun run typecheck)
(cd packages/opencode && bun run typecheck)
(cd packages/core && bun run typecheck)
```
Expected: all new tests + all `rtl*` tests PASS; typecheck clean in all three packages. (Pre-existing translation-phase failures elsewhere in the TUI suite are known and out of scope.)

- [ ] **Step 2: Live verification checklist (run the app: `bun dev` from repo root)**

1. Switch keyboard to Arabic and type `/help` physically (produces `/اثمح`) → becomes `/help` instantly; autocomplete shows the corrected command.
2. Type `/help` → untouched. Type `/جديد` → matches; selecting it opens a new session. List shows Arabic names + dim `· /name`.
3. Type `hgsghl ` (with trailing space) → hint `هل تقصد: السلام؟ ‹Tab›` appears; Tab replaces the text; Escape dismisses; typing a normal English sentence shows no hint.
4. Send a message → assistant replies with Arabic prose; ask it to write a file/commit → file content and commit message in English.
5. `ARABCODE_BILINGUAL=false bun dev` → no Arabic policy (model default behavior).

Record outcomes; any failure loops back to the owning task.

- [ ] **Step 3: Commit any deviation notes**

```bash
git add docs/superpowers/specs/2026-07-10-arabic-first-bundle-design.md
git commit -m "docs: record arabic-first bundle implementation deviations" # فقط إن وُجدت انحرافات
```
