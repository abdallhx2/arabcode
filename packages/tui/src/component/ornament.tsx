import { RGBA, TextAttributes } from "@opentui/core"
import { type JSX } from "solid-js"
import { useTheme } from "../context/theme"

/**
 * التوقيع البصري لعرب كود: عقدة هندسية (girih knot) مستوحاة من الزخرفة الإسلامية.
 * تتكرّر هذه العقدة في الفواصل والمؤشّرات عبر الواجهة كلها لتوحيد الهوية.
 */
export const KNOT = "❖"

/** نجمة أخفّ للاستخدامات الثانوية (تيجان/إشارات). */
export const STAR = "✦"

/**
 * شريط girih أفقي: عقدة ── خطّ ── عقدة.
 * متماثل، فيصلح في الاتجاهين دون قلب.
 */
export function Band(props: { width?: number; rule?: RGBA; knot?: RGBA }): JSX.Element {
  const { theme } = useTheme()
  const width = props.width ?? 24
  const ruleColor = props.rule ?? theme.border
  const knotColor = props.knot ?? theme.accent
  return (
    <box flexDirection="row" alignItems="center">
      <text fg={knotColor} selectable={false}>
        {KNOT}
      </text>
      <text fg={ruleColor} selectable={false}>
        {"─".repeat(width)}
      </text>
      <text fg={knotColor} selectable={false}>
        {KNOT}
      </text>
    </box>
  )
}

/**
 * فاصل أفقي بسيط تتوسّطه عقدة التوقيع.
 * يُستخدم بين المقاطع (رسائل، مجموعات أوامر) بدل الخط الأصمّ.
 */
export function Divider(props: { width?: number; rule?: RGBA; knot?: RGBA }): JSX.Element {
  const { theme } = useTheme()
  const width = props.width ?? 24
  const half = Math.max(0, Math.floor((width - 1) / 2))
  const ruleColor = props.rule ?? theme.borderSubtle
  const knotColor = props.knot ?? theme.textMuted
  return (
    <box flexDirection="row" alignItems="center">
      <text fg={ruleColor} selectable={false}>
        {"─".repeat(half)}
      </text>
      <text fg={knotColor} selectable={false}>
        {" " + KNOT + " "}
      </text>
      <text fg={ruleColor} selectable={false}>
        {"─".repeat(width - half - 3)}
      </text>
    </box>
  )
}

/** العقدة وحدها كمؤشّر (مثلاً: عنصر مُختار، سطر نشط). لونها ذهبي افتراضياً. */
export function Knot(props: { color?: RGBA; bold?: boolean }): JSX.Element {
  const { theme } = useTheme()
  return (
    <text
      fg={props.color ?? theme.accent}
      attributes={props.bold ? TextAttributes.BOLD : undefined}
      selectable={false}
    >
      {KNOT}
    </text>
  )
}
