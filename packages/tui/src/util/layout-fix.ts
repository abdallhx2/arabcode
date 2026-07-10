/**
 * مصحّح تخطيط لوحة المفاتيح (عربي 101 ↔ QWERTY).
 *
 * حالتان يوميّتان: كتابة أمر إنجليزي والتخطيط عربي (`/يثمح` → `/help`)،
 * وكتابة عربية والتخطيط إنجليزي (`hgsghl` → «السلام»).
 * الأوامر تُصحَّح فوراً (مجموعة معروفة، لا لبس)؛ النثر اقتراح فقط —
 * الكشف محافظ عمداً كي لا يقترح على إدخال مقصود.
 */

// الطبقة الأساسية لتخطيط عربي 101 القياسي (مفتاح QWERTY → حرف عربي)
const EN_TO_AR: Record<string, string> = {
  q: "ض", w: "ص", e: "ث", r: "ق", t: "ف", y: "غ", u: "ع", i: "ه", o: "خ", p: "ح",
  "[": "ج", "]": "د",
  a: "ش", s: "س", d: "ي", f: "ب", g: "ل", h: "ا", j: "ت", k: "ن", l: "م",
  ";": "ك", "'": "ط",
  z: "ئ", x: "ء", c: "ؤ", v: "ر", b: "لا", n: "ى", m: "ة",
  ",": "و", ".": "ز", "/": "ظ", "`": "ذ",
  // طبقة Shift الأساسية (الهمزات وعلامات الترقيم العربية)
  H: "أ", Y: "إ", N: "آ", T: "لإ", B: "لآ", G: "لأ", K: "،", "?": "؟", J: "ـ",
  Q: "َ", W: "ً", E: "ُ", R: "ٌ", A: "ِ", S: "ٍ", X: "ْ",
}

// المعكوس: حرف عربي → مفتاح. الثنائيات (لا لإ لأ لآ) تُعالَج قبل الأحادية.
const AR_TO_EN = new Map<string, string>()
for (const [en, ar] of Object.entries(EN_TO_AR)) {
  if (!AR_TO_EN.has(ar)) AR_TO_EN.set(ar, en)
}
const AR_DIGRAPHS = ["لا", "لإ", "لأ", "لآ"] as const

export function mapEnToAr(text: string): string {
  let out = ""
  for (const ch of text) out += EN_TO_AR[ch] ?? ch
  return out
}

export function mapArToEn(text: string): string {
  let out = ""
  let i = 0
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (AR_DIGRAPHS.includes(two as (typeof AR_DIGRAPHS)[number]) && AR_TO_EN.has(two)) {
      out += AR_TO_EN.get(two)!
      i += 2
      continue
    }
    const one = text[i]!
    out += AR_TO_EN.get(one) ?? one
    i += 1
  }
  return out
}

// كلمات تقنية شائعة عديمة/فقيرة العلّة — تُستثنى من كشف الهراء اللاتيني
const TECH_EXCEPTIONS = new Set([
  "html", "http", "https", "pnpm", "grpc", "ctrl", "glsl", "sftp", "smtp", "dhcp",
  "xhtml", "xml", "sql", "css", "ssh", "npm", "git", "tsx", "jsx", "zsh", "gcc",
  "wsl", "gpg", "svg", "png", "jpg", "pdf", "csv", "yml", "cfg", "src", "dst",
  "cmd", "std", "tmp", "dns", "tcp", "udp", "ftp", "php", "cpp", "js", "ts", "md", "sh",
])

const LATIN_VOWELS = /[aeiou]/gi

/** لاتيني يبدو عربياً مكتوباً بالتخطيط الخاطئ: طويل، قابل للتحويل كلياً، فقير العلّة. */
export function looksLikeArTypedAsEn(word: string): boolean {
  if (word.length < 4) return false
  if (TECH_EXCEPTIONS.has(word.toLowerCase())) return false
  for (const ch of word) if (!(ch in EN_TO_AR)) return false
  const vowels = word.match(LATIN_VOWELS)?.length ?? 0
  return vowels / word.length < 0.15
}

