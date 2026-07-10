import { TextAttributes } from "@opentui/core"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useBindings } from "../keymap"

export function DialogWorkspaceUnavailable(props: { onRestore?: () => boolean | void | Promise<boolean | void> }) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "restore" as "cancel" | "restore",
  })

  const options = ["cancel", "restore"] as const

  async function confirm() {
    if (store.active === "cancel") {
      dialog.clear()
      return
    }
    const result = await props.onRestore?.()
    if (result === false) return
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "تأكيد خيار مساحة العمل", group: "الحوار", cmd: () => void confirm() },
      { key: "left", desc: "إلغاء استعادة مساحة العمل", group: "الحوار", cmd: () => setStore("active", "cancel") },
      { key: "right", desc: "استعادة مساحة العمل", group: "الحوار", cmd: () => setStore("active", "restore") },
    ],
  }))

  return (
    <box paddingRight={2} paddingLeft={2} gap={1}>
      <box flexDirection="row-reverse" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          مساحة العمل غير متاحة
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme.textMuted} wrapMode="word">
        هذه الجلسة مرتبطة بمساحة عمل لم تعد متاحة.
      </text>
      <text fg={theme.textMuted} wrapMode="word">
        هل تريد استعادة هذه الجلسة في مساحة عمل جديدة؟
      </text>
      <box flexDirection="row-reverse" justifyContent="flex-start" paddingBottom={1} gap={1}>
        <For each={options}>
          {(item) => (
            <box
              paddingRight={2}
              paddingLeft={2}
              backgroundColor={item === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                setStore("active", item)
                void confirm()
              }}
            >
              <text fg={item === store.active ? theme.selectedListItemText : theme.textMuted}>{item === "cancel" ? "إلغاء" : "استعادة"}</text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
