# AI Booklet Designs V4

Drop-in V4 upgrade for the existing `ai-booklet-designs` repository.

## Replace these files

- `scripts/generate-daily.mjs`
- `app.js`
- `styles.css`
- `index.html`
- `.github/workflows/publish.yml`

Keep your existing `data/booklets.json`. The ZIP intentionally does not overwrite it.

## Main changes

### Print structure

- 6–16 physical A5 pages, always an even number.
- The preview groups pages into A4 landscape spreads.
- `Print / save PDF` prints one spread per A4 landscape sheet.
- Continuous panorama spreads reuse one photo across left and right pages.

### Layout diversity

- 15 cover archetypes.
- More than 45 page modules.
- 2, 3, 4, 6, 9, 12 and 20-image grids.
- Newspaper, archive, catalog, poster, microtype, collage, masonry and full-bleed systems.
- Page-specific headline scale, body scale, columns, image density and effects.

### Font API

V4 uses the Google Fonts CSS2 API in the browser. No Google Fonts API key is required for font delivery.

- Every booklet stores a `fontPalette`.
- Safe concepts normally use 2–4 fonts.
- Expressive concepts use approximately 4–8 fonts.
- Wild concepts can use up to 20 fonts.
- Fonts are loaded lazily when a booklet is opened.
- Font files are not included in this ZIP or repository.

In the GitHub Actions manual form, use `Maximum Google Fonts per booklet` to cap the number at 2, 4, 8, 12 or 20.

### Images

A page can request many photos using one search response:

- Openverse: up to 20 licensed results from one search.
- Unsplash: up to 20 selected results from one search.
- Multi-image pages store `page.images` and retain creator/source/licence data.
- Paired panorama pages share the same image result.

Set the repository secret `UNSPLASH_ACCESS_KEY` and choose `mixed`, `unsplash` or `openverse` in the manual workflow.

## Local test

```bash
BOOKLET_COUNT=3 \
FORCE_GENERATE=true \
USE_AI=false \
SKIP_ENRICHMENT=true \
CHAOS_LEVEL=5 \
MAX_FONTS=20 \
npm run generate
```

`USE_AI=false` is useful while the OpenAI API account has `429 insufficient_quota`. The local design-DNA generator supports all V4 layouts, custom topics, spreads and fonts.

## Existing data

Old booklets remain readable. They use legacy fallbacks when V4 fields such as `coverArchetype`, `fontPalette`, `imageCount` or `spreadId` are absent.
