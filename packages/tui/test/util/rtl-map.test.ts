import { describe, expect, test } from "bun:test"
import {
  visualLineMap,
  buildSelectionMap,
  sliceLogicalBySelection,
  isLamAlefForm,
} from "../../src/util/rtl"

describe("visualLineMap", () => {
  test("سطر لاتيني: خريطة هوية بلا قاعدة RTL", () => {
    const m = visualLineMap("abc")
    expect(m.rtlBase).toBe(false)
    expect(m.cursor).toEqual([0, 1, 2, 3])
    expect(m.cells.map((c) => c.text).join("")).toBe("abc")
  })

  test("سطر فارغ", () => {
    const m = visualLineMap("")
    expect(m.cursor).toEqual([0])
    expect(m.rtlBase).toBe(false)
  })

  test("عربي صافٍ: المؤشر يتحرك يساراً مع الكتابة", () => {
    // "ابج" خام: ا=0 ب=1 ج=2 (3 أعمدة). بصري: [ج ب ا] (ا في أقصى اليمين).
    // نقطة الإدراج = يسار الحرف السابق: بداية السطر → 2، بعد ا → 1، بعد ب → 0، بعد ج → -1
    const m = visualLineMap("ابج")
    expect(m.rtlBase).toBe(true)
    expect(m.cursor).toEqual([2, 1, 0, -1])
  })

  test("مختلط عربي/لاتيني بقاعدة RTL", () => {
    // "اب cd" منطقي: ا0 ب1 ␣2 c3 d4 — بصري: "cd با" → c0 d1 ␣2 ب3 ا4
    const m = visualLineMap("اب cd")
    expect(m.rtlBase).toBe(true)
    expect(m.cursor[0]).toBe(4) // بداية السطر: يمين الكل
    expect(m.cursor[1]).toBe(3) // بعد ا (مستوى RTL): يسار ا
    expect(m.cursor[2]).toBe(2) // بعد ب
    expect(m.cursor[4]).toBe(1) // بعد c (مستوى LTR زوجي): يمين c
    expect(m.cursor[5]).toBe(2) // بعد d: يمين d
  })

  test("لام-ألف: عمودان منطقيان → خلية بصرية واحدة، والفجوة تُملأ", () => {
    // "لا" خام عموداً: ل=0 ا=1 (عرض 2). مشكّل: خلية واحدة (عرض بصري 1).
    const m = visualLineMap("لا")
    expect(m.rtlBase).toBe(true)
    expect(m.cursor[0]).toBe(0) // العرض البصري 1 → البداية عند 0
    expect(m.cursor[2]).toBe(-1) // بعد الألف: يسار الرباط
    expect(m.cursor[1]).toBe(m.cursor[2]) // داخل الرباط: تُملأ من الحد التالي
  })

  test("القيم البصرية للخلايا مطابقة لـ visualLine", () => {
    const m = visualLineMap("سلام")
    expect(m.cells.map((c) => c.text).join("")).toContain("ﻡ") // م منعزلة في أقصى البصري
  })
})

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

  test("التفاف بالكلمات: جملة تلتف لعدة أسطر بصرية عند عرض صغير", () => {
    // جملة طويلة تكفي لتلتف عند width=14 إلى عدة أسطر بصرية لسطر منطقي واحد
    const src = "مرحبا بالعالم هذا اختبار طويل جدا للنص العربي"
    const width = 14
    const map = buildSelectionMap(src, width)
    expect(map.lines.length).toBeGreaterThanOrEqual(2)
  })

  test("التفاف بالكلمات: تحديد عابر لحدود الالتفاف يعيد الفراغات المُسقطة", () => {
    // نفس الجملة الملتفة أعلاه: التحديد من أول سطر بصري إلى آخر سطر بصري
    // يجب أن يعيد الجملة كاملة بفراغاتها (لا فراغات ملتصقة عند حدود الالتفاف)
    const src = "مرحبا بالعالم هذا اختبار طويل جدا للنص العربي"
    const width = 14
    const map = buildSelectionMap(src, width)
    expect(map.lines.length).toBeGreaterThanOrEqual(2)
    const first = map.lines[0]!
    const last = map.lines[map.lines.length - 1]!
    const out = sliceLogicalBySelection(map, {
      anchorY: 0,
      anchorX: Math.min(...first.map((c) => c.start)),
      focusY: map.lines.length - 1,
      focusX: Math.max(...last.map((c) => c.start + c.width - 1)),
      isActive: true,
    })
    expect(out).toBe(src)
  })

  test("تحديد داخل الحشو فقط (يسار كلمة قصيرة مع عرض كبير) يعيد سلسلة فارغة", () => {
    // كلمة قصيرة مع عرض أكبر من عرضها البصري → حشو يساري (RTL محاذاة يمينية)
    const src = "أهلا"
    const width = 20
    const map = buildSelectionMap(src, width)
    expect(map.lines.length).toBe(1)
    const line = map.lines[0]!
    // أصغر start بين خلايا السطر = عرض الحشو (لا خلية تغطي أعمدة ما قبله)
    const pad = Math.min(...line.map((c) => c.start))
    expect(pad).toBeGreaterThan(0)
    const out = sliceLogicalBySelection(map, { anchorY: 0, anchorX: 0, focusY: 0, focusX: pad - 1 })
    expect(out).toBe("")
  })

  test("حرف عريض (عرض 2) داخل سياق عربي: التقطيع الكامل يعيد المصدر ويُحتسب عرضه صحيحاً", () => {
    const src = "مرحبا 😀 بالعالم"
    const map = buildSelectionMap(src, 40)
    expect(map.lines.length).toBe(1)
    const line = map.lines[0]!
    // الرمز التعبيري يشغل خلية واحدة بعرض 2
    const wide = line.find((c) => c.width === 2)
    expect(wide).toBeDefined()
    expect(Bun.stringWidth(map.graphemes[wide!.gis[0]!]!)).toBe(2)
    const lo = Math.min(...line.map((c) => c.start))
    const hi = Math.max(...line.map((c) => c.start + c.width - 1))
    const out = sliceLogicalBySelection(map, { anchorY: 0, anchorX: lo, focusY: 0, focusX: hi })
    expect(out).toBe(src)
  })
})
