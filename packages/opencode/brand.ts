// brand.ts — single source of truth for PUBLISHED artifact branding (arabcode).
//
// These are REBRANDABLE TEMPLATES. The strings below drive the names of the
// npm meta package, the per-platform binary packages, the compiled binary file
// name, and the release/download URLs used by the publish pipeline.
//
// NOTE: internal build defines (OPENCODE_VERSION, OPENCODE_CHANNEL, etc.) are
// intentionally NOT branded here — they are internal and must stay untouched.
//
// Configured for the repo github.com/abdallhx2/arabcode. To move it elsewhere,
// find-replace `abdallhx2` and the URLs below across the repo in one pass.

/** npm meta package name (unscoped) — `npm i -g arabcode`. */
export const PUBLISH_NAME = "arabcode"

/** Prefix for per-platform binary packages: `arabcode-<os>-<arch>[-baseline][-musl]`. */
export const BINARY_PREFIX = "arabcode"

/** Compiled executable file name inside the archive & package `bin/` (append `.exe` on windows). */
export const BINARY_FILE = "arabcode"

/** GitHub owner (user/org) — TEMPLATE token, user must replace. */
export const GH_OWNER = "abdallhx2"

/** GitHub repo name. */
export const GH_REPO = "arabcode"

/** Project homepage — TEMPLATE token, user must replace. */
export const HOMEPAGE = "https://github.com/abdallhx2/arabcode"

/** Docs site URL — TEMPLATE token, user must replace. */
export const DOCS_URL = "https://github.com/abdallhx2/arabcode#readme"

/** Public URL that serves the bash `install` script — TEMPLATE token. */
export const INSTALL_SH_URL = "https://raw.githubusercontent.com/abdallhx2/arabcode/main/install"

/** Public URL that serves `install.ps1` — TEMPLATE token. */
export const INSTALL_PS1_URL = "https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1"
