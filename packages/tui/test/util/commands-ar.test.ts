import { describe, expect, test } from "bun:test"
import { arabizeSlashEntry, COMMAND_AR } from "../../src/util/commands-ar"

describe("COMMAND_AR", () => {
  test("all values are non-empty Arabic and unique", () => {
    const seen = new Set<string>()
    for (const [en, ar] of Object.entries(COMMAND_AR)) {
      expect(en.length).toBeGreaterThan(0)
      expect(ar).toMatch(/^[ء-ي][ء-ي-]*$/)
      expect(seen.has(ar)).toBe(false)
      seen.add(ar)
    }
  })
  test("core commands covered", () => {
    for (const name of ["help", "new", "sessions", "models", "themes", "undo", "redo", "share", "compact", "export", "exit"]) {
      expect(COMMAND_AR[name]).toBeDefined()
    }
  })
})

describe("arabizeSlashEntry", () => {
  test("translated command: arabic display, english canonical in description + aliases", () => {
    const r = arabizeSlashEntry("new", "جلسة جديدة", undefined)
    expect(r.display).toBe("/جديد")
    expect(r.description).toBe("جلسة جديدة · /new")
    expect(r.aliases).toContain("/new")
    expect(r.aliases).toContain("/جديد")
  })
  test("existing aliases preserved", () => {
    const r = arabizeSlashEntry("help", "المساعدة", ["h"])
    expect(r.aliases).toEqual(expect.arrayContaining(["/h", "/help", "/مساعدة"]))
  })
  test("untranslated command unchanged", () => {
    const r = arabizeSlashEntry("somecustom", "desc", ["sc"])
    expect(r.display).toBe("/somecustom")
    expect(r.description).toBe("desc")
    expect(r.aliases).toEqual(["/sc"])
  })
  test("translated command with no desc: description is just the english canonical", () => {
    const r = arabizeSlashEntry("exit", undefined, undefined)
    expect(r.description).toBe("/exit")
  })
})
