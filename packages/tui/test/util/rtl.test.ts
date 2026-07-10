import { describe, expect, test } from "bun:test"
import {
  hasRtl,
  rtlMode,
  setRtlMode,
  shapeCells,
  reorderCells,
  wrapCells,
  visualLine,
  visualLines,
  transformChunks,
  type RtlCell,
} from "../../src/util/rtl"

function cells(text: string): RtlCell[] {
  const out: RtlCell[] = []
  for (const s of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    out.push({ text: s.segment })
  }
  return out
}

function text(cells: RtlCell[]): string {
  return cells.map((c) => c.text).join("")
}

describe("util.rtl", () => {
  describe("hasRtl", () => {
    test("detects Arabic", () => {
      expect(hasRtl("مرحبا")).toBe(true)
      expect(hasRtl("hello مرحبا")).toBe(true)
      expect(hasRtl("hello world")).toBe(false)
      expect(hasRtl("")).toBe(false)
    })
    test("detects presentation forms", () => {
      expect(hasRtl("ﻡﺮ")).toBe(true)
    })
  })

  describe("shapeCells", () => {
    test("isolated letter", () => {
      // ب وحدها → شكل منعزل FE8F
      expect(text(shapeCells(cells("ب")))).toBe("ﺏ")
    })

    test("two joining letters: initial + final", () => {
      // بت → ب ابتدائية FE91 + ت نهائية FE96
      expect(text(shapeCells(cells("بت")))).toBe("ﺑﺖ")
    })

    test("medial form in three-letter word", () => {
      // بتب → FE91 (ابتدائي) FE98 (وسطي) FE90 (نهائي)
      expect(text(shapeCells(cells("بتب")))).toBe("ﺑﺘﺐ")
    })

    test("right-joining letter breaks forward join", () => {
      // دار: د منعزلة FEA9 (لا تصل لما بعدها)، ا نهائية FE8E؟ لا —
      // د لا تصل بما بعدها فالألف منعزلة FE8D، ر منعزلة FEAD
      expect(text(shapeCells(cells("دار")))).toBe("ﺩﺍﺭ")
    })

    test("real word: مرحبا", () => {
      // م ابتدائية FEE3، ر نهائية FEAE، ح ابتدائية FEA3، ب وسطية FE92، ا نهائية FE8E
      expect(text(shapeCells(cells("مرحبا")))).toBe("ﻣﺮﺣﺒﺎ")
    })

    test("lam-alef ligature merges two cells", () => {
      const result = shapeCells(cells("لا"))
      expect(result.length).toBe(1)
      expect(result[0]!.text).toBe("ﻻ")
    })

    test("lam-alef final form after joining letter", () => {
      // بلا: ب ابتدائية + لا نهائية FEFC
      const result = shapeCells(cells("بلا"))
      expect(result.length).toBe(2)
      expect(result[0]!.text).toBe("ﺑ")
      expect(result[1]!.text).toBe("ﻼ")
    })

    test("lam-alef with hamza", () => {
      // لأ → FEF7
      expect(text(shapeCells(cells("لأ")))).toBe("ﻷ")
    })

    test("harakat stay attached to their letter", () => {
      // بَت: الفتحة تتبع الباء داخل نفس الخلية
      const result = shapeCells(cells("بَت"))
      expect(result.length).toBe(2)
      expect(result[0]!.text).toBe("ﺑَ")
    })

    test("non-Arabic passes through", () => {
      expect(text(shapeCells(cells("abc 123")))).toBe("abc 123")
    })

    test("mixed Arabic and Latin", () => {
      // كلمة عربية ثم لاتينية: العربي يتشكل واللاتيني كما هو
      expect(text(shapeCells(cells("بت x")))).toBe("ﺑﺖ x")
    })
  })

  describe("reorderCells", () => {
    test("pure LTR unchanged", () => {
      expect(text(reorderCells(cells("hello")))).toBe("hello")
    })

    test("pure RTL reversed", () => {
      // ترتيب منطقي «ابج» → بصري «جبا»
      expect(text(reorderCells(cells("ابج")))).toBe("جبا")
    })

    test("mixed: LTR run kept intact inside RTL line", () => {
      // «اب cd هو» بقاعدة RTL: بصرياً «وه cd با»
      expect(text(reorderCells(cells("اب cd هو")))).toBe("وه cd با")
    })

    test("numbers stay LTR within RTL text", () => {
      expect(text(reorderCells(cells("اب 123 جد")))).toBe("دج 123 با")
    })

    test("brackets are mirrored", () => {
      // (اب) بقاعدة RTL: القوس الفاتح يصبح غالقاً بصرياً
      const result = text(reorderCells(cells("(اب)")))
      expect(result).toBe("(با)")
    })

    test("LTR base line with RTL run", () => {
      // يبدأ بلاتيني → القاعدة LTR والمقطع العربي يُعكس داخلياً
      expect(text(reorderCells(cells("model: اب")))).toBe("model: با")
    })
  })

  describe("wrapCells", () => {
    test("no wrap needed", () => {
      const lines = wrapCells(cells("اب جد"), 10)
      expect(lines.length).toBe(1)
    })

    test("wraps at word boundary", () => {
      const lines = wrapCells(cells("اب جد هو"), 5)
      expect(lines.map(text)).toEqual(["اب جد", "هو"])
    })

    test("drops trailing space at wrap point", () => {
      const lines = wrapCells(cells("ab cd"), 2)
      expect(lines.map(text)).toEqual(["ab", "cd"])
    })

    test("hard-breaks overlong word", () => {
      const lines = wrapCells(cells("abcdef"), 3)
      expect(lines.map(text)).toEqual(["abc", "def"])
    })
  })

  describe("visualLine", () => {
    test("shapes and reorders a full sentence", () => {
      // «مرحبا بك» منطقياً → بصرياً: «بك» المشكلة ثم مسافة ثم «مرحبا» المشكلة
      const result = visualLine("مرحبا بك")
      // م ر ح ب ا = FEE3 FEAE FEA3 FE92 FE8E — معكوسة: FE8E FE92 FEA3 FEAE FEE3
      // ب ك = FE91 FEDA — معكوسة: FEDA FE91
      expect(result).toBe("ﻚﺑ ﺎﺒﺣﺮﻣ")
    })

    test("LTR text untouched", () => {
      expect(visualLine("plain text")).toBe("plain text")
    })
  })

  describe("visualLines", () => {
    test("wraps logically then reorders per line with right padding", () => {
      // «اب جد هو» بعرض 5: السطر الأول «اب جد» بصرياً «دج با»، الثاني «هو» بصرياً «وه»
      const lines = visualLines("اب جد", 8)
      expect(lines.length).toBe(1)
      // محاذاة يمينية: حشو يساري حتى العرض 8 (النص عرضه 5)
      expect(lines[0]!.startsWith("   ")).toBe(true)
      expect(Bun.stringWidth(lines[0]!)).toBe(8)
    })

    test("reading order of wrapped lines is top-down", () => {
      // فقرة من كلمتين لا تسعهما سطر: الكلمة الأولى منطقياً تظهر في السطر الأول
      const first = "ﺎﺒﺣﺮﻣ" // «مرحبا» مشكلة معكوسة
      const lines = visualLines("مرحبا بك", 6)
      expect(lines.length).toBe(2)
      expect(lines[0]!.trimStart()).toBe(first)
    })

    test("LTR lines pass through wrapped", () => {
      const lines = visualLines("hello world", 20)
      expect(lines).toEqual(["hello world"])
    })
  })

  describe("transformChunks", () => {
    const makePlain = (text: string) => ({ text })

    test("preserves style boundaries through reorder", () => {
      // chunkA عربي أحمر + chunkB عربي أزرق: بعد القلب يتبدل موقعاهما والتنسيق يتبع النص
      const a = { text: "اب ", color: "red" }
      const b = { text: "جد", color: "blue" }
      const result = transformChunks([a, b], { makePlain })
      const joined = result.map((c) => c.text).join("")
      // بصرياً: «جد» المشكلة (ﺟﺪ معكوسة) أولاً ثم «اب» (ﺍﺏ معكوسة — منعزلة لأن الألف لا تصل)
      expect(joined).toBe("ﺪﺟ ﺏﺍ")
      // أول chunk بصري يحمل تنسيق b
      expect((result[0] as typeof b).color).toBe("blue")
      const last = result[result.length - 1] as typeof a
      expect(last.color).toBe("red")
    })

    test("multi-line chunks split on newline", () => {
      const result = transformChunks([{ text: "اب\ncd" }], { makePlain })
      const joined = result.map((c) => c.text).join("")
      expect(joined).toBe("ﺏﺍ\ncd")
    })

    test("wrapping with width pads for right alignment", () => {
      const result = transformChunks([{ text: "اب جد هو" }], { width: 5, makePlain })
      const joined = result.map((c) => c.text).join("")
      const lines = joined.split("\n")
      expect(lines.length).toBe(2)
      for (const line of lines) expect(Bun.stringWidth(line)).toBeLessThanOrEqual(5)
      // السطر الثاني كلمة واحدة (هو) محشوة يميناً
      expect(lines[1]!.startsWith(" ")).toBe(true)
    })

    test("pure LTR content returned as-is", () => {
      const chunks = [{ text: "hello world" }]
      const result = transformChunks(chunks, { makePlain })
      expect(result.map((c) => c.text).join("")).toBe("hello world")
    })
  })

  describe("rtlMode", () => {
    test("setRtlMode forces mode", () => {
      setRtlMode("terminal")
      expect(rtlMode()).toBe("terminal")
      setRtlMode("app")
      expect(rtlMode()).toBe("app")
    })
  })
})
