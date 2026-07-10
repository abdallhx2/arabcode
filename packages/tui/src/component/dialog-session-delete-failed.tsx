import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { createStore } from "solid-js/store"
import { For } from "solid-js"
import { useBindings } from "../keymap"

export function DialogSessionDeleteFailed(props: {
  session: string
  workspace: string
  onDelete?: () => boolean | void | Promise<boolean | void>
  onRestore?: () => boolean | void | Promise<boolean | void>
  onDone?: () => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "delete" as "delete" | "restore",
  })

  const options = [
    {
      id: "delete" as const,
      title: "حذف مساحة العمل",
      description: "حذف مساحة العمل وجميع الجلسات المرتبطة بها.",
      run: props.onDelete,
    },
    {
      id: "restore" as const,
      title: "الاستعادة إلى مساحة عمل جديدة",
      description: "محاولة استعادة هذه الجلسة في مساحة عمل جديدة.",
      run: props.onRestore,
    },
  ]

  async function confirm() {
    const result = await options.find((item) => item.id === store.active)?.run?.()
    if (result === false) return
    props.onDone?.()
    if (!props.onDone) dialog.clear()
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "تأكيد خيار الاستعادة", group: "الحوار", cmd: () => void confirm() },
      { key: "left", desc: "حذف الجلسة المعطوبة", group: "الحوار", cmd: () => setStore("active", "delete") },
      { key: "up", desc: "حذف الجلسة المعطوبة", group: "الحوار", cmd: () => setStore("active", "delete") },
      { key: "right", desc: "استعادة الجلسة المعطوبة", group: "الحوار", cmd: () => setStore("active", "restore") },
      { key: "down", desc: "استعادة الجلسة المعطوبة", group: "الحوار", cmd: () => setStore("active", "restore") },
    ],
  }))

  return (
    <box paddingRight={2} paddingLeft={2} gap={1}>
      <box flexDirection="row-reverse" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          فشل حذف الجلسة
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme.textMuted} wrapMode="word">
        {`تعذّر حذف الجلسة "${props.session}" لأن مساحة العمل "${props.workspace}" غير متاحة.`}
      </text>
      <text fg={theme.textMuted} wrapMode="word">
        اختر كيف تريد استعادة جلسة مساحة العمل المعطوبة هذه.
      </text>
      <box flexDirection="column" paddingBottom={1} gap={1}>
        <For each={options}>
          {(item) => (
            <box
              flexDirection="column"
              paddingRight={1}
              paddingLeft={1}
              paddingTop={1}
              paddingBottom={1}
              backgroundColor={item.id === store.active ? theme.primary : undefined}
              onMouseUp={() => {
                setStore("active", item.id)
                void confirm()
              }}
            >
              <text
                attributes={TextAttributes.BOLD}
                fg={item.id === store.active ? theme.selectedListItemText : theme.text}
              >
                {item.title}
              </text>
              <text fg={item.id === store.active ? theme.selectedListItemText : theme.textMuted} wrapMode="word">
                {item.description}
              </text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}
