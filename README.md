<p align="center">
  <a href="https://github.com/abdallhx2/arabcode">
    <img src=".github/logo.png" alt="arabcode" width="420">
  </a>
</p>

<p align="center">
  <b>أول أداة سطر أوامر (CLI) للذكاء الاصطناعي في الطرفية بالعربية الكاملة.</b><br>
  اتجاه صحيح من اليمين إلى اليسار (RTL) وتشكيل عربي سليم داخل الطرفية.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/arabcode"><img alt="npm" src="https://img.shields.io/npm/v/arabcode?style=flat-square&color=ffaf00&label=npm"></a>
  <a href="https://github.com/abdallhx2/arabcode/releases"><img alt="release" src="https://img.shields.io/github/v/release/abdallhx2/arabcode?style=flat-square&color=ffaf00&label=release"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ffaf00?style=flat-square">
</p>

<p align="center">
  <a href="README.md">العربية</a> ·
  <a href="README.en.md">English</a>
</p>

---

## نظرة عامة

**arabcode** وكيل ذكاء اصطناعي يعمل في الطرفية: يقرأ مشروعك، ويكتب الكود ويعدّله، وينفّذ الأوامر معك — وكل ذلك بالعربية الكاملة. على خلاف أدوات الطرفية الأخرى التي تكسر النص العربي إلى حروف متقطّعة باتجاه معكوس، يعرض arabcode العربية باتجاهها الصحيح وبحروف موصولة، مع تحديد ونسخ منطقيَّين وإدخال عربي سليم.

الأداة **مجانية ومفتوحة المصدر** برخصة MIT، وتعمل محليًا في طرفيتك دون تخزين كودك أو سياق مشروعك على أي خادم.

## التثبيت

```bash
# npm (كل الأنظمة)
npm i -g arabcode

# ماك / لينكس (curl)
curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash

# ويندوز (PowerShell)
irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex

# Homebrew
brew install abdallhx2/tap/arabcode
```

## البدء السريع

```bash
cd <مشروعك>   # افتح مجلد المشروع
arabcode      # شغّل الأداة
```

اكتب طلبك بالعربية داخل الطرفية، وسيقرأ arabcode ملفاتك ويعدّلها وينفّذ الأوامر نيابةً عنك. للحصول على أفضل عرض للعربية استخدم طرفية تدعم Unicode مثل WezTerm أو Alacritty أو Ghostty أو Kitty.

## المميزات

- **عربية كاملة (RTL + تشكيل).** عرض صحيح للنص العربي باتجاهه، بحروف موصولة، مع تحديد ونسخ يحفظان الترتيب المنطقي، وإدخال عربي سليم داخل حقل الأوامر.
- **تعدّد المزوّدين.** دعم أكثر من 75 مزوّد نماذج عبر Models.dev — OpenAI و Claude و Gemini و Groq و Azure و OpenRouter و GitHub Copilot وغيرها — إضافةً إلى النماذج المحلية المتوافقة مع OpenAI. بدّل النموذج حسب المهمة دون تغيير الأداة.
- **أوضاع build / plan.** وكيلان مدمجان تتنقّل بينهما بمفتاح `Tab`: `build` بصلاحيات كاملة للتطوير، و`plan` للقراءة فقط يحلّل ويخطّط دون لمس الملفات.
- **وكلاء مخصّصة.** أنشئ فريق وكلاء متخصّصين (مراجعة أمان، اختبارات، توثيق) بصلاحيات دقيقة عبر `arabcode agent create`.
- **الجلسات واللقطات.** لقطة لكل جلسة تتيح الرجوع إلى أي رسالة سابقة واستعادة حالة الملفات عند تلك النقطة، مع عرض استهلاك التوكنز والتكلفة.
- **خوادم MCP و Code Mode.** تكامل كامل مع أدواتك الخارجية (قواعد بيانات، APIs، أنظمة ملفات) عبر Model Context Protocol، مع تشغيل سكربتات تنسيق مقيّدة فوقها.
- **تكامل GitHub.** مراجعات PR آلية داخل CI عبر `arabcode github`، وتشغيل الوكيل على أي فرع PR مباشرة، ودعم اشتراك GitHub Copilot كمزوّد مصادقة.
- **أوضاع الأتمتة.** تنفيذ غير تفاعلي عبر `arabcode run`، وخادم HTTP عبر `arabcode serve`، وواجهة ويب كاملة عبر `arabcode web` — تغطي كل سيناريوهات السكربتات والإنتاج.
- **تكامل LSP و Skills.** ذكاء برمجي حقيقي عبر Language Server Protocol، ونظام Skills لإعادة استخدام المنطق المتخصّص.
- **ملف AGENTS.md و `/init`.** يحلّل مشروعك وينشئ ملف توثيق يُقرأ تلقائيًا في كل جلسة ليتوافق الوكيل مع اصطلاحات مشروعك.

## واجهة الويب

لست مقيّدًا بالطرفية. شغّل `arabcode web` فتفتح واجهة ويب كاملة تلقائيًا، بكل قدرات الوكيل وبنفس دعم العربية.

## التوثيق

الوثائق الكاملة — التثبيت والأوامر والإعداد والمزوّدون والوكلاء و MCP وغيرها — متاحة على **[موقع المشروع](https://github.com/abdallhx2/arabcode)**.

## الترخيص

مرخّص بموجب [رخصة MIT](LICENSE).
