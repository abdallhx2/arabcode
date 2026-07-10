import { TextAttributes } from "@opentui/core"
import { Index } from "solid-js"
import { useTheme } from "../context/theme"
import { wordmark } from "../logo"
import { KNOT } from "./ornament"

/**
 * شعار عرب كود لشاشة البداية (نمط ANSI Shadow).
 * "arab" ذهبيّ = حضور الاسم/الوكيل، "code" أبيض = وضوح ونصاعة،
 * وأسفله سطر عربيّ خافت تحفّه عقدتا التوقيع ❖.
 */
export function Logo() {
  const { theme } = useTheme()

  return (
    <box alignItems="center">
      <Index each={wordmark.arab}>
        {(line, index) => (
          <box flexDirection="row">
            <text fg={theme.accent} attributes={TextAttributes.BOLD} selectable={false}>
              {line()}
            </text>
            <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
              {wordmark.code[index]}
            </text>
          </box>
        )}
      </Index>
      <box height={1} minHeight={0} />
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={theme.accent} selectable={false}>
          {KNOT}
        </text>
        <text fg={theme.textMuted} selectable={false}>
          عرب كود · وكيلك البرمجي بالعربية
        </text>
        <text fg={theme.accent} selectable={false}>
          {KNOT}
        </text>
      </box>
    </box>
  )
}
