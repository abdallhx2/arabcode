# دليل تثبيت arabcode

arabcode — أول أداة CLI ذكاء اصطناعي للطرفية بالعربية الكاملة (تشكيل واتجاه RTL صحيح).

يشرح هذا الدليل كل طرق تثبيت arabcode على ماك ولينكس وويندوز، مع خطوات التحقق والبدء السريع وإزالة التثبيت.

لمعرفة كل الميزات، انظر [دليل الميزات](FEATURES.ar.md).

## المتطلبات

- **طرفية تدعم Unicode**: ضرورية لعرض النص العربي مع التشكيل واتجاه RTL بشكل صحيح.
- **Node.js و npm**: مطلوبة فقط لطريقة التثبيت عبر npm (يُنصح بإصدار حديث ومدعوم من Node.js).
- **ripgrep** (موصى به): يُسرّع البحث داخل المشاريع بشكل ملحوظ، لكنه اختياري.

## طرق التثبيت

### npm (كل الأنظمة)

```bash
npm i -g arabcode
```

### ماك / لينكس (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash
```

### ويندوز (PowerShell)

```powershell
irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex
```

### Homebrew (ماك / لينكس)

```bash
brew install abdallhx2/tap/arabcode
```

### من المصدر

```bash
git clone https://github.com/abdallhx2/arabcode && cd arabcode && bun install && bun run --cwd packages/opencode dev
```

## التحقق من التثبيت

تأكد من نجاح التثبيت بعرض رقم الإصدار ثم تشغيل الأداة:

```bash
arabcode --version
arabcode
```

## البدء السريع

```bash
cd <مشروعك>   # افتح مجلد المشروع
arabcode       # شغّل الأداة
```

## إزالة التثبيت

اختر الطريقة المطابقة لكيفية تثبيتك:

- **npm**:

  ```bash
  npm uninstall -g arabcode
  ```

- **ماك / لينكس (curl أو من المصدر)**: احذف مجلد التثبيت وأزل مدخل PATH المرتبط به:

  ```bash
  rm -rf ~/.arabcode
  ```

  ثم أزل السطر الذي يضيف `~/.arabcode/bin` إلى `PATH` من ملف الإعداد الخاص بطرفيتك (مثل `~/.bashrc` أو `~/.zshrc`).

- **ويندوز (PowerShell)**: احذف مجلد التثبيت وأزل مدخل PATH:

  ```powershell
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\arabcode"
  ```

  ثم أزل `%LOCALAPPDATA%\arabcode\bin` من متغير البيئة `PATH`.

- **Homebrew**:

  ```bash
  brew uninstall arabcode
  ```

## ملاحظة حول القوالب

هذا المشروع يُوزَّع كقوالب قابلة للتخصيص، لذلك تحتوي بعض الأوامر على رموز نائبة (placeholders) يجب على القائم على الصيانة استبدالها بقيم حقيقية قبل النشر:

| الرمز النائب | المعنى |
|---|---|
| `abdallhx2` | مالك المستودع على GitHub (مستخدم أو منظمة) |
| `https://raw.githubusercontent.com/abdallhx2/arabcode/main/install` | رابط سكربت التثبيت لـ bash (ماك / لينكس) |
| `https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1` | رابط سكربت التثبيت لـ PowerShell (ويندوز) |
| `https://github.com/abdallhx2/arabcode` | الصفحة الرئيسية للمشروع |
| `https://github.com/abdallhx2/arabcode#readme` | موقع التوثيق |

استبدل هذه الرموز عبر أداة بحث واستبدال، أو باستخدام `sed` مباشرة. مثال (استبدل `your-org` باسم مالك المستودع الفعلي):

```bash
sed -i \
  -e 's|abdallhx2|your-org|g' \
  -e 's|https://raw.githubusercontent.com/abdallhx2/arabcode/main/install|https://raw.githubusercontent.com/your-org/arabcode/dev/install|g' \
  -e 's|https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1|https://raw.githubusercontent.com/your-org/arabcode/dev/install.ps1|g' \
  -e 's|https://github.com/abdallhx2/arabcode|https://github.com/your-org/arabcode|g' \
  -e 's|https://github.com/abdallhx2/arabcode#readme|https://github.com/your-org/arabcode#readme|g' \
  INSTALL.ar.md README.ar.md
```

> ملاحظة: يدعم arabcode ويندوز و PowerShell دعماً كاملاً.
