/**
 * الأسماء العربية لأوامر الشرطة المائلة — تُحقن مركزياً في useCommandSlashes.
 * كل أمر يعمل بالاسمين؛ القائمة تعرض العربي أولاً والإنجليزي القانوني خافتاً.
 */
export const COMMAND_AR: Record<string, string> = {
  help: "مساعدة",
  new: "جديد",
  sessions: "جلسات",
  models: "نماذج",
  agents: "وكلاء",
  themes: "سمات",
  connect: "اتصال",
  exit: "خروج",
  share: "مشاركة",
  unshare: "إلغاء-المشاركة",
  compact: "ضغط",
  undo: "تراجع",
  redo: "إعادة",
  thinking: "تفكير",
  export: "تصدير",
  editor: "محرر",
  skills: "مهارات",
  status: "حالة",
  mcps: "خوادم",
  variants: "تنويعات",
  workspaces: "مساحات",
  org: "منظمة",
  debug: "تنقيح",
  diff: "فروقات",
  move: "نقل",
  warp: "وورب",
}

export interface SlashEntryParts {
  display: string
  description?: string
  aliases?: string[]
}

/** يبني حقول مدخلة الإكمال لأمر: عربي المعروض إن وُجدت ترجمة، والاسمان قابلان للكتابة. */
export function arabizeSlashEntry(
  slashName: string,
  desc: string | undefined,
  aliases: string[] | undefined,
): SlashEntryParts {
  const base = (aliases ?? []).map((alias) => `/${alias}`)
  const ar = COMMAND_AR[slashName]
  if (!ar) {
    return {
      display: `/${slashName}`,
      description: desc,
      aliases: base.length > 0 ? base : undefined,
    }
  }
  return {
    display: `/${ar}`,
    description: desc ? `${desc} · /${slashName}` : `/${slashName}`,
    aliases: [...base, `/${slashName}`, `/${ar}`],
  }
}
