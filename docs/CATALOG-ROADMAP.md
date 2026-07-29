# Catalog and slider roadmap

## Done

- [x] Versioned JSON registries for topics, styles and effects.
- [x] Recursive topic paths with translations, aliases and recommended styles.
- [x] Initial encyclopedia path: Sports → Tennis → equipment / athletes /
      competitions / results / rules.
- [x] Occasion profiles for weddings, children's parties and Halloween.
- [x] Shared public effect IDs and internal generator tokens.
- [x] Catalog validation command.
- [x] Preserve a selected visual profile at chaos 0–4; chaos 5 may remix it.
- [x] Modular ES architecture (`src/config.js`, `src/utils.js`, `src/catalog.js`, `src/collection.js`, `src/detail-modal.js`, `src/editor.js`, `src/pdf-exporter.js`, `src/queue.js`, `src/main.js`).
- [x] PDF two-page per sheet landscape export alignment.
- [x] Text container overflow protection & -webkit-line-clamp heading/body safety.
- [x] High-contrast dedicated visual design rules for all style profiles (Wedding, Kids Party, Halloween Noir, Sports Broadcast, Gaming Tech, Scientific Journal, Encyclopedia).
- [x] Two named visual-reference pilots with explicit provenance and no copied
      brand assets: Nike Athletic Campaign and Amazon Modular Marketplace.
- [x] Shared font catalog with free/licensed availability, full live-editor
      font slider, Title/Subtitle/Body targets and per-style recommendations.

## In progress

- [ ] Grow the initial topic tree without making the hero form visually heavy.
- [ ] Move remaining legacy generator arrays into the registries.
- [ ] Add visual preview thumbnails and provenance to every style.

## Next

- [ ] Add alphabetical and full-text topic search across every language.
- [ ] Recommend a stable style from topic affinity when profile is Automatic.
- [ ] Add a style wheel: group → family → preset → intensity.
- [ ] Add effect controls to the live booklet/spread/page editor.
- [ ] Add per-property inheritance indicators and a one-tap “return to parent”.
- [ ] Save an edited booklet as a reusable personal template.
- [ ] Import permissively licensed style packs from GitHub with attribution.
- [ ] Add a repeatable visual-reference intake checklist covering provenance,
      asset/code exclusion, public naming and similarity review.
- [ ] Add automated screenshot tests for every style at chaos 0 and chaos 5.
- [ ] Add licensed font upload/purchase fulfilment and verified `@font-face`
      delivery without exposing font files to non-licensees.

## Later

- [ ] API/database adapter with the same JSON contract.
- [ ] Cloud image storage and asset deduplication.
- [ ] Wikipedia/Wikidata/OpenAlex topic adapters.
- [ ] User collections, private brand systems and custom template packs.
- [ ] Element-level editor beneath booklet → spread → page.
- [ ] Export the edited HTML/CSS state to print PDF and editable source.
