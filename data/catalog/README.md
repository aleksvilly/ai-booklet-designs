# Extensible booklet catalog

These JSON files are the portable data layer for themes, visual systems and
effects. The browser and generator consume the same records.

## Stable rules

- IDs are permanent, lowercase, URL-safe identifiers.
- Labels are translatable and do not act as IDs.
- Topic trees may have any depth. A path is stored as slash-separated IDs.
- A topic can recommend styles, but never forces one when the user chose a
  different profile.
- A style is a visual contract until its `lockUntilChaos` value is reached.
  The default is `5`: chaos 0–4 preserves the style; chaos 5 may remix it.
- `generator` contains broad Design DNA pools. `contract` contains narrower
  rules used when the profile is locked.
- Effect `id` is the public form/API value. `generatorToken` is the internal
  Design DNA/CSS value.
- Imported records must include source and licence metadata. Do not copy
  proprietary assets into this repository.

## Adding content

1. Add one unique record to the relevant JSON file.
2. Run `npm run test:catalog`.
3. Test the public form at phone and desktop widths.
4. For a new style, run one disposable local generation at chaos 0 and 5.
5. Record the result and next work in `docs/CATALOG-ROADMAP.md`.

The schema intentionally remains plain JSON so the same records can later come
from GitHub, a database, object storage or a public API without changing the
renderer/editor contract.
