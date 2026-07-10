import { expect, test } from "bun:test"
import { normalizeArabic, searchKey } from "../../src/util/arabic"

test("يوحّد أشكال الألف والهمزات", () => {
  expect(normalizeArabic("أنشئ")).toBe("انشي")
  expect(normalizeArabic("إصلاح")).toBe("اصلاح")
  expect(normalizeArabic("آية")).toBe("ايه")
})

test("يوحّد التاء المربوطة والألف المقصورة", () => {
  expect(normalizeArabic("الطرفية")).toBe("الطرفيه")
  expect(normalizeArabic("مستوى")).toBe("مستوي")
})

test("يزيل الحركات والتطويل", () => {
  expect(normalizeArabic("مُحَمَّد")).toBe("محمد")
  expect(normalizeArabic("كــود")).toBe("كود")
})

test("يترك النصّ اللاتيني كما هو", () => {
  expect(normalizeArabic("claude-opus")).toBe("claude-opus")
})

test("searchKey يطبّع ويخفض الحالة معاً", () => {
  expect(searchKey("أنْشِئ")).toBe("انشي")
  expect(searchKey("Claude")).toBe("claude")
})

test("البحث يطابق رغم اختلاف كتابة الهمزة", () => {
  // ما يكتبه المستخدم (بلا همزة) يجب أن يطابق العنوان الأصلي (بالهمزة)
  expect(searchKey("انشئ")).toBe(searchKey("أنشئ"))
  expect(searchKey("الطرفيه")).toBe(searchKey("الطرفية"))
})
