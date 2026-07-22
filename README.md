# AI Booklet Generator V3 — Design DNA

Главные файлы:

- `scripts/generate-daily.mjs` — основная версия для текущего `package.json`.
- `scripts/generate.js` — идентичная копия, если хочешь переименовать команду.
- `optional-renderer-patch/app.js` и `styles.css` — **рекомендуется заменить**, иначе старый сайт не покажет новые шрифтовые режимы, фоновые системы, микро-3D, инверсию, parallax и другие эффекты из `designDna`.
- `optional-workflow/publish.yml` — рекомендуемый workflow с моделью `gpt-5-mini` и настройкой хаоса.

## Что заменить в репозитории

```text
scripts/generate-daily.mjs
app.js
styles.css
.github/workflows/publish.yml   (рекомендуется)
```

После замены:

```bash
git add .
git commit -m "Add diverse design DNA generator"
git push origin main
```

## Что изменилось

- Более 20 категорий и сотни подтем.
- Стили от 1960-х до 2026: детский paper-cut, Swiss, psychedelic, Memphis, post-punk, grunge, rave, Y2K, luxury, noir, museum, neo-brutalism, organic futurism, neo-tech и другие.
- 40 визуальных эффектов: micro-3D, parallax, inverted sections, text behind image, chrome type, halftone, xerox, paper cut, HUD, scan line, impossible scale и другие.
- 34 модуля страниц вместо одного шаблона.
- Разные объёмы текста, плотность фотографий, типографика, цвет, ритм, фон и печатное ощущение.
- `coherent`, `remix` и `absurd` режимы. Возможны сочетания вроде облаков с картошкой.
- Каждая автоматическая тройка специально содержит спокойную, выразительную и дикую концепцию.
- Антиповтор сравнивает новую работу с последними 30 буклетами.

## CHAOS_LEVEL

- `-1` — автоматический баланс: safe + expressive + wild.
- `0–1` — спокойно и коммерчески.
- `2–3` — выразительно и иногда нелогично.
- `4–5` — сильный эксперимент и абсурдные сочетания.

При ручном запуске выбирается в GitHub Actions. Для расписания используется `-1`.

## Локальная проверка без API и поиска картинок

```bash
BOOKLET_COUNT=3 \
FORCE_GENERATE=true \
USE_AI=false \
SKIP_ENRICHMENT=true \
BOOKLET_RUN_ID=test \
node scripts/generate-daily.mjs
```

`SKIP_ENRICHMENT=true` нужен только для быстрой локальной проверки. В GitHub Actions его не добавляй.
