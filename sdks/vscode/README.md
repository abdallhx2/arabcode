# arabcode — إضافة VS Code

إضافة لـ Visual Studio Code تدمج [arabcode](https://github.com/abdallhx2/arabcode)، وكيل الترميز بالذكاء الاصطناعي بالعربية، مباشرةً في سير عملك عبر طرفية مدمجة.

## المتطلبات

تتطلب هذه الإضافة تثبيت أداة arabcode CLI على جهازك. راجع [github.com/abdallhx2/arabcode](https://github.com/abdallhx2/arabcode) لتعليمات التثبيت.

## المزايا

- **تشغيل سريع**: استخدم `Cmd+Esc` (Mac) أو `Ctrl+Esc` (Windows/Linux) لفتح arabcode في طرفية مقسّمة، أو التركيز على جلسة طرفية قائمة إن وُجدت.
- **جلسة جديدة**: استخدم `Cmd+Shift+Esc` (Mac) أو `Ctrl+Shift+Esc` (Windows/Linux) لبدء جلسة طرفية arabcode جديدة حتى لو كانت هناك جلسة مفتوحة. يمكنك أيضًا النقر على زر arabcode في الواجهة.
- **إدراك السياق**: مشاركة التحديد الحالي أو التبويب المفتوح تلقائيًا مع arabcode.
- **اختصارات مرجع الملفات**: استخدم `Cmd+Option+K` (Mac) أو `Alt+Ctrl+K` (Linux/Windows) لإدراج مراجع الملفات، مثل `@File#L37-42`.

## الدعم

هذا إصدار مبكر. إذا واجهت مشكلة أو لديك ملاحظات، فأنشئ مشكلة على https://github.com/abdallhx2/arabcode/issues.

## التطوير

1. `code sdks/vscode` — افتح مجلد `sdks/vscode` في VS Code. **لا تفتحه من جذر المستودع.**
2. `bun install` — نفّذه داخل مجلد `sdks/vscode`.
3. اضغط `F5` لبدء التصحيح — يفتح نافذة VS Code جديدة مع تحميل الإضافة.

#### إجراء التغييرات

يعمل مراقبا `tsc` و`esbuild` تلقائيًا أثناء التصحيح (يظهران في تبويب Terminal). تُعاد بناء تغييرات الإضافة تلقائيًا في الخلفية.

لاختبار تغييراتك:

1. في نافذة التصحيح، اضغط `Cmd+Shift+P`
2. ابحث عن `Developer: Reload Window`
3. أعد التحميل لرؤية تغييراتك دون إعادة تشغيل جلسة التصحيح.
