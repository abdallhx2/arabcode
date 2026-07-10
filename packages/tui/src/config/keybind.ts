export * as TuiKeybind from "./keybind"

import type { KeyEvent, Renderable } from "@opentui/core"
import type { Binding } from "@opentui/keymap"
import type { BindingCommandMap, BindingConfig, BindingDefaults } from "@opentui/keymap/extras"
import { Schema } from "effect"

const KeyStroke = Schema.Struct({
  name: Schema.String,
  ctrl: Schema.optional(Schema.Boolean),
  shift: Schema.optional(Schema.Boolean),
  meta: Schema.optional(Schema.Boolean),
  super: Schema.optional(Schema.Boolean),
  hyper: Schema.optional(Schema.Boolean),
})

const BindingObject = Schema.StructWithRest(
  Schema.Struct({
    key: Schema.Union([Schema.String, KeyStroke]),
    event: Schema.optional(Schema.Literals(["press", "release"])),
    preventDefault: Schema.optional(Schema.Boolean),
    fallthrough: Schema.optional(Schema.Boolean),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)

const BindingItem = Schema.Union([Schema.String, KeyStroke, BindingObject])
export const BindingValueSchema = Schema.Union([
  Schema.Literal(false),
  Schema.Literal("none"),
  BindingItem,
  Schema.Array(BindingItem),
])
export type BindingValueSchema = Schema.Schema.Type<typeof BindingValueSchema>

type Definition = {
  default: BindingValueSchema
  description: string
}

export const LeaderDefault = "ctrl+x"

const keybind = (value: Definition["default"], description: string): Definition => ({ default: value, description })

export const Definitions = {
  leader: keybind(LeaderDefault, "المفتاح القائد لتركيبات الاختصارات"),

  app_exit: keybind("ctrl+c,ctrl+d,<leader>q", "الخروج من التطبيق"),
  app_debug: keybind("none", "تبديل لوحة التصحيح"),
  app_console: keybind("none", "تبديل وحدة التحكم"),
  app_heap_snapshot: keybind("none", "كتابة لقطة الذاكرة (heap)"),
  app_toggle_animations: keybind("none", "تبديل التأثيرات الحركية"),
  app_toggle_file_context: keybind("none", "تبديل سياق الملف"),
  app_toggle_diffwrap: keybind("none", "تبديل التفاف أسطر التغييرات"),
  app_toggle_paste_summary: keybind("none", "تبديل ملخص اللصق"),
  app_toggle_session_directory_filter: keybind("none", "تبديل تصفية الجلسات حسب المجلد"),
  command_list: keybind("ctrl+p", "عرض الأوامر المتاحة"),
  help_show: keybind("none", "فتح نافذة المساعدة"),
  docs_open: keybind("none", "فتح الوثائق"),
  diff_open: keybind("none", "فتح عارض التغييرات"),
  diff_close: keybind("escape,q", "إغلاق عارض التغييرات"),
  diff_toggle: keybind("enter,space", "تبديل عنصر عارض التغييرات"),
  diff_expand: keybind("right", "توسيع عنصر عارض التغييرات"),
  diff_expand_all: keybind("E", "توسيع كل مجلدات عارض التغييرات"),
  diff_collapse: keybind("left", "طي عنصر عارض التغييرات"),
  diff_switch_focus: keybind("tab", "تبديل التركيز في عارض التغييرات"),
  diff_next_hunk: keybind("]", "الانتقال إلى المقطع التالي من التغييرات"),
  diff_previous_hunk: keybind("[", "الانتقال إلى المقطع السابق من التغييرات"),
  diff_next_file: keybind("n", "الانتقال إلى الملف التالي في التغييرات"),
  diff_previous_file: keybind("p", "الانتقال إلى الملف السابق في التغييرات"),
  diff_toggle_file_tree: keybind("b", "تبديل شجرة الملفات في عارض التغييرات"),
  diff_single_patch: keybind("s", "تبديل عرض patch واحد"),
  diff_switch_source: keybind("d", "تبديل مصدر عارض التغييرات"),
  diff_toggle_view: keybind("v", "التبديل بين العرض المقسوم والموحد في عارض التغييرات"),
  diff_help: keybind("?", "عرض المزيد من اختصارات عارض التغييرات"),

  editor_open: keybind("<leader>e", "فتح المحرر الخارجي"),
  theme_list: keybind("<leader>t", "عرض السمات المتاحة"),
  theme_switch_mode: keybind("none", "التبديل بين الوضع الفاتح والداكن للسمة"),
  theme_mode_lock: keybind("none", "قفل وضع السمة أو فتحه"),
  sidebar_toggle: keybind("<leader>b", "تبديل الشريط الجانبي"),
  scrollbar_toggle: keybind("none", "تبديل شريط تمرير الجلسة"),
  status_view: keybind("<leader>s", "عرض الحالة"),
  debug_view: keybind("none", "عرض معلومات التصحيح"),

  session_export: keybind("<leader>x", "تصدير الجلسة إلى المحرر"),
  session_copy: keybind("none", "نسخ نص الجلسة"),
  session_move: keybind("none", "نقل الجلسة"),
  session_new: keybind("<leader>n", "إنشاء جلسة جديدة"),
  session_list: keybind("<leader>l", "عرض كل الجلسات"),
  session_timeline: keybind("<leader>g", "عرض الخط الزمني للجلسة"),
  session_fork: keybind("none", "تفريع الجلسة من رسالة"),
  session_rename: keybind("ctrl+r", "إعادة تسمية الجلسة"),
  session_delete: keybind("ctrl+d", "حذف الجلسة"),
  session_share: keybind("none", "مشاركة الجلسة الحالية"),
  session_unshare: keybind("none", "إلغاء مشاركة الجلسة الحالية"),
  session_interrupt: keybind("escape", "مقاطعة الجلسة الحالية"),
  session_background: keybind("ctrl+b", "نقل الوكلاء الفرعيين المتزامنين إلى الخلفية"),
  session_compact: keybind("<leader>c", "ضغط الجلسة"),
  session_toggle_timestamps: keybind("none", "تبديل الطوابع الزمنية للرسائل"),
  session_toggle_generic_tool_output: keybind("none", "تبديل مخرجات الأدوات العامة"),
  session_queued_prompts: keybind("<leader>q", "إدارة الطلبات في قائمة الانتظار"),
  session_child_first: keybind("<leader>down", "الانتقال إلى أول جلسة فرعية"),
  session_child_cycle: keybind("right", "الانتقال إلى الجلسة الفرعية التالية"),
  session_child_cycle_reverse: keybind("left", "الانتقال إلى الجلسة الفرعية السابقة"),
  session_parent: keybind("up", "الانتقال إلى الجلسة الأم"),
  session_pin_toggle: keybind("ctrl+f", "تثبيت الجلسة في قائمة الجلسات أو إلغاء تثبيتها"),
  session_quick_switch_1: keybind("<leader>1", "التبديل إلى الجلسة في الخانة السريعة 1"),
  session_quick_switch_2: keybind("<leader>2", "التبديل إلى الجلسة في الخانة السريعة 2"),
  session_quick_switch_3: keybind("<leader>3", "التبديل إلى الجلسة في الخانة السريعة 3"),
  session_quick_switch_4: keybind("<leader>4", "التبديل إلى الجلسة في الخانة السريعة 4"),
  session_quick_switch_5: keybind("<leader>5", "التبديل إلى الجلسة في الخانة السريعة 5"),
  session_quick_switch_6: keybind("<leader>6", "التبديل إلى الجلسة في الخانة السريعة 6"),
  session_quick_switch_7: keybind("<leader>7", "التبديل إلى الجلسة في الخانة السريعة 7"),
  session_quick_switch_8: keybind("<leader>8", "التبديل إلى الجلسة في الخانة السريعة 8"),
  session_quick_switch_9: keybind("<leader>9", "التبديل إلى الجلسة في الخانة السريعة 9"),

  stash_delete: keybind("ctrl+d", "حذف عنصر من stash"),
  model_provider_list: keybind("ctrl+a", "فتح قائمة المزوّدين من نافذة النماذج"),
  model_favorite_toggle: keybind("ctrl+f", "تبديل حالة تفضيل النموذج"),
  model_list: keybind("<leader>m", "عرض النماذج المتاحة"),
  model_cycle_recent: keybind("f2", "النموذج التالي من المستخدمة مؤخراً"),
  model_cycle_recent_reverse: keybind("shift+f2", "النموذج السابق من المستخدمة مؤخراً"),
  model_cycle_favorite: keybind("none", "النموذج المفضل التالي"),
  model_cycle_favorite_reverse: keybind("none", "النموذج المفضل السابق"),
  mcp_list: keybind("none", "عرض خوادم MCP"),
  provider_connect: keybind("none", "الاتصال بمزوّد"),
  console_org_switch: keybind("none", "تبديل منظمة وحدة التحكم"),
  agent_list: keybind("<leader>a", "عرض الوكلاء"),
  agent_cycle: keybind("tab", "الوكيل التالي"),
  agent_cycle_reverse: keybind("shift+tab", "الوكيل السابق"),
  variant_cycle: keybind("ctrl+t", "التنقل بين متغيّرات النموذج"),
  variant_list: keybind("none", "عرض متغيّرات النموذج"),

  messages_page_up: keybind("pageup,ctrl+alt+b", "تمرير الرسائل لأعلى صفحة واحدة"),
  messages_page_down: keybind("pagedown,ctrl+alt+f", "تمرير الرسائل لأسفل صفحة واحدة"),
  messages_line_up: keybind("ctrl+alt+y", "تمرير الرسائل لأعلى سطراً واحداً"),
  messages_line_down: keybind("ctrl+alt+e", "تمرير الرسائل لأسفل سطراً واحداً"),
  messages_half_page_up: keybind("ctrl+alt+u", "تمرير الرسائل لأعلى نصف صفحة"),
  messages_half_page_down: keybind("ctrl+alt+d", "تمرير الرسائل لأسفل نصف صفحة"),
  messages_first: keybind("ctrl+g,home", "الانتقال إلى أول رسالة"),
  messages_last: keybind("ctrl+alt+g,end", "الانتقال إلى آخر رسالة"),
  messages_next: keybind("none", "الانتقال إلى الرسالة التالية"),
  messages_previous: keybind("none", "الانتقال إلى الرسالة السابقة"),
  messages_last_user: keybind("none", "الانتقال إلى آخر رسالة للمستخدم"),
  messages_copy: keybind("<leader>y", "نسخ الرسالة"),
  messages_undo: keybind("<leader>u", "تراجع عن الرسالة"),
  messages_redo: keybind("<leader>r", "إعادة الرسالة"),
  messages_toggle_conceal: keybind("<leader>h", "تبديل إخفاء كتل الشيفرة في الرسائل"),
  tool_details: keybind("none", "تبديل عرض تفاصيل الأدوات"),
  display_thinking: keybind("none", "تبديل عرض كتل التفكير"),

  prompt_submit: keybind("none", "إرسال الطلب"),
  prompt_editor_context_clear: keybind("none", "مسح سياق المحرر"),
  prompt_skills: keybind("none", "فتح قائمة اختيار المهارات"),
  prompt_stash: keybind("none", "حفظ الطلب في stash"),
  prompt_stash_pop: keybind("none", "استرجاع الطلب المحفوظ في stash"),
  prompt_stash_list: keybind("none", "عرض الطلبات المحفوظة في stash"),
  workspace_set: keybind("none", "تعيين مساحة العمل"),

  input_clear: keybind("ctrl+c", "مسح حقل الإدخال"),
  input_paste: keybind({ key: "ctrl+v", preventDefault: false }, "لصق من الحافظة"),
  input_submit: keybind("return", "إرسال الإدخال"),
  input_newline: keybind("shift+return,ctrl+return,alt+return,ctrl+j", "إدراج سطر جديد في الإدخال"),
  input_move_left: keybind("left,ctrl+b", "تحريك المؤشر لليسار في الإدخال"),
  input_move_right: keybind("right,ctrl+f", "تحريك المؤشر لليمين في الإدخال"),
  input_move_up: keybind("up", "تحريك المؤشر لأعلى في الإدخال"),
  input_move_down: keybind("down", "تحريك المؤشر لأسفل في الإدخال"),
  input_select_left: keybind("shift+left", "التحديد لليسار في الإدخال"),
  input_select_right: keybind("shift+right", "التحديد لليمين في الإدخال"),
  input_select_up: keybind("shift+up", "التحديد لأعلى في الإدخال"),
  input_select_down: keybind("shift+down", "التحديد لأسفل في الإدخال"),
  input_line_home: keybind("ctrl+a", "الانتقال إلى بداية السطر في الإدخال"),
  input_line_end: keybind("ctrl+e", "الانتقال إلى نهاية السطر في الإدخال"),
  input_select_line_home: keybind("ctrl+shift+a", "التحديد حتى بداية السطر في الإدخال"),
  input_select_line_end: keybind("ctrl+shift+e", "التحديد حتى نهاية السطر في الإدخال"),
  input_visual_line_home: keybind("alt+a", "الانتقال إلى بداية السطر المرئي في الإدخال"),
  input_visual_line_end: keybind("alt+e", "الانتقال إلى نهاية السطر المرئي في الإدخال"),
  input_select_visual_line_home: keybind("alt+shift+a", "التحديد حتى بداية السطر المرئي في الإدخال"),
  input_select_visual_line_end: keybind("alt+shift+e", "التحديد حتى نهاية السطر المرئي في الإدخال"),
  input_buffer_home: keybind("home", "الانتقال إلى بداية النص في الإدخال"),
  input_buffer_end: keybind("end", "الانتقال إلى نهاية النص في الإدخال"),
  input_select_buffer_home: keybind("shift+home", "التحديد حتى بداية النص في الإدخال"),
  input_select_buffer_end: keybind("shift+end", "التحديد حتى نهاية النص في الإدخال"),
  input_delete_line: keybind("ctrl+shift+d", "حذف السطر في الإدخال"),
  input_delete_to_line_end: keybind("ctrl+k", "الحذف حتى نهاية السطر في الإدخال"),
  input_delete_to_line_start: keybind("ctrl+u", "الحذف حتى بداية السطر في الإدخال"),
  input_backspace: keybind("backspace,shift+backspace", "حذف للخلف في الإدخال"),
  input_delete: keybind("ctrl+d,delete,shift+delete", "حذف حرف في الإدخال"),
  input_undo: keybind("ctrl+-,super+z", "تراجع في الإدخال"),
  input_redo: keybind("ctrl+.,super+shift+z", "إعادة في الإدخال"),
  input_word_forward: keybind("alt+f,alt+right,ctrl+right", "الانتقال كلمة للأمام في الإدخال"),
  input_word_backward: keybind("alt+b,alt+left,ctrl+left", "الانتقال كلمة للخلف في الإدخال"),
  input_select_word_forward: keybind("alt+shift+f,alt+shift+right", "تحديد كلمة للأمام في الإدخال"),
  input_select_word_backward: keybind("alt+shift+b,alt+shift+left", "تحديد كلمة للخلف في الإدخال"),
  input_delete_word_forward: keybind("alt+d,alt+delete,ctrl+delete", "حذف كلمة للأمام في الإدخال"),
  input_delete_word_backward: keybind("ctrl+w,ctrl+backspace,alt+backspace", "حذف كلمة للخلف في الإدخال"),
  input_select_all: keybind("super+a", "تحديد الكل في الإدخال"),
  history_previous: keybind("up", "عنصر السجل السابق"),
  history_next: keybind("down", "عنصر السجل التالي"),

  "dialog.select.prev": keybind("up,ctrl+p", "الانتقال إلى عنصر النافذة السابق"),
  "dialog.select.next": keybind("down,ctrl+n", "الانتقال إلى عنصر النافذة التالي"),
  "dialog.select.page_up": keybind("pageup", "الانتقال لأعلى صفحة واحدة في النافذة"),
  "dialog.select.page_down": keybind("pagedown", "الانتقال لأسفل صفحة واحدة في النافذة"),
  "dialog.select.home": keybind("home", "الانتقال إلى أول عنصر في النافذة"),
  "dialog.select.end": keybind("end", "الانتقال إلى آخر عنصر في النافذة"),
  "dialog.select.submit": keybind("return", "تأكيد العنصر المختار في النافذة"),
  "dialog.prompt.submit": keybind("return", "إرسال إدخال النافذة"),
  "dialog.mcp.toggle": keybind("space", "تبديل MCP في نافذة MCP"),
  "dialog.move_session.new": keybind("ctrl+m", "نسخة مشروع جديدة"),
  "dialog.move_session.delete": keybind("ctrl+d", "حذف نسخة المشروع"),
  "dialog.move_session.refresh": keybind("ctrl+r", "تحديث نسخ المشاريع"),
  "prompt.autocomplete.prev": keybind("up,ctrl+p", "الانتقال إلى عنصر الإكمال التلقائي السابق"),
  "prompt.autocomplete.next": keybind("down,ctrl+n", "الانتقال إلى عنصر الإكمال التلقائي التالي"),
  "prompt.autocomplete.hide": keybind("escape", "إخفاء الإكمال التلقائي"),
  "prompt.autocomplete.select": keybind("return", "اختيار عنصر الإكمال التلقائي"),
  "prompt.autocomplete.complete": keybind("tab", "إكمال عنصر الإكمال التلقائي"),
  "permission.prompt.fullscreen": keybind("ctrl+f", "تبديل ملء الشاشة لطلب الإذن"),
  "plugins.toggle": keybind("space", "تبديل الإضافة"),
  "dialog.plugins.install": keybind("shift+i", "تثبيت إضافة من نافذة الإضافات"),

  terminal_suspend: keybind("ctrl+z", "تعليق الطرفية"),
  terminal_title_toggle: keybind("none", "تبديل عنوان الطرفية"),
  tips_toggle: keybind("<leader>h", "تبديل النصائح في الشاشة الرئيسية"),
  plugin_manager: keybind("none", "فتح نافذة إدارة الإضافات"),
  plugin_install: keybind("none", "تثبيت إضافة"),

  which_key_toggle: keybind("ctrl+alt+k", "تبديل لوحة which-key"),
  which_key_layout_toggle: keybind("ctrl+alt+shift+k", "تبديل تخطيط which-key"),
  which_key_pending_toggle: keybind("ctrl+alt+shift+p", "تبديل معاينة which-key المعلّقة"),
  which_key_group_previous: keybind("ctrl+alt+left,ctrl+alt+[", "مجموعة which-key السابقة"),
  which_key_group_next: keybind("ctrl+alt+right,ctrl+alt+]", "مجموعة which-key التالية"),
  which_key_scroll_up: keybind("ctrl+alt+up,ctrl+alt+p", "تمرير which-key لأعلى"),
  which_key_scroll_down: keybind("ctrl+alt+down,ctrl+alt+n", "تمرير which-key لأسفل"),
  which_key_page_up: keybind("ctrl+alt+pageup", "تمرير which-key صفحة لأعلى"),
  which_key_page_down: keybind("ctrl+alt+pagedown", "تمرير which-key صفحة لأسفل"),
  which_key_home: keybind("ctrl+alt+home", "الانتقال إلى أول اختصار في which-key"),
  which_key_end: keybind("ctrl+alt+end", "الانتقال إلى آخر اختصار في which-key"),
} satisfies Record<string, Definition>

type KeybindName = keyof typeof Definitions
const KeybindNames = new Set<string>(Object.keys(Definitions))

export const KeybindOverrides = Schema.Struct(
  Object.fromEntries(
    Object.entries(Definitions).map(([name, item]) => [
      name,
      Schema.optional(BindingValueSchema).annotate({ description: item.description }),
    ]),
  ),
).annotate({ description: "تجاوزات اختصارات الواجهة" })
export const Descriptions = Object.fromEntries(
  Object.entries(Definitions).map(([name, item]) => [name, item.description]),
) as Record<KeybindName, string>
export const CommandMap = {
  app_exit: "app.exit",
  app_debug: "app.debug",
  app_console: "app.console",
  app_heap_snapshot: "app.heap_snapshot",
  app_toggle_animations: "app.toggle.animations",
  app_toggle_file_context: "app.toggle.file_context",
  app_toggle_diffwrap: "app.toggle.diffwrap",
  app_toggle_paste_summary: "app.toggle.paste_summary",
  app_toggle_session_directory_filter: "app.toggle.session_directory_filter",
  command_list: "command.palette.show",
  help_show: "help.show",
  docs_open: "docs.open",
  diff_open: "diff.open",
  diff_close: "diff.close",
  diff_toggle: "diff.toggle",
  diff_expand: "diff.expand",
  diff_expand_all: "diff.expand_all",
  diff_collapse: "diff.collapse",
  diff_switch_focus: "diff.switch_focus",
  diff_next_hunk: "diff.next_hunk",
  diff_previous_hunk: "diff.previous_hunk",
  diff_next_file: "diff.next_file",
  diff_previous_file: "diff.previous_file",
  diff_toggle_file_tree: "diff.toggle_file_tree",
  diff_single_patch: "diff.single_patch",
  diff_switch_source: "diff.switch_source",
  diff_toggle_view: "diff.toggle_view",
  diff_help: "diff.help",
  editor_open: "prompt.editor",
  theme_list: "theme.switch",
  theme_switch_mode: "theme.switch_mode",
  theme_mode_lock: "theme.mode.lock",
  sidebar_toggle: "session.sidebar.toggle",
  scrollbar_toggle: "session.toggle.scrollbar",
  status_view: "opencode.status",
  debug_view: "opencode.debug",
  session_export: "session.export",
  session_copy: "session.copy",
  session_move: "session.move",
  session_new: "session.new",
  session_list: "session.list",
  session_timeline: "session.timeline",
  session_fork: "session.fork",
  session_rename: "session.rename",
  session_delete: "session.delete",
  session_share: "session.share",
  session_unshare: "session.unshare",
  session_interrupt: "session.interrupt",
  session_background: "session.background",
  session_compact: "session.compact",
  session_toggle_timestamps: "session.toggle.timestamps",
  session_toggle_generic_tool_output: "session.toggle.generic_tool_output",
  session_queued_prompts: "session.queued_prompts",
  session_child_first: "session.child.first",
  session_child_cycle: "session.child.next",
  session_child_cycle_reverse: "session.child.previous",
  session_parent: "session.parent",
  session_pin_toggle: "session.pin.toggle",
  session_quick_switch_1: "session.quick_switch.1",
  session_quick_switch_2: "session.quick_switch.2",
  session_quick_switch_3: "session.quick_switch.3",
  session_quick_switch_4: "session.quick_switch.4",
  session_quick_switch_5: "session.quick_switch.5",
  session_quick_switch_6: "session.quick_switch.6",
  session_quick_switch_7: "session.quick_switch.7",
  session_quick_switch_8: "session.quick_switch.8",
  session_quick_switch_9: "session.quick_switch.9",
  stash_delete: "stash.delete",
  model_provider_list: "model.dialog.provider",
  model_favorite_toggle: "model.dialog.favorite",
  model_list: "model.list",
  model_cycle_recent: "model.cycle_recent",
  model_cycle_recent_reverse: "model.cycle_recent_reverse",
  model_cycle_favorite: "model.cycle_favorite",
  model_cycle_favorite_reverse: "model.cycle_favorite_reverse",
  mcp_list: "mcp.list",
  provider_connect: "provider.connect",
  console_org_switch: "console.org.switch",
  agent_list: "agent.list",
  agent_cycle: "agent.cycle",
  agent_cycle_reverse: "agent.cycle.reverse",
  variant_cycle: "variant.cycle",
  variant_list: "variant.list",
  messages_page_up: "session.page.up",
  messages_page_down: "session.page.down",
  messages_line_up: "session.line.up",
  messages_line_down: "session.line.down",
  messages_half_page_up: "session.half.page.up",
  messages_half_page_down: "session.half.page.down",
  messages_first: "session.first",
  messages_last: "session.last",
  messages_next: "session.message.next",
  messages_previous: "session.message.previous",
  messages_last_user: "session.messages_last_user",
  messages_copy: "messages.copy",
  messages_undo: "session.undo",
  messages_redo: "session.redo",
  messages_toggle_conceal: "session.toggle.conceal",
  tool_details: "session.toggle.actions",
  display_thinking: "session.toggle.thinking",
  prompt_submit: "prompt.submit",
  prompt_editor_context_clear: "prompt.editor_context.clear",
  prompt_skills: "prompt.skills",
  prompt_stash: "prompt.stash",
  prompt_stash_pop: "prompt.stash.pop",
  prompt_stash_list: "prompt.stash.list",
  workspace_set: "workspace.set",
  input_clear: "prompt.clear",
  input_paste: "prompt.paste",
  input_submit: "input.submit",
  input_newline: "input.newline",
  input_move_left: "input.move.left",
  input_move_right: "input.move.right",
  input_move_up: "input.move.up",
  input_move_down: "input.move.down",
  input_select_left: "input.select.left",
  input_select_right: "input.select.right",
  input_select_up: "input.select.up",
  input_select_down: "input.select.down",
  input_line_home: "input.line.home",
  input_line_end: "input.line.end",
  input_select_line_home: "input.select.line.home",
  input_select_line_end: "input.select.line.end",
  input_visual_line_home: "input.visual.line.home",
  input_visual_line_end: "input.visual.line.end",
  input_select_visual_line_home: "input.select.visual.line.home",
  input_select_visual_line_end: "input.select.visual.line.end",
  input_buffer_home: "input.buffer.home",
  input_buffer_end: "input.buffer.end",
  input_select_buffer_home: "input.select.buffer.home",
  input_select_buffer_end: "input.select.buffer.end",
  input_delete_line: "input.delete.line",
  input_delete_to_line_end: "input.delete.to.line.end",
  input_delete_to_line_start: "input.delete.to.line.start",
  input_backspace: "input.backspace",
  input_delete: "input.delete",
  input_undo: "input.undo",
  input_redo: "input.redo",
  input_word_forward: "input.word.forward",
  input_word_backward: "input.word.backward",
  input_select_word_forward: "input.select.word.forward",
  input_select_word_backward: "input.select.word.backward",
  input_delete_word_forward: "input.delete.word.forward",
  input_delete_word_backward: "input.delete.word.backward",
  input_select_all: "input.select.all",
  history_previous: "prompt.history.previous",
  history_next: "prompt.history.next",
  terminal_suspend: "terminal.suspend",
  terminal_title_toggle: "terminal.title.toggle",
  tips_toggle: "tips.toggle",
  plugin_manager: "plugins.list",
  plugin_install: "plugins.install",
  which_key_toggle: "which-key.toggle",
  which_key_layout_toggle: "which-key.layout.toggle",
  which_key_pending_toggle: "which-key.pending.toggle",
  which_key_group_previous: "which-key.group.previous",
  which_key_group_next: "which-key.group.next",
  which_key_scroll_up: "which-key.scroll.up",
  which_key_scroll_down: "which-key.scroll.down",
  which_key_page_up: "which-key.page.up",
  which_key_page_down: "which-key.page.down",
  which_key_home: "which-key.home",
  which_key_end: "which-key.end",
} satisfies BindingCommandMap
const CommandDescriptions = Object.fromEntries(
  Object.entries(Definitions).map(([name, item]) => [
    CommandMap[name as keyof typeof CommandMap] ?? name,
    item.description,
  ]),
) as Record<string, string>

export type Keybinds = { [K in KeybindName]: BindingValueSchema }
export type KeybindOverrides = Partial<Keybinds>
export type BindingLookupView = {
  readonly bindings: readonly Binding<Renderable, KeyEvent>[]
  get(command: string): readonly Binding<Renderable, KeyEvent>[]
  has(command: string): boolean
  gather(name: string, commands: readonly string[]): readonly Binding<Renderable, KeyEvent>[]
  pick(name: string, commands: readonly string[]): Binding<Renderable, KeyEvent>[]
  omit(name: string, commands: readonly string[]): Binding<Renderable, KeyEvent>[]
}

export function toBindingConfig(keybinds: Keybinds): BindingConfig<Renderable, KeyEvent> {
  return Object.fromEntries(Object.entries(keybinds)) as BindingConfig<Renderable, KeyEvent>
}

const decodeBindingValue = Schema.decodeUnknownSync(BindingValueSchema)

export function defaultValue(name: KeybindName) {
  return Definitions[name].default
}

export function parse(keybinds: KeybindOverrides): Keybinds {
  const invalid = unknownKeys(keybinds)
  if (invalid.length) throw new Error(`Unrecognized keybind${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}`)
  return Object.fromEntries(
    Object.entries(Definitions).map(([name, item]) => [
      name,
      decodeBindingValue(keybinds[name as KeybindName] ?? item.default),
    ]),
  ) as Keybinds
}

export const Keybinds = { parse }

export function unknownKeys(input: object) {
  return Object.keys(input).filter((key) => !KeybindNames.has(key))
}

export function bindingDefaults(): BindingDefaults<Renderable, KeyEvent> {
  return ({ command, binding }) => {
    if (binding.desc !== undefined) return
    return { desc: CommandDescriptions[command] }
  }
}
