import { DialogSelect } from "../../ui/dialog-select"
import { useRoute } from "../../context/route"

export function DialogSubagent(props: { sessionID: string }) {
  const route = useRoute()

  return (
    <DialogSelect
      title="إجراءات الوكيل الفرعي"
      options={[
        {
          title: "فتح",
          value: "subagent.view",
          description: "فتح جلسة الوكيل الفرعي",
          onSelect: (dialog) => {
            route.navigate({
              type: "session",
              sessionID: props.sessionID,
            })
            dialog.clear()
          },
        },
      ]}
    />
  )
}
