import { afterAll, beforeAll, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { installRtlHooks, uninstallRtlHooks } from "../../src/util/rtl-hook"
import { cellsWidth, setRtlMode, visualLine, visualLineMap, visualLines } from "../../src/util/rtl"
import { sliceVirtualLines } from "../../src/util/rtl-editor"

beforeAll(() => {
  setRtlMode("app")
  installRtlHooks()
})

afterAll(() => {
  uninstallRtlHooks()
  setRtlMode("off")
})

test("short Arabic label is drawn shaped and reordered", async () => {
  const app = await testRender(() => <text>مرحبا</text>)
  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    // الإطار المرسوم يحوي الشكل البصري (مشكّلاً ومعكوساً) وليس المنطقي
    expect(frame).toContain(visualLine("مرحبا"))
    expect(frame).not.toContain("مرحبا")
  } finally {
    app.renderer.destroy()
  }
})

test("mixed Arabic/Latin label keeps LTR run readable", async () => {
  const app = await testRender(() => <text>النموذج: claude</text>)
  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    expect(frame).toContain("claude")
    expect(frame).toContain(visualLine("النموذج: claude"))
  } finally {
    app.renderer.destroy()
  }
})

test("wrapped Arabic paragraph reads top-down with right alignment", async () => {
  const paragraph = "مرحبا بكم في عالم البرمجة العربية"
  const width = 14
  const app = await testRender(() => (
    <box width={width}>
      <text wrapMode="word">{paragraph}</text>
    </box>
  ))
  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    const rows = frame.split("\n")
    const expected = visualLines(paragraph, width)
    expect(expected.length).toBeGreaterThan(1)
    for (let i = 0; i < expected.length; i++) {
      // كل سطر بصري متوقع يظهر في صف الشاشة المقابل بنفس الترتيب
      expect(rows[i]!.trimEnd()).toBe(expected[i]!.trimEnd())
    }
  } finally {
    app.renderer.destroy()
  }
})

test("box title is drawn shaped and reordered", async () => {
  const app = await testRender(() => <box border title="قائمة النماذج" width={30} height={4} />)
  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    expect(frame).toContain(visualLine("قائمة النماذج"))
    expect(frame).not.toContain("قائمة")
  } finally {
    app.renderer.destroy()
  }
})

test("textarea placeholder is drawn shaped and reordered", async () => {
  const app = await testRender(() => <textarea placeholder="اكتب أي شيء" width={30} height={3} />)
  try {
    await app.renderOnce()
    const frame = app.captureCharFrame()
    expect(frame).toContain(visualLine("اكتب أي شيء"))
    expect(frame).not.toContain("اكتب")
  } finally {
    app.renderer.destroy()
  }
})

test("pure LTR text is untouched", async () => {
  const app = await testRender(() => <text>hello world</text>)
  try {
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("hello world")
  } finally {
    app.renderer.destroy()
  }
})

test("typed Arabic renders shaped, reordered, right-aligned; cursor maps visually", async () => {
  let ta: any
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={20} height={3} />)
  try {
    ta.insertText("سلام")
    await app.renderOnce()
    const frame = app.captureCharFrame()
    const row = frame.split("\n")[0]!
    // مشكّل ومعاد ترتيبه (م المنعزلة أولاً بصرياً) ومحاذى يميناً لعرض 20
    expect(row.trimEnd()).toBe(" ".repeat(17) + visualLine("سلام"))
    // المؤشر المنطقي بعد 4 أعمدة ← بصرياً على الخلية يسار "م" (عرض بصري 3، حشوة 17)
    const col = globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())
    expect(col).toBe(16)
  } finally {
    app.renderer.destroy()
  }
})

test("arrow keys move visually in RTL context", async () => {
  let ta: any
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={20} height={3} />)
  try {
    ta.insertText("سلام")
    await app.renderOnce()
    expect(ta.logicalCursor.col).toBe(4)
    expect(globalThis.__arabcodeRtl!.editor.swapArrows(ta)).toBe(true)
    // سهم يمين بصري = رجوع منطقي (المعالج المرقوع يقلب)
    ta._actionHandlers.get("move-right")()
    expect(ta.logicalCursor.col).toBe(3)
    ta._actionHandlers.get("move-left")()
    expect(ta.logicalCursor.col).toBe(4)
  } finally {
    app.renderer.destroy()
  }
})

test("LTR textarea content takes the native path untouched", async () => {
  let ta: any
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={20} height={3} />)
  try {
    ta.insertText("hello")
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("hello")
    expect(globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())).toBeUndefined()
    expect(globalThis.__arabcodeRtl!.editor.swapArrows(ta)).toBe(false)
  } finally {
    app.renderer.destroy()
  }
})

