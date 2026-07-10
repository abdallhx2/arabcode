import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "./dialog"
import { useBindings, useCommandShortcut } from "../keymap"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const commandShortcut = useCommandShortcut("command.palette.show")

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "إغلاق المساعدة", group: "الحوار", cmd: () => dialog.clear() },
      { key: "escape", desc: "إغلاق المساعدة", group: "الحوار", cmd: () => dialog.clear() },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row-reverse" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          المساعدة
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc/enter
        </text>
      </box>
      <box paddingBottom={1} alignItems="flex-end">
        <text fg={theme.textMuted}>
          اضغط {commandShortcut()} لعرض كل الإجراءات والأوامر المتاحة في أي سياق.
        </text>
      </box>
      <box flexDirection="row" justifyContent="flex-start" paddingBottom={1}>
        <box paddingLeft={3} paddingRight={3} backgroundColor={theme.primary} onMouseUp={() => dialog.clear()}>
          <text fg={theme.selectedListItemText}>موافق</text>
        </box>
      </box>
    </box>
  )
}
