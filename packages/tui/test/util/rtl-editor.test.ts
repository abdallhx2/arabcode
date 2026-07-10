import { describe, expect, test } from "bun:test"
import { editorHooks, sliceVirtualLines } from "../../src/util/rtl-editor"

describe("sliceVirtualLines", () => {
  test("أسطر منطقية بلا التفاف", () => {
    // \n يُحسب عموداً واحداً: "ef" يبدأ عند العمود 6
    expect(sliceVirtualLines("ab cd\nef", { lineStartCols: [0, 6], lineWidthCols: [5, 2] })).toEqual(["ab cd", "ef"])
  })

  test("التفاف يأكل مسافة الفاصل", () => {
    expect(sliceVirtualLines("ab cd", { lineStartCols: [0, 3], lineWidthCols: [2, 2] })).toEqual(["ab", "cd"])
  })

  test("التفاف بمسافة محسوبة ضمن عرض السطر", () => {
    expect(sliceVirtualLines("ab cd", { lineStartCols: [0, 3], lineWidthCols: [3, 2] })).toEqual(["ab ", "cd"])
  })

  test("سطر فارغ بين سطرين", () => {
    // ا=عمود0، \n=1، \n=2، ب=3
    expect(sliceVirtualLines("ا\n\nب", { lineStartCols: [0, 2, 3], lineWidthCols: [1, 0, 1] })).toEqual(["ا", "", "ب"])
  })

  test("محارف عريضة: الإزاحات بالأعمدة لا بالمحارف", () => {
    // 你 عرضه عمودان — مطابق لسلوك Zig المرصود
    expect(sliceVirtualLines("你你 ab\ncd", { lineStartCols: [0, 5, 8], lineWidthCols: [5, 2, 2] })).toEqual([
      "你你 ",
      "ab",
      "cd",
    ])
  })

  test("نافذة ممررة: المدخلات تغطي المنفذ فقط", () => {
    expect(sliceVirtualLines("aa\nbb\ncc", { lineStartCols: [3, 6], lineWidthCols: [2, 2] })).toEqual(["bb", "cc"])
  })
})

/** مكوّن محرّر وهميّ بأدنى ما يقرأه cursorCol. */
function mockEditor(input: { text: string; placeholder?: string | null; width?: number }) {
  return {
    width: input.width ?? 30,
    height: 1,
    _screenX: 0,
    _screenY: 0,
    _textColor: undefined,
    _placeholder: input.placeholder ?? null,
    _placeholderColor: undefined,
    _ctx: { widthMethod: "wcwidth" as const },
    editBuffer: { getText: () => input.text },
  }
}

describe("cursorCol — بداية المؤشّر RTL في الحقل الفارغ", () => {
  const home = { visualRow: 0, visualCol: 0 }

  test("مربّع الجلسة الفارغ (بلا نائب) يبدأ المؤشّر يميناً", () => {
    expect(editorHooks.cursorCol(mockEditor({ text: "", width: 30 }), home)).toBe(29)
  })

  test("حقل فارغ بنائب عربيّ يبدأ المؤشّر يميناً", () => {
    expect(editorHooks.cursorCol(mockEditor({ text: "", placeholder: "اكتب أي شيء", width: 40 }), home)).toBe(39)
  })

  test("حقل بحث بنائب لاتينيّ صريح يبقى على المؤشّر الأصلي (يسار)", () => {
    expect(editorHooks.cursorCol(mockEditor({ text: "", placeholder: "search models" }), home)).toBeUndefined()
  })

  test("حقل غير فارغ لا يُفرض له يمين (يُترك للمحتوى/الأصل)", () => {
    expect(editorHooks.cursorCol(mockEditor({ text: "hello" }), home)).toBeUndefined()
  })
})
