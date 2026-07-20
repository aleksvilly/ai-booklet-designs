# AI Booklet Designs

An evolving catalogue of gift-booklet concepts designed for specific people, professions and interests. The site publishes three new concept directions every day and is deployed as a static GitHub Pages website.

## First publication

1. Upload all project files to the `main` branch.
2. Open **Settings → Pages** in the GitHub repository.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Open the **Actions** tab and run **Generate and publish** once.
5. The public site will appear at:
   `https://aleksvilly.github.io/ai-booklet-designs/`

## Daily automation

`.github/workflows/publish.yml` runs every day at 07:15 in the `Europe/Riga` timezone. It:

1. Runs `scripts/generate-daily.mjs`.
2. Adds three concept records to `data/booklets.json`.
3. Commits them to `main`.
4. Publishes the updated static site to GitHub Pages.

The local generator uses curated combinations and does not require an API key.

## Local preview

```bash
npm run serve
```

Then open `http://localhost:8080`.

To generate concepts for a specific date:

```bash
BOOKLET_DATE=2026-07-21 npm run generate
```

## Next development stages

- Add a source and licence registry for every image.
- Connect Openverse, Europeana, Wikimedia Commons and selected museum APIs.
- Add an AI provider only after the deterministic publication pipeline is stable.
- Generate full 12–20 page booklet previews for selected concepts.
- Add private placeholders for commercial assets that have not yet been licensed.

## Publishing caution

Reference sites may be used to study general design characteristics, but a published booklet should not reproduce one specific copyrighted layout. Finished designs should combine multiple influences and use appropriately licensed assets.

## Creative era range

The generator intentionally uses design references from the **1960s through 2026**. It rotates across the 1960s, 1970s, 1980s, 1990s, 2000s, 2010s, 2020–2024, 2025 and 2026, with multiple visual directions inside every period. Styles earlier than the 1960s are excluded from automatic generation.
