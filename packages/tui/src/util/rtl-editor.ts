/**
 * مرآة العرض لمحرر الإدخال (المرحلة 2 من RTL).
 *
 * مخزن Zig يبقى مصدر الحقيقة المنطقي (كتابة/حذف/تراجع/التفاف/قياس ارتفاع)،
 * وهذه الوحدة تعترض الرسم فقط: عند وجود نص RTL تُبنى نسخة بصرية (تشكيل +
 * إعادة ترتيب لكل سطر افتراضي بنفس نقاط التفاف Zig من getLineInfo) في
 * TextBuffer مرآتي يُرسم بدل drawEditorView، مع خريطة تعيد عمود المؤشر
 * المنطقي إلى موضعه البصري، وقلب أسهم يمين/يسار في الأسطر عربية القاعدة.
 */
import { StyledText, TextBuffer, TextBufferView, type TextChunk } from "@opentui/core"
import { cellsWidth, hasRtl, visualLineMap } from "./rtl"

/** ما يحتاجه الترقيع من EditBufferRenderable (بنية داخلية في @opentui/core) */
interface EditorLike {
  width: number
  height: number
  _screenX: number
  _screenY: number
  _textColor: unknown
  /** نصّ النائب المنطقي (TextareaRenderable) — غير معرّف على المحرّرات الأخرى */
  _placeholder?: string | null
  /** لون النائب */
  _placeholderColor?: unknown
  _ctx: { widthMethod: "wcwidth" | "unicode" }
  editBuffer: { getText(): string }
  editorView: {
    getViewport(): { offsetY: number }
    getLineInfo(): { lineStartCols: number[]; lineWidthCols: number[] }
    getVisualCursor(): { visualRow: number; visualCol: number }
  }
}

interface MirrorLine {
  /** عمود منطقي (داخل السطر الافتراضي) → عمود بصري نهائي (بعد المحاذاة) */
  cursor: number[]
  rtlBase: boolean
}

interface Mirror {
  buffer: TextBuffer
  view: TextBufferView
  /** بصمة آخر بناء: إزاحة المنفذ + العرض + الارتفاع + النص */
  fingerprint: string
  /** هوية لون النص وقت آخر بناء (تغيّر الثيم يستدعي إعادة البناء) */
  color: unknown
  lines: MirrorLine[]
}

const mirrors = new WeakMap<object, Mirror>()

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

/**
 * تقطيع النص المنطقي إلى أسطر افتراضية بنفس حدود التفاف Zig من getLineInfo
 * (لا نلتف بأنفسنا — عدد الأسطر يطابق قياس الارتفاع الأصلي بالبناء).
 *
 * دلالات getLineInfo المرصودة تجريبياً:
 *   - محدودة بالمنفذ: تعيد الأسطر المرئية فقط (بعد التمرير)، لا المستند كله.
 *   - lineStartCols[v] = إزاحة عمودية تراكمية مطلقة في المستند كله حيث يبدأ
 *     السطر الافتراضي v (\n يُحسب عموداً واحداً، والمحرف العريض بعرضه — أعمدة
 *     لا فهارس محارف).
 * نمشي على graphemes المستند مرة واحدة متتبعين العمود التراكمي؛ لكل سطر
 * نتقدم حتى عموده الابتدائي ثم نجمع حتى استيفاء عرضه. الفجوات بين الأسطر
 * (مسافات التفاف مأكولة، فواصل \n) تُتخطى طبيعياً لأن كل سطر يُحدَّد ببدايته.
 */
export function sliceVirtualLines(
  text: string,
  info: { lineStartCols: number[]; lineWidthCols: number[] },
): string[] {
  const graphemes = [...segmenter.segment(text)].map((s) => s.segment)
  const out: string[] = []
  let idx = 0
  let col = 0
  for (let v = 0; v < info.lineWidthCols.length; v++) {
    // التقدم حتى عمود بداية السطر (تخطي الفجوة: \n أو مسافة التفاف مأكولة)
    while (idx < graphemes.length && col < info.lineStartCols[v]!) {
      col += graphemes[idx] === "\n" ? 1 : Bun.stringWidth(graphemes[idx]!)
      idx++
    }
    let width = 0
    let line = ""
    while (idx < graphemes.length && width < info.lineWidthCols[v]! && graphemes[idx] !== "\n") {
      const w = Bun.stringWidth(graphemes[idx]!)
      width += w
      col += w
      line += graphemes[idx]!
      idx++
    }
    out.push(line)
  }
  return out
}

function rebuild(r: EditorLike, mirror: Mirror, text: string): void {
  const height = Math.max(1, r.height)
  // getLineInfo محدودة بالمنفذ أصلاً (نافذة التمرير مطبّقة) — لا قصّ إضافي
  const linesText = sliceVirtualLines(text, r.editorView.getLineInfo())
  const lines: MirrorLine[] = []
  const rows: string[] = []
  for (const lineText of linesText) {
    const m = visualLineMap(lineText)
    const pad = m.rtlBase ? Math.max(0, r.width - cellsWidth(m.cells)) : 0
    rows.push(" ".repeat(pad) + m.cells.map((c) => c.text).join(""))
    lines.push({ cursor: m.cursor.map((c) => Math.max(0, c + pad)), rtlBase: m.rtlBase })
  }
  mirror.lines = lines
  const chunk = { __isChunk: true, text: rows.join("\n"), fg: r._textColor } as unknown as TextChunk
  mirror.buffer.setStyledText(new StyledText([chunk]))
  mirror.view.setViewport(0, 0, Math.max(1, r.width), height)
}

