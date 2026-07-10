/**
 * ربط تحويل RTL بمسار رسم OpenTUI.
 *
 * الترقيع على @opentui/core (patches/@opentui%2Fcore@0.4.3.patch) يستدعي
 * `globalThis.__arabcodeRtl` من موضعين:
 *   - transform: عند دخول نص منسّق إلى TextRenderable (قبل setStyledText).
 *   - resize: عند معرفة العرض النهائي من تخطيط yoga.
 *
 * الاستراتيجية: النص المنطقي يُحوَّل بصرياً كاملاً عند الدخول، وعند معرفة
 * العرض يُعاد بناؤه: التفاف منطقي ثم إعادة ترتيب لكل سطر، مع تعطيل التفاف
 * OpenTUI الأصلي (wrapMode none) لأن التفاف نص بصري يعكس ترتيب قراءة الأسطر.
 * النص المنطقي الأصلي يُحفظ على المكوّن ويُعاد التحويل منه دائماً
 * (التحويل ليس idempotent).
 */
import { StyledText, type TextChunk } from "@opentui/core"
import { buildSelectionMap, hasRtl, rtlMode, sliceLogicalBySelection, transformChunks, visualLine, type SelectionMap } from "./rtl"
import { editorHooks } from "./rtl-editor"

interface RtlTextRenderable {
  constructor: { name: string }
  width: number
  _wrapMode: "none" | "char" | "word"
  textBuffer: { setStyledText(st: StyledText): void }
  textBufferView: { setWrapMode(mode: "none" | "char" | "word"): void }
  /** النص المنطقي الأصلي — مصدر الحقيقة لكل إعادة تحويل */
  __rtlSource?: StyledText
  /** آخر عرض جرى الالتفاف عليه */
  __rtlWidth?: number
  /** هل عُطّل الالتفاف الأصلي */
  __rtlWrapped?: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var __arabcodeRtl:
    | {
        transform(st: StyledText, renderable: unknown): StyledText | undefined
        resize(renderable: unknown, width: number): void
        /** سطر واحد خام (عناوين الصناديق وما شابه) — بذاكرة تخزين */
        line(text: string): string
        /** قائمة chunks منسّقة (placeholder المحرر وما شابه) */
        chunks<T extends { text: string }>(chunks: readonly T[]): T[]
        /** خطافات محرر الإدخال (المرحلة 2): مرآة العرض + خريطة المؤشر + قلب الأسهم */
        editor: {
          draw(renderable: unknown, frameBuffer: unknown): boolean
          cursorCol(renderable: unknown, cursor: { visualRow: number; visualCol: number }): number | undefined
          swapArrows(renderable: unknown): boolean
          dispose(renderable: unknown): void
        }
        /** غلاف نثر Markdown (CodeRenderable filetype markdown): تشكيل + إعادة ترتيب عند الرسم */
        code(renderable: unknown): void
        /** غلاف getSelectedText: يعيد النص المنطقي لتحديد بصري (النسخ الصحيح) */
        selection(renderable: unknown): void
      }
    | undefined
}

function makePlain(text: string): TextChunk {
  return { __isChunk: true, text }
}

function plainText(st: StyledText): string {
  let out = ""
  for (const chunk of st.chunks) out += chunk.text
  return out
}

function rebuild(source: StyledText, width: number): StyledText {
  return new StyledText(transformChunks(source.chunks, { width: width > 0 ? width : undefined, makePlain }))
}

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

