import { RGBA } from "@opentui/core"
import { createMemo, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import { createColors, createFrames } from "../ui/spinner"
import { registerOpencodeSpinner } from "./register-spinner"

registerOpencodeSpinner()

function lerp(a: RGBA, b: RGBA, t: number) {
  return RGBA.fromValues(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, 1)
}

/**
 * شريط تحميل بأسلوب girih: ماسة ذهبية تمسح المسار ذهاباً وإياباً، وخلفها ذيلٌ
 * يشميّ يتلاشى. ذهبيّ = رأس النبضة (حضور)، يشميّ = الأثر (بنية) — على لغة ألوان عرب كود.
 */
export function LoadingBar(props: { width?: number; head?: RGBA; tail?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()

  const config = createMemo(() => {
    const width = props.width ?? 14
    const head = props.head ?? theme.accent
    const tail = props.tail ?? theme.primary
    const colors = [
      head,
      lerp(head, tail, 0.5),
      tail,
      RGBA.fromValues(tail.r, tail.g, tail.b, 0.5),
      RGBA.fromValues(tail.r, tail.g, tail.b, 0.24),
    ]
    const shared = {
      width,
      style: "diamonds" as const,
      colors,
      defaultColor: RGBA.fromValues(tail.r, tail.g, tail.b, 0.12),
      holdStart: 5,
      holdEnd: 5,
    }
    return {
      frames: createFrames(shared),
      color: createColors(shared),
    }
  })

  return (
    <Show
      when={kv.get("animations_enabled", true)}
      fallback={<text fg={theme.textMuted}>⬥ ⬩ ⬪</text>}
    >
      <spinner frames={config().frames} color={config().color} interval={70} />
    </Show>
  )
}