// أشيع الكلمات الإنجليزية في المحادثة التقنية — مرجع كشف العربي المقصود إنجليزياً
const COMMON_EN = new Set(
  (
    "the and for you that this with have not are was but all can what when how why who where will would could should " +
    "there here they them then than these those from into over under about after before again just only also very much " +
    "more most some any each other which their your yours mine ours been being does did doing done goes going gone want " +
    "wants wanted need needs needed make makes making made take takes taking took give gives giving gave find finds finding " +
    "found look looks looking looked show shows showing showed tell tells telling told help helps helping helped work works " +
    "working worked call calls calling called try tries trying tried ask asks asking asked feel feels feeling felt seem seems " +
    "let lets know knows knowing knew think thinks thinking thought good great nice fine okay yes yeah sure right wrong true " +
    "false new old big small long short high low fast slow easy hard open close start stop begin end first last next prev " +
    "previous please thanks thank sorry hello world time day week month year today tomorrow yesterday now later soon never " +
    "always often maybe perhaps really actually probably definitely exactly almost enough too many few little lot line lines " +
    "word words name names file files folder folders code codes test tests testing tested run runs running ran build builds " +
    "building built fix fixes fixing fixed bug bugs error errors issue issues problem problems change changes changing changed " +
    "update updates updating updated create creates creating created delete deletes deleting deleted remove removes removing " +
    "removed add adds adding added edit edits editing edited save saves saving saved load loads loading loaded read reads " +
    "reading write writes writing wrote check checks checking checked review reviews commit commits branch branches merge " +
    "merges push pushes pull pulls clone install installs installed import imports export exports function functions method " +
    "methods class classes type types value values string strings number numbers array arrays object objects list lists item " +
    "items key keys index while loop loops return returns returned print prints log logs debug server client request response " +
    "data database query queries user users login logout password page pages button click clicks input output result results " +
    "search searches replace replaces version versions project projects package packages module modules component components " +
    "style styles color colors text texts image images link links form forms table tables row rows column columns copy paste " +
    "cut undo redo select selects selected send sends sending sent receive receives received message messages email chat "
  )
    .trim()
    .split(/\s+/),
)

const ARABIC_WORD = /^[ء-ي]+$/

/** عربي يبدو إنجليزية مكتوبة بالتخطيط الخاطئ: تحويله كلمة إنجليزية شائعة. */
export function looksLikeEnTypedAsAr(word: string): boolean {
  if (!ARABIC_WORD.test(word)) return false
  const mapped = mapArToEn(word)
  if (mapped.length < 3) return false
  if (!/^[a-z]+$/i.test(mapped)) return false
  return COMMON_EN.has(mapped.toLowerCase())
}

export interface LayoutFix {
  fixed: string
  direction: "en→ar" | "ar→en"
}

export function fixWord(word: string): LayoutFix | undefined {
  if (looksLikeArTypedAsEn(word)) return { fixed: mapEnToAr(word), direction: "en→ar" }
  if (looksLikeEnTypedAsAr(word)) return { fixed: mapArToEn(word), direction: "ar→en" }
  return undefined
}

/**
 * تصحيح فوري لسطر أمر يبدأ بـ"/" (بلا وسائط بعد).
 * يعيد السطر المصحَّح، أو undefined إن كان الأصل سليماً أو التصحيح بلا مطابقة.
 */
export function fixSlashCommand(line: string, knownNames: readonly string[]): string | undefined {
  if (!/^\/\S+$/.test(line)) return undefined
  const body = line.slice(1)
  if (body.length < 2) return undefined
  // الأصل يطابق بادئةً → لا تصحيح (لا نفسد إدخالاً صحيحاً)
  if (knownNames.some((name) => name.startsWith(body))) return undefined
  const isArabic = ARABIC_WORD.test(body)
  const mapped = isArabic ? mapArToEn(body) : mapEnToAr(body)
  if (mapped === body) return undefined
  if (!knownNames.some((name) => name.startsWith(mapped))) return undefined
  return `/${mapped}`
}

export interface ProseCandidate {
  word: string
  fixed: string
  start: number
  end: number
}

// كلمة تشبه كوداً/مساراً/معرّفاً — لا تُفحص أبداً
const CODE_LIKE = /[0-9/._\-`@#\\:]/

/** يفحص كلمات النص المكتملة ويعيد المرشّحات للتصحيح مع مواضعها. */
export function scanProse(text: string): ProseCandidate[] {
  const out: ProseCandidate[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const word = m[0]
    if (CODE_LIKE.test(word)) continue
    const fix = fixWord(word)
    if (fix) out.push({ word, fixed: fix.fixed, start: m.index, end: m.index + word.length })
  }
  return out
}

/** يطبّق المرشّحات على النص (من النهاية للبداية حفاظاً على المواضع). */
export function applyProseFix(text: string, candidates: readonly ProseCandidate[]): string {
  let out = text
  for (const c of [...candidates].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, c.start) + c.fixed + out.slice(c.end)
  }
  return out
}
