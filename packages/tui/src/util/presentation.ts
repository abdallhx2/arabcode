import { wordmark as art } from "../logo"

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"

// ألوان هوية عرب كود (truecolor): ذهبيّ لـ arab، أبيض لـ code.
const gold = "\x1b[1m\x1b[38;2;224;180;92m"
const white = "\x1b[1m\x1b[38;2;237;245;240m"

function wordmark(pad = "") {
  return art.arab.map((line, index) => `${pad}${gold}${line}${reset}${white}${art.code[index] ?? ""}${reset}`)
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  return [
    ...wordmark("  "),
    "",
    `  ${weak("الجلسة")}${bold}${input.title}${reset}`,
    `  ${weak("المتابعة")}${bold}arabcode -s ${input.sessionID}${reset}`,
    "",
  ].join("\n")
}