test("backspace removes the last typed Arabic letter (logical) and frame updates", async () => {
  let ta: any
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={20} height={3} />)
  try {
    ta.insertText("سلام")
    await app.renderOnce()
    ta.deleteCharBackward()
    await app.renderOnce()
    expect(app.captureCharFrame().split("\n")[0]!.trimEnd()).toBe(" ".repeat(18) + visualLine("سلا"))
  } finally {
    app.renderer.destroy()
  }
})

// ---------------------------------------------------------------------------
// تقسية (hardening): تغطية متعددة الأسطر/التمرير — كانت مغيبة (فحص وحيد السطر فقط)
// ---------------------------------------------------------------------------

test("wrapped multi-line RTL paragraph in textarea reads top-down, each visual line right-aligned", async () => {
  let ta: any
  const width = 20
  const paragraph = "مرحبا بكم في عالم البرمجة العربية الجميلة اليوم"
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={width} height={6} />)
  try {
    ta.insertText(paragraph)
    await app.renderOnce()
    const frame = app.captureCharFrame()
    const rows = frame.split("\n")

    // العرض الداخلي لمنطقة النص (لا حدود على textarea) = العرض الممرّر نفسه.
    const contentWidth = ta.width as number
    const expected = visualLines(paragraph, contentWidth)
    expect(expected.length).toBeGreaterThanOrEqual(2)

    // فُحص تجريبياً: عند هذه الفقرة والعرض، نقاط التفاف Zig الأصلية (getLineInfo)
    // تطابق تماماً التفاف visualLines المنطقي بالكلمات — فالمطابقة سطراً بسطر
    // (وليس فقط تجميع النص بلا مسافات) هي الثابتة الصحيحة هنا، تماماً كاختبار
    // الصندوق "wrapped Arabic paragraph reads top-down" أعلاه.
    for (let i = 0; i < expected.length; i++) {
      expect(rows[i]!.trimEnd()).toBe(expected[i]!.trimEnd())
    }

    // المؤشر بعد الإدراج في نهاية النص منطقياً — يقع على آخر سطر بصري.
    const visualCursor = ta.editorView.getVisualCursor()
    expect(visualCursor.visualRow).toBe(expected.length - 1)
    const info = ta.editorView.getLineInfo()
    const linesText = sliceVirtualLines(paragraph, info)
    const lastIdx = linesText.length - 1
    const lastLineText = linesText[lastIdx]!
    const m = visualLineMap(lastLineText)
    const pad = m.rtlBase ? Math.max(0, contentWidth - cellsWidth(m.cells)) : 0
    const rawCursorCol = visualCursor.logicalCol - info.lineStartCols[lastIdx]!
    const expectedCol = Math.max(0, m.cursor[rawCursorCol]! + pad)

    const col = globalThis.__arabcodeRtl!.editor.cursorCol(ta, visualCursor)
    expect(typeof col).toBe("number")
    expect(col).toBe(expectedCol)
  } finally {
    app.renderer.destroy()
  }
})

test("scrolled viewport (offsetY>0): mirror still renders and cursor still maps on the visible window", async () => {
  let ta: any
  const width = 20
  const height = 3
  const lines = Array.from({ length: 10 }, (_, i) => `سطر رقم ${i}`)
  const text = lines.join("\n")
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={width} height={height} />)
  try {
    // إدراج نص أطول من المنفذ يترك المؤشر في النهاية، وهو ما يستدعي تمرير
    // العارض الأصلي تلقائياً (لوحظ تجريبياً: offsetY > 0 بعد insertText وحدها).
    ta.insertText(text)
    await app.renderOnce()
    const viewport = ta.editorView.getViewport()
    expect(viewport.offsetY).toBeGreaterThan(0)

    const frame = app.captureCharFrame()
    const rows = frame.split("\n")
    const lastLine = lines[lines.length - 1]!
    // محاذاة يمينية بحشو = العرض - العرض البصري المشكّل (نفس منطق rtl-editor.ts rebuild).
    const pad = width - Bun.stringWidth(visualLine(lastLine))
    expect(rows[height - 1]!.trimEnd()).toBe(" ".repeat(pad) + visualLine(lastLine))

    const col = globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())
    expect(typeof col).toBe("number")
  } finally {
    app.renderer.destroy()
  }
})

