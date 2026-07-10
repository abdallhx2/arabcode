import { describe, expect, test } from "bun:test"
import { installBidiResumeGuard } from "../../src/util/rtl-hook"
import { BIDI_EXPLICIT_ENTER } from "../../src/util/rtl"

/**
 * حارس إعادة تأكيد BiDi بعد أي resume: تعليق ctrl+z (أو أي مسار مستقبلي)
 * يعيد تهيئة الطرفية فيسقط وضع BiDi explicit — يجب إعادة بثّه بعد كل resume.
 */
function makeRenderer() {
  const calls: string[] = []
  return {
    calls,
    isDestroyed: false,
    resume() {
      calls.push("resume")
    },
    writeOut(data: string) {
      calls.push(`write:${data}`)
    },
  }
}

describe("installBidiResumeGuard", () => {
  test("re-asserts BIDI_EXPLICIT_ENTER after every resume, in order", () => {
    const r = makeRenderer()
    installBidiResumeGuard(r)
    r.resume()
    expect(r.calls).toEqual(["resume", `write:${BIDI_EXPLICIT_ENTER}`])
    r.resume()
    expect(r.calls).toEqual(["resume", `write:${BIDI_EXPLICIT_ENTER}`, "resume", `write:${BIDI_EXPLICIT_ENTER}`])
  })

  test("double install wraps once (no duplicate escapes)", () => {
    const r = makeRenderer()
    installBidiResumeGuard(r)
    installBidiResumeGuard(r)
    r.resume()
    expect(r.calls).toEqual(["resume", `write:${BIDI_EXPLICIT_ENTER}`])
  })

  test("destroyed renderer: resume still works, no write", () => {
    const r = makeRenderer()
    installBidiResumeGuard(r)
    r.isDestroyed = true
    r.resume()
    expect(r.calls).toEqual(["resume"])
  })

  test("renderer without resume is a safe no-op", () => {
    expect(() => installBidiResumeGuard({ writeOut() {} })).not.toThrow()
  })
})
