<p align="center">
  <a href="https://github.com/abdallhx2/arabcode">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="شعار arabcode">
    </picture>
  </a>
</p>
<p align="center">arabcode — أول أداة CLI ذكاء اصطناعي للطرفية بالعربية الكاملة (تشكيل واتجاه RTL صحيح).</p>
<p align="center">
  <a href="https://www.npmjs.com/package/arabcode"><img alt="npm" src="https://img.shields.io/npm/v/arabcode?style=flat-square" /></a>
  <a href="https://github.com/abdallhx2/arabcode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/abdallhx2/arabcode/publish.yml?style=flat-square&branch=dev" /></a>
  <a href="https://opencode.ai"><img alt="مبني على opencode" src="https://img.shields.io/badge/%D9%85%D8%A8%D9%86%D9%8A%20%D8%B9%D9%84%D9%89-opencode-ffaf00?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![واجهة arabcode في الطرفية](packages/web/src/assets/lander/screenshot.png)](https://github.com/abdallhx2/arabcode)

---

### التثبيت

```bash
# npm (كل الأنظمة)
npm i -g arabcode

# ماك / لينكس (curl)
curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash

# ويندوز (PowerShell)
irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex
```

لكل طرق التثبيت، انظر [دليل التثبيت](INSTALL.ar.md).

لمعرفة كل الميزات، انظر [دليل الميزات](FEATURES.ar.md).

### البدء السريع

```bash
cd <مشروعك>   # افتح مجلد المشروع
arabcode       # شغّل الأداة
```

### واجهات أخرى

arabcode أداة **طرفية أولًا** (TUI/CLI)، وهي المكان الذي يقدّم فيه تعريبه الكامل (اتجاه RTL + تشكيل). محرّكه opencode يوفّر أيضًا تطبيق سطح مكتب وإضافة محرر وواجهة ويب؛ إن احتجتها فاستخدم [opencode](https://opencode.ai) الأصلي مباشرة.

#### مجلد التثبيت

يحترم سكربت التثبيت ترتيب الاولوية التالي لمسار التثبيت:

1. `$OPENCODE_INSTALL_DIR` - مجلد تثبيت مخصص
2. `$XDG_BIN_DIR` - مسار متوافق مع مواصفات XDG Base Directory
3. `$HOME/bin` - مجلد الثنائيات القياسي للمستخدم (ان وجد او امكن انشاؤه)
4. `$HOME/.arabcode/bin` - المسار الافتراضي الاحتياطي

```bash
# امثلة
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash
```

### Agents

يتضمن arabcode وكيليْن (Agents) مدمجين يمكنك التبديل بينهما باستخدام زر `Tab`.

- **build** - الافتراضي، وكيل بصلاحيات كاملة لاعمال التطوير
- **plan** - وكيل للقراءة فقط للتحليل واستكشاف الكود
  - يرفض تعديل الملفات افتراضيا
  - يطلب الاذن قبل تشغيل اوامر bash
  - مثالي لاستكشاف قواعد كود غير مألوفة او لتخطيط التغييرات

بالاضافة الى ذلك يوجد وكيل فرعي **general** للبحث المعقد والمهام متعددة الخطوات.
يستخدم داخليا ويمكن استدعاؤه بكتابة `@general` في الرسائل.

تعرّف على المزيد في [دليل الميزات](FEATURES.ar.md).

### التوثيق

لكل الميزات انظر [دليل الميزات](FEATURES.ar.md)، ولطرق التثبيت انظر [دليل التثبيت](INSTALL.ar.md). للمزيد راجع [التوثيق](https://github.com/abdallhx2/arabcode#readme).

### المساهمة

إذا كنت مهتمًا بالمساهمة في arabcode، يرجى قراءة [دليل المساهمة](./CONTRIBUTING.md) قبل إرسال pull request.

### النسب والإشعار

arabcode مبني على [opencode](https://opencode.ai) مفتوح المصدر (رخصة MIT) ويضيف إليه التعريب الكامل للطرفية (اتجاه RTL + تشكيل). arabcode مشروع **مستقل وغير مرتبط رسميًا** بفريق opencode ولا يمثّله. رخصة المشروع MIT، مع الإبقاء على حقوق النشر والترخيص الأصلية.

---

**المستودع والدعم:** [GitHub](https://github.com/abdallhx2/arabcode)
