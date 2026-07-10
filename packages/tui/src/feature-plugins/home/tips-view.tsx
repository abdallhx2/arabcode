import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}
type Tip = string | ((shortcuts: Shortcuts) => string | undefined)

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

const NO_MODELS_TIP = "شغّل {highlight}/connect{/highlight} لإضافة مزوّد ذكاء اصطناعي وبدء البرمجة"
const NO_MODELS_PARTS = parse(NO_MODELS_TIP)

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function commandText(command: string, shortcut: string) {
  if (!shortcut) return shortcutText(command)
  return `${shortcutText(command)} أو ${shortcutText(shortcut)}`
}

function press(shortcut: string, text: string) {
  if (!shortcut) return undefined
  return `اضغط ${shortcutText(shortcut)} ${text}`
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("opencode.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }
  const tip = createMemo(() => {
    if (props.connected === false) return NO_MODELS_TIP
    const tips = [...TIPS, process.platform !== "win32" ? TERMINAL_SUSPEND_TIP : INPUT_UNDO_TIP].flatMap((item) => {
      const value = typeof item === "string" ? item : item(shortcuts)
      return value ? [value] : []
    })
    return tips[Math.floor(tipOffset * tips.length)] ?? NO_MODELS_TIP
  }, NO_MODELS_TIP)
  // Solid can expose a memo's initial value while a pure computation is pending.
  const parts = createMemo(() => {
    const value = tip()
    if (typeof value === "string") return parse(value)
    return NO_MODELS_PARTS
  }, NO_MODELS_PARTS)

  return (
    <box flexDirection="row-reverse" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        ● نصيحة{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}

const TIPS: Tip[] = [
  "اكتب {highlight}@{/highlight} متبوعاً باسم ملف للبحث الضبابي وإرفاق الملفات",
  "ابدأ الرسالة بـ {highlight}!{/highlight} لتشغيل أوامر shell (مثل {highlight}!ls -la{/highlight})",
  (shortcuts) => press(shortcuts.agentCycle(), "للتنقل بين وكيلي Build وPlan"),
  "استخدم {highlight}/undo{/highlight} للتراجع عن آخر رسالة وتغييرات الملفات",
  "استخدم {highlight}/redo{/highlight} لاستعادة الرسائل وتغييرات الملفات المتراجَع عنها",
  "شغّل {highlight}/share{/highlight} لإنشاء رابط opencode.ai عام",
  "اسحب الصور أو ملفات PDF وأفلتها في الطرفية كسياق",
  (shortcuts) => press(shortcuts.inputPaste(), "للصق الصور من الحافظة في مربع الكتابة"),
  (shortcuts) => `استخدم ${commandText("/editor", shortcuts.editorOpen())} لكتابة الرسائل في محررك الخارجي`,
  "شغّل {highlight}/init{/highlight} لتوليد قواعد المشروع تلقائياً بناءً على شفرة مشروعك",
  (shortcuts) => `استخدم ${commandText("/models", shortcuts.modelList())} للتبديل بين نماذج الذكاء الاصطناعي المتاحة`,
  (shortcuts) => `استخدم ${commandText("/themes", shortcuts.themeList())} للتبديل بين ${themeCount} سمة مدمجة`,
  (shortcuts) => `استخدم ${commandText("/new", shortcuts.sessionNew())} لبدء جلسة محادثة جديدة`,
  (shortcuts) => `استخدم ${commandText("/sessions", shortcuts.sessionList())} لعرض الجلسات وتثبيتها ومتابعتها`,
  (shortcuts) => press(shortcuts.sessionPinToggle(), "في قائمة الجلسات لتثبيت جلسة في الأعلى"),
  (shortcuts) =>
    shortcuts.sessionQuickSwitch1() && shortcuts.sessionQuickSwitch9()
      ? `استخدم ${shortcutText(shortcuts.sessionQuickSwitch1())} حتى ${shortcutText(shortcuts.sessionQuickSwitch9())} للتبديل بين الجلسات المثبّتة`
      : undefined,
  "شغّل {highlight}/compact{/highlight} لتلخيص الجلسات الطويلة قرب حدود السياق",
  (shortcuts) => `استخدم ${commandText("/export", shortcuts.sessionExport())} لحفظ المحادثة بصيغة Markdown`,
  (shortcuts) => press(shortcuts.messagesCopy(), "لنسخ آخر رسالة من المساعد إلى الحافظة"),
  (shortcuts) => press(shortcuts.commandList(), "لعرض كل الإجراءات والأوامر المتاحة"),
  "شغّل {highlight}/connect{/highlight} لإضافة مفاتيح API لأكثر من 75 مزوّد LLM مدعوم",
  (shortcuts) => `مفتاح القيادة هو ${shortcutText(shortcuts.leader())}؛ ادمجه مع مفاتيح أخرى لإجراءات سريعة`,
  (shortcuts) => press(shortcuts.modelCycleRecent(), "للتبديل السريع بين النماذج المستخدمة مؤخراً"),
  (shortcuts) => press(shortcuts.sessionSidebarToggle(), "داخل جلسة لإظهار الشريط الجانبي أو إخفائه"),
  (shortcuts) =>
    shortcuts.messagesPageUp() && shortcuts.messagesPageDown()
      ? `استخدم ${shortcutText(shortcuts.messagesPageUp())}/${shortcutText(shortcuts.messagesPageDown())} للتنقل في سجل المحادثة`
      : undefined,
  (shortcuts) => press(shortcuts.messagesFirst(), "للانتقال إلى بداية المحادثة"),
  (shortcuts) => press(shortcuts.messagesLast(), "للانتقال إلى أحدث رسالة"),
  (shortcuts) => press(shortcuts.inputNewline(), "لإضافة أسطر جديدة في مربع الكتابة"),
  (shortcuts) => press(shortcuts.inputClear(), "أثناء الكتابة لمسح حقل الإدخال"),
  (shortcuts) => press(shortcuts.sessionInterrupt(), "لإيقاف الذكاء الاصطناعي أثناء الرد"),
  "بدّل إلى وكيل {highlight}Plan{/highlight} للحصول على اقتراحات دون إجراء تغييرات",
  "استخدم {highlight}@agent-name{/highlight} في رسائلك لاستدعاء وكلاء فرعيين متخصصين",
  (shortcuts) => {
    const items = [
      shortcuts.sessionParent(),
      shortcuts.childFirst(),
      shortcuts.childPrevious(),
      shortcuts.childNext(),
    ].filter(Boolean)
    if (!items.length) return undefined
    return `استخدم ${items.map(shortcutText).join(" / ")} للتنقل بين الجلسات الأصل والفرعية`
  },
  "أنشئ {highlight}opencode.json{/highlight} لإعدادات الخادم و{highlight}tui.json{/highlight} لواجهة الطرفية",
  "ضع إعدادات واجهة الطرفية في {highlight}~/.config/opencode/tui.json{/highlight} كإعدادات عامة",
  "أضف {highlight}$schema{/highlight} إلى إعداداتك للإكمال التلقائي في محررك",
  "اضبط {highlight}model{/highlight} في الإعدادات لتحديد نموذجك الافتراضي",
  "عدّل أي اختصار في {highlight}tui.json{/highlight} عبر قسم {highlight}keybinds{/highlight}",
  "اضبط أي اختصار على {highlight}none{/highlight} لتعطيله تماماً",
  "اضبط خوادم MCP المحلية أو البعيدة في قسم {highlight}mcp{/highlight} من الإعدادات",
  "أضف ملفات {highlight}.md{/highlight} إلى {highlight}.opencode/commands/{/highlight} لأوامر قابلة لإعادة الاستخدام",
  "استخدم {highlight}$ARGUMENTS{/highlight} و{highlight}$1{/highlight} و{highlight}$2{/highlight} في الأوامر المخصّصة لإدخال ديناميكي",
  "استخدم علامات backtick لإدراج مخرجات shell (مثل {highlight}`git status`{/highlight})",
  "أضف ملفات {highlight}.md{/highlight} إلى {highlight}.opencode/agents/{/highlight} لشخصيات ذكاء اصطناعي متخصصة",
  "اضبط أذونات كل وكيل لأدوات {highlight}edit{/highlight} و{highlight}bash{/highlight} و{highlight}webfetch{/highlight}",
  'استخدم أنماطاً مثل {highlight}"git *": "allow"{/highlight} لأذونات bash دقيقة',
  'اضبط {highlight}"rm -rf *": "deny"{/highlight} لحظر الأوامر المدمّرة',
  'اضبط {highlight}"git push": "ask"{/highlight} لطلب الموافقة قبل تنفيذ push',
  'اضبط {highlight}"formatter": true{/highlight} لتفعيل المنسّقات المدمجة',
  'اضبط {highlight}"formatter": false{/highlight} لتعطيل المنسّقات الموروثة',
  "عرّف أوامر تنسيق مخصّصة مع امتدادات الملفات في الإعدادات",
  'اضبط {highlight}"lsp": true{/highlight} لتفعيل تحليل الشفرة المدمج عبر LSP',
  "أنشئ ملفات {highlight}.ts{/highlight} في {highlight}.opencode/tools/{/highlight} لتعريف أدوات LLM جديدة",
  "يمكن لتعريفات الأدوات استدعاء سكربتات مكتوبة بـ Python وGo وغيرهما",
  "أضف ملفات {highlight}.ts{/highlight} إلى {highlight}.opencode/plugins/{/highlight} لخطافات الأحداث",
  "استخدم الإضافات لإرسال إشعارات نظام التشغيل عند اكتمال الجلسات",
  "أنشئ إضافة لمنع arabcode من قراءة الملفات الحساسة",
  "استخدم {highlight}arabcode run{/highlight} للسكربتات غير التفاعلية",
  "استخدم {highlight}arabcode --continue{/highlight} لاستئناف آخر جلسة",
  "استخدم {highlight}arabcode run -f file.ts{/highlight} لإرفاق الملفات عبر سطر الأوامر",
  "استخدم {highlight}--format json{/highlight} لمخرجات قابلة للقراءة الآلية في السكربتات",
  "شغّل {highlight}arabcode serve{/highlight} للوصول إلى arabcode عبر API دون واجهة",
  "استخدم {highlight}arabcode run --attach{/highlight} للاتصال بخادم قيد التشغيل",
  "شغّل {highlight}arabcode upgrade{/highlight} للتحديث إلى أحدث إصدار",
  "شغّل {highlight}arabcode auth list{/highlight} لعرض كل المزوّدين المضبوطين",
  "شغّل {highlight}arabcode agent create{/highlight} لإنشاء وكيل بخطوات موجّهة",
  "استخدم {highlight}/arabcode{/highlight} في قضايا GitHub وطلبات السحب لتشغيل إجراءات الذكاء الاصطناعي",
  "شغّل {highlight}arabcode github install{/highlight} لإعداد سير عمل GitHub",
  "علّق بـ {highlight}/arabcode fix this{/highlight} على القضايا لإنشاء PRs تلقائياً",
  "علّق بـ {highlight}/oc{/highlight} على أسطر الشفرة في PR لمراجعات شفرة موجّهة",
  'استخدم {highlight}"theme": "system"{/highlight} لمطابقة ألوان طرفيتك',
  "أنشئ ملفات سمات JSON في مجلد {highlight}.opencode/themes/{/highlight}",
  "تدعم السمات متغيّرات داكنة وفاتحة لكلا الوضعين",
  "استخدم رموز ألوان xterm الرقمية 0-255 في ملف السمة المخصّصة",
  "استخدم {highlight}{env:VAR_NAME}{/highlight} لمتغيرات البيئة في الإعدادات",
  "استخدم {highlight}{file:path}{/highlight} لتضمين محتوى الملفات في قيم الإعدادات",
  "استخدم {highlight}instructions{/highlight} في الإعدادات لتحميل ملفات قواعد إضافية",
  "اضبط {highlight}temperature{/highlight} للوكيل من 0.0 (مركّز) إلى 1.0 (إبداعي)",
  "اضبط {highlight}steps{/highlight} لتحديد عدد تكرارات الوكيل لكل طلب",
  'اضبط {highlight}"tools": {"bash": false}{/highlight} لتعطيل أدوات معيّنة',
  'اضبط {highlight}"mcp_*": false{/highlight} لتعطيل كل أدوات خادم MCP',
  "تجاوز إعدادات الأدوات العامة في إعدادات كل وكيل",
  'اضبط {highlight}"share": "auto"{/highlight} لمشاركة كل الجلسات تلقائياً',
  'اضبط {highlight}"share": "disabled"{/highlight} لمنع مشاركة أي جلسة',
  "شغّل {highlight}/unshare{/highlight} لإزالة الجلسة من الوصول العام",
  "إذن {highlight}doom_loop{/highlight} يمنع حلقات استدعاء الأدوات اللانهائية",
  "إذن {highlight}external_directory{/highlight} يحمي الملفات خارج المشروع",
  "شغّل {highlight}arabcode debug config{/highlight} لاستكشاف مشاكل الإعدادات",
  "استخدم راية {highlight}--print-logs{/highlight} لعرض سجلات مفصّلة في stderr",
  (shortcuts) => `استخدم ${commandText("/timeline", shortcuts.sessionTimeline())} للانتقال إلى رسائل محددة`,
  (shortcuts) => press(shortcuts.messagesToggleConceal(), "لتبديل إظهار كتل الشفرة في الرسائل"),
  (shortcuts) => `استخدم ${commandText("/status", shortcuts.statusView())} لعرض معلومات حالة النظام`,
  "فعّل {highlight}scroll_acceleration{/highlight} في {highlight}tui.json{/highlight} لتمرير سلس",
  (shortcuts) =>
    shortcuts.commandList()
      ? `بدّل عرض اسم المستخدم في المحادثة عبر لوحة الأوامر (${shortcutText(shortcuts.commandList())})`
      : "بدّل عرض اسم المستخدم في المحادثة عبر لوحة الأوامر",
  "شغّل {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight} داخل حاوية",
  "استخدم {highlight}/connect{/highlight} مع arabcode Zen لنماذج منتقاة ومختبرة",
  "أضف ملف {highlight}AGENTS.md{/highlight} لمشروعك إلى Git لمشاركته مع الفريق",
  "استخدم {highlight}/review{/highlight} لمراجعة التغييرات غير المرسلة أو الفروع أو PRs",
  (shortcuts) => `استخدم ${commandText("/help", shortcuts.helpShow())} لعرض نافذة المساعدة`,
  "استخدم {highlight}/rename{/highlight} لإعادة تسمية الجلسة الحالية",
]

const INPUT_UNDO_TIP: Tip = (shortcuts) => press(shortcuts.inputUndo(), "للتراجع عن التغييرات في مربع الكتابة")
const TERMINAL_SUSPEND_TIP: Tip = (shortcuts) =>
  press(shortcuts.terminalSuspend(), "لتعليق الطرفية والعودة إلى shell")
