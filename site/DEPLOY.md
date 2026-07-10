# نشر موقع arabcode

الموقع في مجلد `site/` ثابت (HTML/CSS فقط، بلا بناء). صفحاته:
`index.html` (الرئيسية) · `models.html` (النماذج المجانية + ربط الموديلات) · `features.html` (الميزات) · `install.html` (التثبيت) · `landing/` (صفحة هبوط مكتفية ذاتيًا).

كل الروابط مضبوطة على المستودع `github.com/abdallhx2/arabcode` (الفرع `main`). لنقله لمستودع آخر، استبدل `abdallhx2` والروابط عبر المستودع دفعة واحدة.

## الخيار 1 — GitHub Pages (آلي)
مُهيّأ عبر `.github/workflows/deploy-site.yml`. فعّله مرة واحدة:
**Settings → Pages → Source = "GitHub Actions"**. بعدها كل دفع إلى `main` يمسّ `site/**` ينشر تلقائيًا. أو شغّله يدويًا من تبويب Actions (`workflow_dispatch`).

## الخيار 2 — Vercel
```bash
npm i -g vercel
cd site && vercel        # للمعاينة
cd site && vercel --prod # للنشر
```
أو من لوحة Vercel: اربط المستودع واضبط **Root Directory = site** و**Framework = Other**.

## معاينة محلية
```bash
cd site && python3 -m http.server 8080   # ثم افتح http://localhost:8080
```
