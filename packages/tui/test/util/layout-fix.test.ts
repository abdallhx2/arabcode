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
    expect(mapEnToAr("hgsbl")).toBe("السلام")
    expect(mapEnToAr("dkjv")).toBe("ينتر") // أحرف فردية
  })
  test("ar→en base layer", () => {
    expect(mapArToEn("السلام")).toBe("hgsbl")
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
