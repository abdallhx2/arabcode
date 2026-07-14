import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { buildDistMap } from "../../src/server/shared/ui"

describe("buildDistMap", () => {
  test("returns null when index.html is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "dist-"))
    expect(buildDistMap(dir)).toBeNull()
  })

  test("maps nested files to absolute paths with forward-slash keys", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "dist-"))
    writeFileSync(path.join(dir, "index.html"), "<html></html>")
    mkdirSync(path.join(dir, "assets"))
    writeFileSync(path.join(dir, "assets", "app.js"), "js")
    const map = buildDistMap(dir)!
    expect(map["index.html"]).toBe(path.join(dir, "index.html"))
    expect(map["assets/app.js"]).toBe(path.join(dir, "assets", "app.js"))
  })

  test("returns null for a nonexistent directory", () => {
    expect(buildDistMap("/nonexistent/path/xyz")).toBeNull()
  })
})
