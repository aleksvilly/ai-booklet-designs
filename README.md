# AI Booklet Designs — Editorial Booklet Generator & Live Editor

[![Production Site](https://img.shields.io/badge/site-live%20demo-0172f0?style=for-the-badge)](https://aleksvilly.github.io/ai-booklet-designs/)
[![GitHub Actions](https://img.shields.io/badge/automation-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/aleksvilly/ai-booklet-designs/actions)
[![Astro Build](https://img.shields.io/badge/framework-Astro%20SSG-ff5d01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)

An automated editorial booklet design generator, live browser editor, and public request pipeline. Create print-ready editorial booklets for any occasion — birthday gifts, café menus, wedding programs, gallery exhibitions, and monographs.

**Production Site**: [aleksvilly.github.io/ai-booklet-designs](https://aleksvilly.github.io/ai-booklet-designs/)

---

## 🌟 Key Features

- **Live Editorial Collection**: Browse generated booklets categorized by `Wedding`, `Menu`, `Gifts`, and `Events`, with instant real-time search filtering.
- **Public Request Queue**: Submit custom booklet requests directly via the web form. Requests are delivered through `ntfy`, tracked in GitHub Issues, and generated automatically via GitHub Actions.
- **In-Browser Live Editor (`src/editor.js`)**: Fine-tune editorial profiles, photo layouts (supporting up to 20 images), typography (title/subtitle/body fonts, letter spacing, line height), and element visibility with instant local persistence.
- **Vector PDF Export**: Export high-resolution PDF files straight from the browser while retaining all visual typography, effects, and page positioning.
- **Multilingual Architecture**: Static multi-language pages built with Astro SSG for English, Russian, Spanish, German, French, and Chinese (`/`, `/ru/`, `/es/`, `/de/`, `/fr/`, `/zh/`).
- **Extensible Catalog System (`data/catalog/`)**:
  - `topics.json` — Recursive encyclopedic topic tree.
  - `styles.json` — 21 extensible style families with design contracts & color palettes.
  - `effects.json` — 20 visual effects (micro-3D, polaroid, paper-cut, tape-strips, xerox, etc.).
  - `fonts.json` — 89 typography font families.

---

## 🏗 High-Level Architecture

```text
Browser (Astro SSG + Vanilla JS/CSS)
  ├─ Static Collection (data/booklets.json)
  ├─ Private Contact Form → Formspree
  └─ Public Generation Request → ntfy.sh
                                  │
                                  ▼
                 poll-public-queue.yml (Cron / Dispatch)
                                  │
                                  ▼
                    GitHub Issue with Queue Status Label
                                  │
                                  ▼
                         publish.yml (Node.js Generator)
                                  │
                 Prepend to data/booklets.json & Pages Deploy
                                  │
                                  ▼
               Close Issue & Comment direct result_url
```

---

## 🛠 Local Development Commands

### 1. Start Local Server
```bash
npm run serve
```
Launches a local static server on `http://localhost:3000`.

### 2. Build Astro Static Site
```bash
npm run build
```
Compiles localized static HTML pages into `dist/`.

### 3. Run Booklet Generator
```bash
# Offline dry-run generation test
BOOKLET_COUNT=1 FORCE_GENERATE=true USE_AI=false SKIP_ENRICHMENT=true npm run generate
```

### 4. Validate Catalog Schemas
```bash
npm run test:catalog
```
Validates JSON topic trees, style contracts, effects, and font references.

---

## 🔐 Data Safety & Security Rules

1. `data/booklets.json` stores user booklet history and is **never deleted or truncated as a side effect**.
2. Public requests are rate-limited to 3 accepted requests per rolling hour to protect AI usage.
3. Private API keys (OpenAI, Gemini, Unsplash, Pexels, Pixabay) are stored securely in GitHub Secrets and never exposed in client scripts.