function transform(st: StyledText, renderable: unknown): StyledText | undefined {
  const r = renderable as RtlTextRenderable
  if (r?.constructor?.name !== "TextRenderable") return undefined
  const plain = plainText(st)
  if (!hasRtl(plain)) {
    // محتوى سابق كان عربياً وتبدّل: استعادة الالتفاف الأصلي
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

interface RtlCodeRenderable {
  constructor: { name: string }
  _filetype?: string
  width: number
  wrapMode: "none" | "char" | "word"
  textBuffer: { setStyledText(st: StyledText): void; setText(text: string): void }
  /** مُثبَّت الأغلفة */
  __rtlCode?: boolean
  /** آخر مصدر منطقي */
  __rtlCodeSource?: StyledText
  /** آخر عرض بُني عليه */
  __rtlCodeWidth?: number
  /** هل عُطّل الالتفاف */
  __rtlCodeWrapped?: boolean
  /** الالتفاف الأصلي قبل التعطيل — للاستعادة عند توقّف النشاط */
  __rtlCodeOrigWrap?: "none" | "char" | "word"
  /** مفتاح آخر تحويل (العرض + النص) — لتفادي إعادة التشكيل أثناء البثّ */
  __rtlCodeCacheKey?: string
  /** ناتج آخر تحويل مخزّن مؤقّتاً */
  __rtlCodeCacheOut?: StyledText
}

function codeStyled(r: RtlCodeRenderable, source: StyledText): StyledText {
  const width = r.width > 0 ? r.width : undefined
  const raw = source.chunks.map((c) => c.text).join("")
  const key = `${r.width} ${raw}`
  if (r.__rtlCodeCacheKey === key && r.__rtlCodeCacheOut) return r.__rtlCodeCacheOut
  const out = new StyledText(transformChunks(source.chunks, { width, makePlain }))
  r.__rtlCodeCacheKey = key
  r.__rtlCodeCacheOut = out
  r.__rtlCodeWidth = r.width
  return out
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
      if (r.__rtlCodeOrigWrap === undefined) r.__rtlCodeOrigWrap = r.wrapMode
      r.wrapMode = "none"
      r.__rtlCodeWrapped = true
    }
  }
  const restoreWrap = () => {
    if (r.__rtlCodeWrapped) {
      r.wrapMode = r.__rtlCodeOrigWrap ?? "word"
      r.__rtlCodeWrapped = false
    }
  }
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
  r.textBuffer.setText = (text: string) => {
    if (!active(text)) {
      r.__rtlCodeSource = undefined
      restoreWrap()
      updateSelectionModel(r, "", 0)
      return origText(text)
    }
    const st = new StyledText([makePlain(text)])
    r.__rtlCodeSource = st
    ensureNoWrap()
    updateSelectionModel(r, text, r.width)
    origStyled(codeStyled(r, st))
  }
}

function resize(renderable: unknown, width: number): void {
  const c = renderable as RtlCodeRenderable
  if (c?.__rtlCode) {
    if (c.__rtlCodeSource && width > 0 && width !== c.__rtlCodeWidth) {
      c.textBuffer.setStyledText(c.__rtlCodeSource) // يمرّ عبر الغلاف فيعيد البناء بالعرض الجديد
    }
    return
  }
  const r = renderable as RtlTextRenderable
  if (r?.constructor?.name !== "TextRenderable") return
  if (!r.__rtlSource || width <= 0 || width === r.__rtlWidth) return
  r.__rtlWidth = width
  if (!r.__rtlWrapped) {
    r.textBufferView.setWrapMode("none")
    r.__rtlWrapped = true
  }
  r.textBuffer.setStyledText(rebuild(r.__rtlSource, width))
  updateSelectionModel(r, plainText(r.__rtlSource), width)
}

// عناوين الصناديق تُعاد كل إطار — ذاكرة تخزين تجنّب إعادة التشكيل
const lineCache = new Map<string, string>()

function line(text: string): string {
  if (!hasRtl(text)) return text
  let visual = lineCache.get(text)
  if (visual === undefined) {
    visual = visualLine(text)
    if (lineCache.size > 500) lineCache.clear()
    lineCache.set(text, visual)
  }
  return visual
}

function chunks<T extends { text: string }>(source: readonly T[]): T[] {
  let raw = ""
  for (const chunk of source) raw += chunk.text
  if (!hasRtl(raw)) return source as T[]
  return transformChunks(source, { makePlain: (text) => ({ __isChunk: true, text }) as unknown as T })
}

/** يُستدعى مرة عند الإقلاع. لا يفعل شيئاً إلا في وضع `app`. */
export function installRtlHooks(): boolean {
  if (rtlMode() !== "app") return false
  globalThis.__arabcodeRtl = { transform, resize, line, chunks, editor: editorHooks, code: installCode, selection: installSelection }
  return true
}

/**
 * كتابة تسلسل تحكم عبر قناة مخرجات الـ renderer الأصلية (خيط Zig).
 * الكتابة عبر process.stdout تتسابق مع مخرجات الخيط الأصلي وقد تصل قبل
 * إعداد الطرفية (alt screen) فيضيع مفعول التسلسل — القناة الأصلية تضمن الترتيب.
 */
export function writeRendererEscape(renderer: unknown, sequence: string): void {
  const r = renderer as { writeOut?: (data: string) => void; isDestroyed?: boolean }
  if (typeof r?.writeOut !== "function" || r.isDestroyed) return
  r.writeOut(sequence)
}

export function uninstallRtlHooks(): void {
  globalThis.__arabcodeRtl = undefined
}
