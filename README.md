<p align="center">
  <a href="https://github.com/abdallhx2/arabcode">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="arabcode" width="360">
    </picture>
  </a>
</p>

<h1 align="center">arabcode</h1>

<p align="center">
  <b>أول أداة سطر أوامر (CLI) للذكاء الاصطناعي في الطرفية بالعربية الكاملة.</b><br>
  اتجاه RTL صحيح وتشكيل عربي سليم — مبنيّة على <a href="https://opencode.ai">opencode</a> مفتوح المصدر.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/arabcode"><img alt="npm" src="https://img.shields.io/npm/v/arabcode?style=flat-square&color=ffaf00&label=npm"></a>
  <a href="https://github.com/abdallhx2/arabcode/releases"><img alt="release" src="https://img.shields.io/github/v/release/abdallhx2/arabcode?style=flat-square&color=ffaf00&label=release"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ffaf00?style=flat-square">
  <img alt="مبني على opencode" src="https://img.shields.io/badge/%D9%85%D8%A8%D9%86%D9%8A%20%D8%B9%D9%84%D9%89-opencode-555?style=flat-square">
</p>

---

## ✨ المميزات

- **عربية كاملة (RTL + تشكيل)** — يُعرض النص العربي باتجاهه الصحيح وبحروف موصولة، مع تحديد ونسخ منطقيَّين وإدخال عربي داخل الطرفية. هذه إضافة arabcode الجوهرية.
- **تعدّد المزوّدين** — OpenAI و Claude و Gemini وموديلات محلية؛ بدّل الموديل حسب المهمة دون تغيير الأداة.
- **وضعا Build / Plan** — نفّذ مباشرة، أو راجِع الخطة أولًا (قراءة فقط) قبل لمس أي ملف.
- **لقطات الجلسة** — ارجِع لأي نقطة سابقة مع استعادة الملفات إذا سلك الوكيل مسارًا خاطئًا.
- **MCP والأتمتة** — تكامل مع أدوات خارجية وأوضاع `run` / `serve` / `web` لكل سيناريوهات السكربتات.
- **يعمل على كل الأنظمة** — ماك ولينكس وويندوز (x64 و arm64) مع دعم PowerShell الكامل.
- **نماذج مجانية للبدء** · **مفتوح المصدر برخصة MIT**.

لكل التفاصيل: **[دليل الميزات](FEATURES.ar.md)**.

## 📦 التثبيت

```bash
# كل الأنظمة (npm)
npm i -g arabcode

# ماك / لينكس
curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash

# ويندوز (PowerShell)
irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex
```

لكل طرق التثبيت (Homebrew، من المصدر، الإزالة): **[دليل التثبيت](INSTALL.ar.md)**.

## 🚀 البدء السريع

```bash
cd <مشروعك>   # افتح مجلد المشروع
arabcode       # شغّل الأداة
```

## ⬇️ التنزيلات والإصدارات

كل إصدار على **[صفحة الإصدارات](https://github.com/abdallhx2/arabcode/releases)** يحوي ثنائيات **جاهزة للتشغيل** لكل المنصّات (لينكس/ماك/ويندوز على x64 و arm64) — لا حاجة لأي بناء. سكربتات التثبيت أعلاه تجلب الثنائي المناسب لجهازك تلقائيًا من أحدث إصدار.

> أحدث إصدار: **v0.1.0**.

## 🧩 المواصفات

| | |
|---|---|
| الأمر | `arabcode` |
| حزمة npm | `arabcode` |
| المنصّات | macOS · Linux · Windows (x64 · arm64) |
| البنية | ثنائيّ واحد مُصرَّف (Bun) — بلا زمن إقلاع ثقيل |
| الرخصة | MIT |

## 🔗 مبني على opencode

arabcode مبنيّ على [opencode](https://opencode.ai) مفتوح المصدر (رخصة MIT)، ويضيف فوقه **التعريب الكامل للطرفية** (الاتجاه والتشكيل والتحديد/النسخ المنطقي والإدخال). arabcode مشروع **مستقلّ وغير مرتبط رسميًا** بفريق opencode ولا يمثّله، مع الإبقاء على حقوق النشر والترخيص الأصلية.

---

<p align="center">
  <a href="https://github.com/abdallhx2/arabcode">GitHub</a> ·
  <a href="INSTALL.ar.md">التثبيت</a> ·
  <a href="FEATURES.ar.md">الميزات</a>
</p>
