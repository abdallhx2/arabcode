import { afterEach, describe, expect, test } from "bun:test"
import { BILINGUAL_PROMPT, bilingualEnabled } from "../../src/session/bilingual"

const ENV = "ARABCODE_BILINGUAL"

describe("bilingualEnabled", () => {
  afterEach(() => {
    delete process.env[ENV]
  })
  test("default is ON", () => {
    expect(bilingualEnabled(undefined)).toBe(true)
    expect(bilingualEnabled({})).toBe(true)
    expect(bilingualEnabled({ arabcode: {} })).toBe(true)
  })
  test("config can disable", () => {
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(false)
    expect(bilingualEnabled({ arabcode: { bilingual: true } })).toBe(true)
  })
  test("env wins over config", () => {
    process.env[ENV] = "false"
    expect(bilingualEnabled({ arabcode: { bilingual: true } })).toBe(false)
    process.env[ENV] = "true"
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(true)
    process.env[ENV] = "0"
    expect(bilingualEnabled(undefined)).toBe(false)
    process.env[ENV] = "1"
    expect(bilingualEnabled({ arabcode: { bilingual: false } })).toBe(true)
  })
})

describe("BILINGUAL_PROMPT", () => {
  test("covers the language boundary", () => {
    expect(BILINGUAL_PROMPT).toContain("Arabic")
    expect(BILINGUAL_PROMPT).toContain("English")
    expect(BILINGUAL_PROMPT).toContain("commit")
    expect(BILINGUAL_PROMPT).toContain("comments")
  })
})