function ensureMirror(renderable: unknown, r: EditorLike): Mirror {
  let mirror = mirrors.get(renderable as object)
  if (!mirror) {
    const buffer = TextBuffer.create(r._ctx.widthMethod)
    const view = TextBufferView.create(buffer)
    view.setWrapMode("none")
    mirror = { buffer, view, fingerprint: "", color: undefined, lines: [] }
    mirrors.set(renderable as object, mirror)
  }
  return mirror
}

/** نصّ النائب العربيّ إن وُجد (ليُرسَم محاذى لليمين)، وإلا "". */
function rtlPlaceholder(r: EditorLike): string {
  const ph = typeof r._placeholder === "string" ? r._placeholder : ""
  return ph && hasRtl(ph) ? ph : ""
}

/**
 * هل يُعامَل الحقل الفارغ RTL افتراضاً (فيبدأ المؤشّر يميناً)؟
 * نعم إلا إن كان له نائب لاتينيّ صريح (حقل بحث إنجليزيّ). الحقل بلا نائب —
 * كمربّع الكتابة داخل الجلسة — يُعامَل عربياً لأن الطرفية عربية القاعدة.
 */
function rtlEmptyField(r: EditorLike): boolean {
  const ph = typeof r._placeholder === "string" ? r._placeholder : ""
  return ph === "" || hasRtl(ph)
}

/** يبني سطر النائب البصريّ محاذى لليمين (سطر واحد، بلا خريطة مؤشر). */
function rebuildPlaceholder(r: EditorLike, mirror: Mirror, placeholder: string): void {
  const m = visualLineMap(placeholder)
  const pad = Math.max(0, r.width - cellsWidth(m.cells))
  const row = " ".repeat(pad) + m.cells.map((c) => c.text).join("")
  const chunk = { __isChunk: true, text: row, fg: r._placeholderColor } as unknown as TextChunk
  mirror.buffer.setStyledText(new StyledText([chunk]))
  mirror.view.setViewport(0, 0, Math.max(1, r.width), Math.max(1, r.height))
  mirror.lines = []
}

/** يرسم المرآة بدل drawEditorView. يعيد false (المسار الأصلي) لنص بلا RTL. */
function draw(renderable: unknown, frameBuffer: unknown): boolean {
  const r = renderable as EditorLike
  const text = r.editBuffer.getText()
  const fb = frameBuffer as { drawTextBuffer(view: TextBufferView, x: number, y: number): void }

  // حقل فارغ بنائب عربيّ: نرسمه محاذى لليمين (المسار الأصلي يحاذيه لليسار).
  if (text === "") {
    const placeholder = rtlPlaceholder(r)
    if (!placeholder) {
      const stale = mirrors.get(renderable as object)
      if (stale) {
        stale.lines = []
        stale.fingerprint = ""
      }
      return false
    }
    const mirror = ensureMirror(renderable, r)
    const fingerprint = `PH ${r.width} ${r.height} ${placeholder}`
    if (fingerprint !== mirror.fingerprint || mirror.color !== r._placeholderColor) {
      rebuildPlaceholder(r, mirror, placeholder)
      mirror.fingerprint = fingerprint
      mirror.color = r._placeholderColor
    }
    fb.drawTextBuffer(mirror.view, r._screenX, r._screenY)
    return true
  }

  if (!hasRtl(text)) {
    const stale = mirrors.get(renderable as object)
    if (stale) {
      // محتوى سابق كان عربياً وتبدّل: تعطيل خريطة المؤشر حتى عودة RTL
      stale.lines = []
      stale.fingerprint = ""
    }
    return false
  }
  const mirror = ensureMirror(renderable, r)
  const fingerprint = `${r.editorView.getViewport().offsetY} ${r.width} ${r.height} ${text}`
  if (fingerprint !== mirror.fingerprint || mirror.color !== r._textColor) {
    rebuild(r, mirror, text)
    mirror.fingerprint = fingerprint
    mirror.color = r._textColor
  }
  fb.drawTextBuffer(mirror.view, r._screenX, r._screenY)
  return true
}

/** عمود المؤشر البصري المعاد تحويله؛ undefined = استخدم العمود الأصلي. */
function cursorCol(renderable: unknown, cursor: { visualRow: number; visualCol: number }): number | undefined {
  const mapped = mirrors.get(renderable as object)?.lines[cursor.visualRow]?.cursor[cursor.visualCol]
  if (mapped !== undefined) return mapped
  // حقل فارغ عربيّ القاعدة: يبدأ المؤشّر من الحافة اليمنى (بداية الكتابة RTL).
  const r = renderable as EditorLike
  if (cursor.visualRow === 0 && cursor.visualCol === 0 && r.editBuffer.getText() === "" && rtlEmptyField(r)) {
    return Math.max(0, r.width - 1)
  }
  return undefined
}

/** هل يُقلب سهما يمين/يسار (تحرك بصري) — سطر المؤشر الحالي عربي القاعدة. */
function swapArrows(renderable: unknown): boolean {
  const mirror = mirrors.get(renderable as object)
  if (!mirror || mirror.lines.length === 0) return false
  const r = renderable as EditorLike
  return mirror.lines[r.editorView.getVisualCursor().visualRow]?.rtlBase ?? false
}

/** تحرير الموارد الأصلية للمرآة عند تدمير المكوّن. */
function dispose(renderable: unknown): void {
  const mirror = mirrors.get(renderable as object)
  if (!mirror) return
  mirror.view.destroy()
  mirror.buffer.destroy()
  mirrors.delete(renderable as object)
}

export const editorHooks = { draw, cursorCol, swapArrows, dispose }
