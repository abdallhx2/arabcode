import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, For } from "solid-js"
import { InstallationChannel, InstallationVersion } from "@arabcode/core/installation/version"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useRoute } from "../context/route"
import { useLocal } from "../context/local"
import { useClipboard } from "../context/clipboard"
import { useToast } from "../ui/toast"
import { useBindings } from "../keymap"
import { describeOS, describeTerminal } from "../util/system"

export function DialogDebug() {
  const { theme } = useTheme()
  const dialog = useDialog()
  const route = useRoute()
  const local = useLocal()
  const clipboard = useClipboard()
  const toast = useToast()
  const [copied, setCopied] = createSignal(false)

  dialog.setSize("large")

  const entries = createMemo(() => {
    const model = local.model.current()
    return [
      { label: "الإصدار", value: `${InstallationVersion} (${InstallationChannel})` },
      { label: "التاريخ", value: new Date().toISOString() },
      { label: "نظام التشغيل", value: describeOS() },
      { label: "الطرفية", value: describeTerminal() },
      { label: "معرّف الجلسة", value: route.data.type === "session" ? route.data.sessionID : "غير متوفر" },
      { label: "النموذج", value: model ? `${model.providerID}/${model.modelID}` : "غير متوفر" },
    ]
  })

  const copy = () => {
    const text = entries()
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("\n")
    void clipboard
      .write?.(text)
      .then(() => {
        setCopied(true)
        toast.show({ message: "تم نسخ معلومات التصحيح إلى الحافظة", variant: "info" })
      })
      .catch(toast.error)
  }

  useBindings(() => ({
    bindings: [{ key: "return", desc: "نسخ معلومات التصحيح", group: "الحوار", cmd: copy }],
  }))

  return (
    <box paddingRight={2} paddingLeft={2} gap={1} paddingBottom={1}>
      <box flexDirection="row-reverse" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          التصحيح
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      {/* No click-to-copy here: releasing a mouse selection must trigger the
          global copy-on-select so users can copy a single value, e.g. the session id. */}
      <box>
        <For each={entries()}>
          {(entry) => (
            <box flexDirection="row-reverse" gap={1}>
              <text flexShrink={0} fg={theme.textMuted}>
                {entry.label.padEnd(10)}
              </text>
              <text fg={theme.text} wrapMode="word">
                {entry.value}
              </text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="row-reverse" justifyContent="space-between">
        <text fg={theme.textMuted}>شارك هذه المعلومات عند الإبلاغ عن مشكلة.</text>
        <text onMouseUp={copy}>
          <span style={{ fg: copied() ? theme.success : theme.text }}>
            <b>{copied() ? "✓ تم النسخ" : "نسخ"}</b>{" "}
          </span>
          <span style={{ fg: theme.textMuted }}>enter</span>
        </text>
      </box>
    </box>
  )
}
