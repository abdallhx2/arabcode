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

  test("double install does not double-transform", () => {
    const { r, applied } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    globalThis.__arabcodeRtl!.code!(r) // مرة ثانية — يجب ألا يُغلّف مجدداً
    r.textBuffer.setStyledText(new StyledText([{ __isChunk: true, text: "مرحبا بالعالم" }]))
    expect(applied[applied.length - 1]).toContain(visualLine("مرحبا بالعالم"))
    // لو تُضاعف التغليف لاختلف الناتج عن تحويل واحد
    expect(applied[applied.length - 1]).not.toContain("مرحبا بالعالم")
  })

  test("wrapMode is restored when content becomes non-Arabic", () => {
    const { r } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    r.textBuffer.setStyledText(new StyledText([{ __isChunk: true, text: "مرحبا بالعالم" }]))
    expect(r.wrapMode).toBe("none")
    r.textBuffer.setText("hello world") // لاتيني الآن
    expect(r.wrapMode).toBe("word") // استُعيد الأصل
  })

  test("re-applying identical source at same width reuses the cached transform", () => {
    const { r, applied } = fakeCode("markdown")
    globalThis.__arabcodeRtl!.code!(r)
    const st = new StyledText([{ __isChunk: true, text: "مرحبا بالعالم" }])
    r.textBuffer.setStyledText(st)
    const first = applied[applied.length - 1]
    r.textBuffer.setStyledText(new StyledText([{ __isChunk: true, text: "مرحبا بالعالم" }]))
    // نفس النص ونفس العرض → نفس الناتج (تخزين مؤقّت)
    expect(applied[applied.length - 1]).toBe(first)
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
