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
