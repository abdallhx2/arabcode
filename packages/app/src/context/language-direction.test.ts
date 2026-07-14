import { describe, expect, test } from "bun:test"
import { directionFor, DEFAULT_LOCALE } from "./language"

describe("locale direction", () => {
  test("arabic is rtl", () => {
    expect(directionFor("ar")).toBe("rtl")
  })
  test("english is ltr", () => {
    expect(directionFor("en")).toBe("ltr")
  })
  test("default locale is arabic", () => {
    expect(DEFAULT_LOCALE).toBe("ar")
  })
})
