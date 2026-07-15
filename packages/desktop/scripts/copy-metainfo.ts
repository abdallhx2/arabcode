import { resolveChannel } from "./utils"

const arg = process.argv[2]
const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

// appId + launchable مرتبطان بـ appId عبر electron-builder (عقد ثابت) — يبقيان.
const appId = channel === "prod" ? "ai.opencode.desktop" : `ai.opencode.desktop.${channel}`
const productName = channel === "prod" ? "arabcode" : `arabcode ${channel.charAt(0).toUpperCase() + channel.slice(1)}`
const summary =
  channel === "prod"
    ? "وكيل ترميز ذكاء اصطناعي عربي بالكامل"
    : `وكيل ترميز ذكاء اصطناعي عربي بالكامل (${channel})`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="com.github.abdallhx2">
    <name>arabcode</name>
  </developer>

  <description>
    <p>
      arabcode وكيل ذكاء اصطناعي مفتوح المصدر بواجهة عربية كاملة ودعم RTL،
      يساعدك على كتابة وتشغيل الشيفرة مع أي نموذج ذكاء اصطناعي. مبني على opencode (رخصة MIT).
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://github.com/abdallhx2/arabcode/issues</url>
  <url type="homepage">https://github.com/abdallhx2/arabcode</url>
  <url type="vcs-browser">https://github.com/abdallhx2/arabcode</url>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)
console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
