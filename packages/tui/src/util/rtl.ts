/**
 * دعم عرض النص من اليمين إلى اليسار (المرحلة 1: العرض فقط).
 *
 * يحوّل النص المنطقي (كما يُخزَّن) إلى نص بصري جاهز للرسم على شبكة خلايا
 * لا تعرف BiDi ولا تشكيل الحروف:
 *   1. تشكيل سياقي: حروف عربية أساسية → Arabic Presentation Forms (U+FE70–FEFC)
 *      حسب الموقع (منعزل/ابتدائي/وسطي/نهائي) مع دمج لام-ألف.
 *   2. إعادة ترتيب بصرية لكل سطر عبر خوارزمية Unicode BiDi (مكتبة bidi-js).
 *   3. التفاف اختياري بالكلمات حسب عرض الخلايا قبل إعادة الترتيب
 *      (قلب الفقرة كاملة ثم تركها تلتف يعكس ترتيب قراءة الأسطر).
 *
 * التحويل ليس idempotent: إعادة تمرير نص بصري تعيد قلبه. على طبقة الربط
 * الاحتفاظ بالنص المنطقي الأصلي وإعادة التحويل منه دائماً.
 */
/// <reference path="./bidi-js.d.ts" />
import bidiFactory from "bidi-js"

export type RtlMode = "app" | "terminal" | "off"

let forcedMode: RtlMode | undefined

export function setRtlMode(mode: RtlMode) {
  forcedMode = mode
}

export function rtlMode(): RtlMode {
  if (forcedMode) return forcedMode
  const env = process.env["ARABCODE_RTL"]
  if (env === "app" || env === "terminal" || env === "off") return env
  // Konsole يعيد الترتيب دائماً ولا يحترم BDSM — الترتيب المزدوج أسوأ من التفويض.
  // mlterm كذلك يطبّق BiDi كاملاً بنفسه.
  if (process.env["KONSOLE_VERSION"] || process.env["MLTERM"]) return "terminal"
  return "app"
}

/** تسلسلات BDSM/SCP (مواصفة BiDi للطرفيات): وضع explicit يمنع الطرفيات الداعمة (VTE) من إعادة الترتيب فوق ترتيبنا. */
export const BIDI_EXPLICIT_ENTER = "\x1b[8l\x1b[1 k"
export const BIDI_EXPLICIT_EXIT = "\x1b[8h\x1b[0 k"

const RTL_RE = /[֐-޿ࢠ-ࣿיִ-﷿ﹰ-ﻼ]/

export function hasRtl(text: string): boolean {
  return RTL_RE.test(text)
}

// ---------------------------------------------------------------------------
// جدول التشكيل: [منعزل، نهائي، ابتدائي، وسطي] — الابتدائي/الوسطي للحروف الواصلة فقط.
// ---------------------------------------------------------------------------

type Forms = [number, number, number?, number?]

const FORMS: Record<number, Forms> = {
  0x0621: [0xfe80, 0xfe80], // ء
  0x0622: [0xfe81, 0xfe82], // آ
  0x0623: [0xfe83, 0xfe84], // أ
  0x0624: [0xfe85, 0xfe86], // ؤ
  0x0625: [0xfe87, 0xfe88], // إ
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // ئ
  0x0627: [0xfe8d, 0xfe8e], // ا
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // ب
  0x0629: [0xfe93, 0xfe94], // ة
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // ت
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // ث
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // ج
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // ح
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // خ
  0x062f: [0xfea9, 0xfeaa], // د
  0x0630: [0xfeab, 0xfeac], // ذ
  0x0631: [0xfead, 0xfeae], // ر
  0x0632: [0xfeaf, 0xfeb0], // ز
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // س
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // ش
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // ص
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // ض
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // ط
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ظ
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // ع
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // غ
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // ف
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // ق
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // ك
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // ل
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // م
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // ن
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // ه
  0x0648: [0xfeed, 0xfeee], // و
  0x0649: [0xfeef, 0xfef0], // ى
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // ي
}

