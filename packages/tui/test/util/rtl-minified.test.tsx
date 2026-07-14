import { afterAll, beforeAll, expect, test } from "bun:test"
import { TextRenderable } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { installRtlHooks, uninstallRtlHooks } from "../../src/util/rtl-hook"
import { setRtlMode, visualLine } from "../../src/util/rtl"

beforeAll(() => {
  setRtlMode("app")
  installRtlHooks()
})

afterAll(() => {
  uninstallRtlHooks()
  setRtlMode("off")
})

// بناء الإنتاج يمر بالتصغير فيتغير اسم الصنف (TextRenderable → معرف قصير)،
// وأي تعرف على العنصر عبر constructor.name يتعطل في الثنائية المنشورة فقط.
test("transform still applies when the class name is minified", async () => {
  const original = Object.getOwnPropertyDescriptor(TextRenderable, "name")!
  Object.defineProperty(TextRenderable, "name", { value: "Ct", configurable: true })
  try {
    const app = await testRender(() => <text>مرحبا بالعالم</text>)
    try {
      await app.renderOnce()
      const frame = app.captureCharFrame()
      expect(frame).toContain(visualLine("مرحبا بالعالم"))
      expect(frame).not.toContain("مرحبا بالعالم")
    } finally {
      app.renderer.destroy()
    }
  } finally {
    Object.defineProperty(TextRenderable, "name", original)
  }
})

test("resize rebuild still applies when the class name is minified", async () => {
  const original = Object.getOwnPropertyDescriptor(TextRenderable, "name")!
  Object.defineProperty(TextRenderable, "name", { value: "Ct", configurable: true })
  const paragraph = "مرحبا بكم في عالم البرمجة العربية"
  try {
    const app = await testRender(() => (
      <box width={14}>
        <text wrapMode="word">{paragraph}</text>
      </box>
    ))
    try {
      await app.renderOnce()
      const frame = app.captureCharFrame()
      // إعادة البناء عند معرفة العرض تلتف منطقياً ثم تعيد الترتيب لكل سطر
      expect(frame).toContain(visualLine("مرحبا بكم في"))
      expect(frame).not.toContain(paragraph)
    } finally {
      app.renderer.destroy()
    }
  } finally {
    Object.defineProperty(TextRenderable, "name", original)
  }
})
