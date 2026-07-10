# arabcode — Landing Page

A single, self-contained, offline-capable Arabic RTL landing page for `arabcode` (no external assets; safe under a strict CSP).

- `index.html` — complete standalone document. Deploy as-is to GitHub Pages, Vercel, Netlify, or any static host.
- `artifact-body.html` — the same page as inner-body content only (`<style>` + markup + `<script>`), for hosts that supply the `<!doctype>/<html>/<head>/<body>` wrappers. Kept visually identical to `index.html`.

## Preview locally
Open `index.html` directly in a browser, or run `python3 -m http.server` in this folder and visit `http://localhost:8000/`.

## Deploy
Copy `site/landing/index.html` to your host's web root (GitHub Pages: push to a `gh-pages` branch or set Pages source; Vercel/Netlify: point the project at `site/landing`).

## Placeholders
Link/command tokens are intentional placeholders — find-and-replace before publishing: `abdallhx2`, `https://raw.githubusercontent.com/abdallhx2/arabcode/main/install`, `https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1`, `https://github.com/abdallhx2/arabcode`, `https://github.com/abdallhx2/arabcode#readme`.