/** لام + ألف (بأنواعه) → ligature: [منعزل، نهائي] مفهرسة برمز الألف. */
const LAM = 0x0644
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
}

/** الحروف الواصلة من الجهتين (لها شكل ابتدائي/وسطي). */
function isDual(cp: number): boolean {
  const f = FORMS[cp]
  return (f !== undefined && f.length === 4) || cp === 0x0640 // ـ التطويل
}

/** حرف عربي قابل للاتصال بما قبله (واصل من جهة أو جهتين). */
function joinsPrev(cp: number): boolean {
  return FORMS[cp] !== undefined && cp !== 0x0621 ? true : cp === 0x0640
}

// ---------------------------------------------------------------------------
// خلايا: grapheme واحد + مرجع تنسيق معتم (يتبع الحرف أثناء الدمج وإعادة الترتيب)
// ---------------------------------------------------------------------------

export interface RtlCell {
  /** grapheme واحد (قد يضم حركات تابعة) */
  text: string
  /** مرجع معتم لتنسيق المصدر (chunk) يعاد تجميعه بعد التحويل */
  ref?: unknown
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

function toCells(text: string, ref?: unknown): RtlCell[] {
  const cells: RtlCell[] = []
  for (const s of segmenter.segment(text)) cells.push({ text: s.segment, ref })
  return cells
}

/** الرمز الأساس للـ grapheme (أول code point). */
function baseChar(cell: RtlCell): number {
  return cell.text.codePointAt(0)!
}

/** حركات الـ grapheme بعد الرمز الأساس. */
function marks(cell: RtlCell): string {
  const base = String.fromCodePoint(baseChar(cell))
  return cell.text.slice(base.length)
}

/**
 * تشكيل سياقي على الترتيب المنطقي. يدمج لام-ألف (خليتان → خلية واحدة
 * بعرض خلية واحدة — لذا يُقاس العرض بعد التشكيل).
 */
export function shapeCells(cells: RtlCell[]): RtlCell[] {
  const out: RtlCell[] = []
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!
    const cp = baseChar(cell)
    const forms = FORMS[cp]
    if (!forms) {
      out.push(cell)
      continue
    }
    const prev = out.length > 0 ? out[out.length - 1]! : undefined
    // الاتصال بما قبله: السابق (بعد تحويله) واصل من الجهتين
    const prevJoins = prev !== undefined && joinedForward.has(baseChar(prev))
    // لام-ألف
    if (cp === LAM && i + 1 < cells.length) {
      const next = cells[i + 1]!
      const lig = LAM_ALEF[baseChar(next)]
      if (lig) {
        out.push({ text: String.fromCodePoint(prevJoins ? lig[1] : lig[0]) + marks(cell) + marks(next), ref: cell.ref })
        i++
        continue
      }
    }
    // الاتصال بما بعده: هذا الحرف واصل من الجهتين والتالي يتصل بما قبله
    const next = i + 1 < cells.length ? cells[i + 1]! : undefined
    const nextJoins = isDual(cp) && next !== undefined && joinsPrev(baseChar(next))
    const form = prevJoins ? (nextJoins ? forms[3] : forms[1]) : nextJoins ? forms[2] : forms[0]
    const shaped = form ?? forms[prevJoins ? 1 : 0]
    out.push({ text: String.fromCodePoint(shaped!) + marks(cell), ref: cell.ref })
  }
  return out
}

/**
 * الأشكال البصرية التي تصل بما بعدها (ابتدائي/وسطي) + التطويل + الحروف
 * المنطقية الواصلة (لو مرّ نص غير مشكَّل).
 */
const joinedForward = new Set<number>([0x0640])
for (const [cp, f] of Object.entries(FORMS)) {
  if (f.length === 4) {
    joinedForward.add(Number(cp))
    joinedForward.add(f[2]!)
    joinedForward.add(f[3]!)
  }
}

// ---------------------------------------------------------------------------
// إعادة الترتيب البصرية (UAX#9 عبر bidi-js)
// ---------------------------------------------------------------------------

const bidi = bidiFactory()