test("RTL to LTR to RTL transition keeps mirror/cursor mapping correct (stale-mirror path + reuse)", async () => {
  let ta: any
  const app = await testRender(() => <textarea ref={(r: any) => (ta = r)} width={20} height={3} />)
  try {
    ta.insertText("سلام")
    await app.renderOnce()
    // المرآة نشطة: المؤشر يُعاد تعيينه بصرياً
    expect(typeof globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())).toBe("number")

    // إعادة تعيين كاملة (setText) بنص لاتيني: المرآة تصبح قديمة (stale) ومعطّلة
    ta.setText("hello")
    await app.renderOnce()
    expect(globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())).toBeUndefined()
    expect(app.captureCharFrame()).toContain("hello")

    // عودة نص عربي على نفس renderable: إعادة بناء المرآة (استخدام WeakMap نفسه) تعمل من جديد
    ta.setText("مرحبا")
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain(visualLine("مرحبا"))
    expect(typeof globalThis.__arabcodeRtl!.editor.cursorCol(ta, ta.editorView.getVisualCursor())).toBe("number")
  } finally {
    app.renderer.destroy()
  }
})

// ---------------------------------------------------------------------------
// نثر Markdown (استجابات المساعد): CodeRenderable المُغلَّف — تشكيل+ترتيب للنثر،
// بقاء الكود لاتينياً بلا تحويل. التلوين (tree-sitter) غير متزامن.
// ---------------------------------------------------------------------------

async function settle(app: any) {
  await app.renderOnce()
  await new Promise((r) => setTimeout(r, 400)) // تلوين tree-sitter اللا-متزامن
  await app.renderOnce()
}

test("markdown Arabic prose is shaped and reordered (assistant response)", async () => {
  const app = await testRender(() => <markdown {...({ content: "مرحبا بالعالم", width: 30 } as any)} />)
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
  const app = await testRender(() => <markdown {...({ content: "استخدم مكتبة React الآن", width: 40 } as any)} />)
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
  const app = await testRender(() => <markdown {...({ content: "```js\nconst x = 1\n```", width: 30 } as any)} />)
  try {
    await settle(app)
    const frame = app.captureCharFrame()
    expect(frame).toContain("const x = 1")
  } finally {
    app.renderer.destroy()
  }
})

test("Arabic inside a real code block stays LTR (filetype gate)", async () => {
  // كتلة كود بلغة js تحمل تعليقاً عربياً: يجب أن يبقى خاماً (غير مشكّل/معكوس)
  // لأن filetype ليس "markdown" — هذا يميّز بوابة النوع (لا مجرد hasRtl)
  const app = await testRender(() => (<markdown {...({ content: "```js\n// تعليق عربي\nconst x = 1\n```", width: 40 } as any)} />))
  try {
    await settle(app)
    const frame = app.captureCharFrame()
    expect(frame).toContain("const x = 1")
    // النص العربي يبقى خاماً (منطقي)، لا بشكله البصري المحوّل
    expect(frame).toContain("تعليق عربي")
    expect(frame).not.toContain(visualLine("تعليق عربي"))
  } finally {
    app.renderer.destroy()
  }
})

test("empty field with Arabic placeholder is right-aligned (RTL-native caret start)", async () => {
  // قبل الكتابة: النائب العربي يُحاذى لليمين (حشو المسافات يساراً) بدل اليسار،
  // ليبدأ موضع الكتابة من الحافة اليمنى كما هو متوقّع في RTL.
  const width = 30
  const placeholder = "اكتب أي شيء هنا"
  const app = await testRender(() => (
    <box width={width}>
      <textarea width={width} placeholder={placeholder} />
    </box>
  ))
  try {
    await app.renderOnce()
    await app.renderOnce()
    const row = app.captureCharFrame().split("\n")[0]!
    // الشكل البصري للنائب يجلس في نهاية السطر (يمين)، وتتصدّره مسافات
    expect(row.trimEnd().endsWith(visualLine(placeholder))).toBe(true)
    expect(row.startsWith(" ")).toBe(true)
  } finally {
    app.renderer.destroy()
  }
})

test("empty field with Latin placeholder stays left-aligned (unchanged)", async () => {
  const width = 30
  const app = await testRender(() => (
    <box width={width}>
      <textarea width={width} placeholder={"search models"} />
    </box>
  ))
  try {
    await app.renderOnce()
    await app.renderOnce()
    const row = app.captureCharFrame().split("\n")[0]!
    expect(row.startsWith("search models")).toBe(true)
  } finally {
    app.renderer.destroy()
  }
})

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
    app.renderer.destroy()
  }
})
