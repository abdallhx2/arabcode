import { type ComponentProps } from "solid-js"

const BADGE_BG = "#0c0a07"
const GOLD = "var(--arabcode-gold, #ffaf00)"
const GOLD_DEEP = "#c98a00"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill={BADGE_BG} />
      <rect x="1.5" y="1.5" width="29" height="29" rx="6" fill="none" stroke={GOLD_DEEP} stroke-width="1.5" />
      <text
        x="16"
        y="22.5"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="19"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="18" width="64" height="64" rx="14" fill={BADGE_BG} />
      <rect x="11" y="21" width="58" height="58" rx="12" fill="none" stroke={GOLD_DEEP} stroke-width="3" />
      <text
        x="40"
        y="63"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="38"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <rect x="0" y="5" width="32" height="32" rx="7" fill={BADGE_BG} />
      <rect x="1.5" y="6.5" width="29" height="29" rx="6" fill="none" stroke={GOLD_DEEP} stroke-width="1.5" />
      <text
        x="16"
        y="27.5"
        font-family="'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif"
        font-size="19"
        font-weight="700"
        fill={GOLD}
        text-anchor="middle"
      >
        ع
      </text>
      <text
        x="42"
        y="32"
        font-family="'IBM Plex Sans Arabic', Inter, sans-serif"
        font-size="26"
        font-weight="700"
        letter-spacing="0.5"
      >
        <tspan fill={GOLD}>arab</tspan>
        <tspan fill="var(--icon-strong-base)">code</tspan>
      </text>
    </svg>
  )
}