/**
 * يعيد ترتيب خلايا سطر واحد (منطقي → بصري) مع مرايا الأقواس.
 * اتجاه الفقرة يُكتشف من أول حرف قوي (UAX#9 P2/P3).
 */
export function reorderCells(cells: RtlCell[]): RtlCell[] {
  if (cells.length === 0) return cells
  // خريطة: بداية كل خلية في النص المجمّع
  const starts: number[] = []
  let text = ""
  for (const cell of cells) {
    starts.push(text.length)
    text += cell.text
  }
  if (!hasRtl(text)) return cells
  const levels = bidi.getEmbeddingLevels(text)
  const out = cells.slice()

  // مرايا الأقواس ( ) [ ] { } < > داخل المقاطع المعكوسة
  const mirrored = bidi.getMirroredCharactersMap(text, levels.levels)
  if (mirrored.size > 0) {
    const byStart = new Map<number, number>()
    starts.forEach((s, i) => byStart.set(s, i))
    for (const [index, char] of mirrored) {
      const ci = byStart.get(index)
      if (ci !== undefined && out[ci]!.text.length === char.length) out[ci] = { ...out[ci]!, text: char }
    }
  }

  // قلب المقاطع (نطاقات inclusive بمؤشرات النص) على مستوى الخلايا الكاملة
  const segments = bidi.getReorderSegments(text, levels)
  for (const [start, end] of segments) {
    let lo = starts.findIndex((s) => s >= start)
    if (lo < 0) continue
    let hi = lo
    for (let i = lo; i < out.length && starts[i]! + out[i]!.text.length - 1 <= end; i++) hi = i
    for (let a = lo, b = hi; a < b; a++, b--) {
      const tmp = out[a]!
      out[a] = out[b]!
      out[b] = tmp
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// عرض الخلايا والالتفاف
// ---------------------------------------------------------------------------

function cellWidth(cell: RtlCell): number {
  return Bun.stringWidth(cell.text)
}

export function cellsWidth(cells: RtlCell[]): number {
  let w = 0
  for (const cell of cells) w += cellWidth(cell)
  return w
}

/** التفاف بالكلمات على الترتيب المنطقي (بعد التشكيل) حسب عرض الأعمدة. */
export function wrapCells(cells: RtlCell[], width: number): RtlCell[][] {
  if (width <= 0) return [cells]
  const lines: RtlCell[][] = []
  let line: RtlCell[] = []
  let lineWidth = 0
  let word: RtlCell[] = []
  let wordWidth = 0

  const flushWord = () => {
    if (word.length === 0) return
    if (lineWidth > 0 && lineWidth + wordWidth > width) {
      // إسقاط الفاصل المعلّق في نهاية السطر
      while (line.length > 0 && line[line.length - 1]!.text === " ") {
        lineWidth -= 1
        line.pop()
      }
      lines.push(line)
      line = []
      lineWidth = 0
    }
    // كلمة أطول من السطر: كسر إجباري
    while (wordWidth > width) {
      let w = lineWidth
      let cut = 0
      while (cut < word.length && w + cellWidth(word[cut]!) <= width) {
        w += cellWidth(word[cut]!)
        cut++
      }
      if (cut === 0) break
      lines.push([...line, ...word.slice(0, cut)])
      line = []
      lineWidth = 0
      word = word.slice(cut)
      wordWidth = cellsWidth(word)
    }
    line.push(...word)
    lineWidth += wordWidth
    word = []
    wordWidth = 0
  }

  for (const cell of cells) {
    if (cell.text === " ") {
      flushWord()
      line.push(cell)
      lineWidth += 1
      continue
    }
    word.push(cell)
    wordWidth += cellWidth(cell)
  }
  flushWord()
  lines.push(line)
  return lines
}

// ---------------------------------------------------------------------------
// الواجهة العليا
// ---------------------------------------------------------------------------

/** سطر واحد: تشكيل + إعادة ترتيب. للنصوص القصيرة غير الملتفة. */
export function visualLine(text: string): string {
  if (!hasRtl(text)) return text
  return reorderCells(shapeCells(toCells(text))).map((c) => c.text).join("")
}

/**
 * فقرة: تشكيل ثم التفاف منطقي بالكلمات ثم إعادة ترتيب كل سطر،
 * مع محاذاة يمينية (حشو يساري) حتى `width`.
 */
export function visualLines(text: string, width: number): string[] {
  const result: string[] = []
  for (const logical of text.split("\n")) {
    if (!hasRtl(logical)) {
      result.push(...(width > 0 ? wrapCells(toCells(logical), width).map((l) => l.map((c) => c.text).join("")) : [logical]))
      continue
    }
    for (const line of wrapCells(shapeCells(toCells(logical)), width)) {
      const visual = reorderCells(line).map((c) => c.text).join("")
      const pad = width - cellsWidth(line)
      result.push(pad > 0 ? " ".repeat(pad) + visual : visual)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// خريطة المؤشر (المرحلة 2: الإدخال)
// ---------------------------------------------------------------------------

export interface VisualLineMap {
  /** الخلايا بالترتيب البصري (مشكّلة) */
  cells: RtlCell[]
  /** نقطة الإدراج: الفهرس = عمود منطقي (0..العرض المنطقي)، القيمة = عمود بصري (قد تكون -1) */
  cursor: number[]
  /** قاعدة السطر RTL (مستوى الفقرة فردي — أول حرف قوي) */
  rtlBase: boolean
}

/**
 * تحويل سطر واحد إلى شكله البصري مع خريطة مواضع الإدراج للمؤشر.
 * الأعمدة المنطقية تُحسب على النص الخام (كما يعدّها محرر Zig — قبل التشكيل)،
 * والبصرية على النص المشكّل. نقطة الإدراج في مقطع RTL تجلس على الخلية
 * الفارغة يسار الحرف السابق (مرآة عرف المؤشر في LTR)، وتتبع مستوى الحرف
 * السابق عند الحدود المختلطة (UAX#9). القيم قد تكون -1 (السطر ممتلئ) —
 * القصّ على المستهلك.
 */
export function visualLineMap(text: string): VisualLineMap {
  const raw = toCells(text)
  const rawCols: number[] = []
  let logicalWidth = 0
  for (const cell of raw) {
    rawCols.push(logicalWidth)
    logicalWidth += cellWidth(cell)
  }
  rawCols.push(logicalWidth)
  if (!hasRtl(text)) {
    return { cells: raw, cursor: Array.from({ length: logicalWidth + 1 }, (_, i) => i), rtlBase: false }
  }
  // كل خلية خام تُعلَّم بفهرسها لتتبعها عبر دمج التشكيل وإعادة الترتيب
  const shaped = shapeCells(raw.map((cell, i) => ({ text: cell.text, ref: i })))
  const shapedStarts: number[] = []
  let shapedText = ""
  for (const cell of shaped) {
    shapedStarts.push(shapedText.length)
    shapedText += cell.text
  }
  const levels = bidi.getEmbeddingLevels(shapedText)
  const rtlBase = (levels.paragraphs[0]?.level ?? 0) % 2 === 1
  const visual = reorderCells(shaped)
  // العمود البصري لكل خلية مشكّلة، متعقبة بمرجعها (فهرس أول خلية خام فيها)
  const visualStart = new Map<number, number>()
  const visualEnd = new Map<number, number>()
  let vcol = 0
  for (const cell of visual) {
    visualStart.set(cell.ref as number, vcol)
    vcol += cellWidth(cell)
    visualEnd.set(cell.ref as number, vcol)
  }
  const cursor = new Array<number>(logicalWidth + 1).fill(NaN)
  cursor[0] = rtlBase ? vcol - 1 : 0
  for (let j = 0; j < shaped.length; j++) {
    const firstRaw = shaped[j]!.ref as number
    // نهاية النطاق الخام لهذه الخلية = بداية الخلية المشكّلة التالية (الدمج متجاور فقط)
    const nextRaw = j + 1 < shaped.length ? (shaped[j + 1]!.ref as number) : raw.length
    const level = levels.levels[shapedStarts[j]!]!
    cursor[rawCols[nextRaw]!] = level % 2 === 1 ? visualStart.get(firstRaw)! - 1 : visualEnd.get(firstRaw)!
  }
  // ملء الفجوات (داخل لام-ألف/الحروف العريضة) بقيمة أول حد تالٍ معرّف
  for (let i = logicalWidth - 1; i > 0; i--) {
    if (Number.isNaN(cursor[i])) cursor[i] = cursor[i + 1]!
  }
  return { cells: visual, cursor, rtlBase }
}

// ---------------------------------------------------------------------------
// تحويل النصوص المنسّقة (chunks) — تستخدمها طبقة الربط مع OpenTUI
// ---------------------------------------------------------------------------

export interface ChunkLike {
  text: string
}

const PAD = Symbol("rtl-pad")

/**
 * يحوّل قائمة chunks (سطر منطقي واحد أو أكثر مفصولة بـ \n) إلى الشكل البصري
 * مع الحفاظ على تنسيق كل حرف. مع `width`: التفاف + محاذاة يمينية.
 * حشو المحاذاة والفواصل تُبنى عبر `makePlain` (chunk بلا تنسيق خاص).
 */
export function transformChunks<T extends ChunkLike>(
  chunks: readonly T[],
  options: { width?: number; makePlain: (text: string) => T },
): T[] {
  // تفكيك إلى أسطر منطقية من خلايا تحمل مرجع الـ chunk
  const lines: RtlCell[][] = [[]]
  for (const chunk of chunks) {
    const parts = chunk.text.split("\n")
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) lines.push([])
      if (parts[i]!) lines[lines.length - 1]!.push(...toCells(parts[i]!, chunk))
    }
  }

  const width = options.width ?? 0
  const visualLines: RtlCell[][] = []
  for (const logical of lines) {
    const joined = logical.map((c) => c.text).join("")
    const rtl = hasRtl(joined)
    const shaped = rtl ? shapeCells(logical) : logical
    const wrapped = width > 0 ? wrapCells(shaped, width) : [shaped]
    for (const line of wrapped) {
      const visual = rtl ? reorderCells(line) : line
      const pad = rtl && width > 0 ? width - cellsWidth(line) : 0
      visualLines.push(pad > 0 && visual.length > 0 ? [{ text: " ".repeat(pad), ref: PAD }, ...visual] : visual)
    }
  }

  // إعادة تجميع الخلايا المتجاورة ذات المرجع نفسه إلى chunks
  const out: T[] = []
  const push = (text: string, ref: unknown) => {
    const last = out.length > 0 ? out[out.length - 1] : undefined
    if (last !== undefined && lastRefs.get(last) === ref) {
      last.text += text
      return
    }
    const chunk = ref !== PAD && ref !== undefined ? { ...(ref as T), text } : options.makePlain(text)
    lastRefs.set(chunk, ref)
    out.push(chunk)
  }
  const lastRefs = new Map<T, unknown>()
  visualLines.forEach((line, lineIndex) => {
    if (lineIndex > 0) push("\n", PAD)
    for (const cell of line) push(cell.text, cell.ref ?? PAD)
  })
  return out
}

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
  // الحروف التي تظهر فعلاً في أي خلية بصرية — لتمييز ما أسقطه الالتفاف/التخطيط.
  const rendered = new Set<number>()
  for (const line of map.lines) for (const cell of line) for (const g of cell.gis) if (g >= 0) rendered.add(g)
  let out = ""
  for (let i = min; i <= max; i++) {
    // يُضاف المحدَّد، وكذلك ما ليس مرسوماً أصلاً (فاصل سطر منطقي أو فراغ
    // أسقطه الالتفاف عند حدّ السطر) لأنه جزء من المصدر المنطقي المتصل.
    // أما الفراغ المرسوم غير المحدَّد فيُتجاهَل.
    if (selected.has(i) || !rendered.has(i)) out += map.graphemes[i]!
  }
  return out
}
