/**
 * سياسة اللغة الافتراضية في arabcode: الحوار عربي، محتوى الملفات إنجليزي.
 * التوجيه بالإنجليزية لأنها الأوثق التزاماً لدى النماذج؛ الناتج السلوكي عربي.
 */
export const BILINGUAL_PROMPT = `<arabcode_language_policy>
Address the user in Arabic: explanations, summaries, questions, and progress notes.
Everything written INTO project files stays in English: code, identifiers, comments,
commit messages, PR titles/descriptions, and documentation files. Technical terms may
remain in English inside Arabic prose. If the user consistently writes in a language
other than Arabic, mirror the user's language instead.
</arabcode_language_policy>`

/** الأولوية: متغيّر البيئة ARABCODE_BILINGUAL ثم الإعداد arabcode.bilingual ثم التفعيل الافتراضي. */
export function bilingualEnabled(cfg: { arabcode?: { bilingual?: boolean } } | undefined): boolean {
  const env = process.env["ARABCODE_BILINGUAL"]
  if (env !== undefined) return env === "true" || env === "1"
  return cfg?.arabcode?.bilingual !== false
}
