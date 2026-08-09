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
- [x] High-contrast dedicated visual design rules for all style profiles (Wedding, Kids Party, Halloween Noir, Sports Broadcast, Gaming Tech, Scientific Journal, Encyclopedia, GQ Editorial).
- [x] Two named visual-reference pilots with explicit provenance and no copied
      brand assets: Nike Athletic Campaign and Amazon Modular Marketplace.
- [x] Four selectable digital-product profiles with strict visual contracts:
      YouTube video interface, streaming music library, mobile social feed and
      analytics dashboard. All use project-native CSS without logos, copied
      icons, proprietary fonts or source code.
- [x] Shared font catalog with free/licensed availability, full live-editor
      font slider, Title/Subtitle/Body targets and per-style recommendations.
- [x] Advanced typography editor for per-target weight, tracking, line height,
      italic, underline and uppercase overrides.
- [x] Mobile Compact View page stage with horizontal page snapping, adjacent
      page previews and an animated, composition-preserving 1-page → 2-page →
      5-column overview zoom control, centred two-page pairs and double-tap
      focus from overview grids.
- [x] Desktop Full View split into separate page-stage and floating editor
      surfaces with a visible gap, responsive page sizing and a content-aligned
      zoom control.
- [x] Photo manager V1 for the selected page: device uploads in IndexedDB,
      URL imports, Openverse/Wikimedia search, booklet-wide reuse, ordering and
      removal without changing published booklet data. Photo assignment,
      Photo Layout and layout intensity are page-only controls with legacy
      booklet/spread settings migrated into equivalent per-page overrides. A
      page-only slot slider repeats available images or renders a local layout
      placeholder when the booklet has no photos yet. Clicking page media opens
      a compact contextual photo sheet with per-slot replace, remove and order
      actions; clicking an empty page opens the same sheet in add mode. Search
      results use provider-native pagination with an incremental Load more flow
      for Openverse pages and Wikimedia continuation tokens.

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
- [ ] Photo manager V2: protected Unsplash/Pexels search proxy with provider
      attribution and required download tracking.
- [ ] Photo manager V3: drag-and-drop ordering, crop/focal-point controls and
      text-aware image recommendations.
- [ ] Import permissively licensed style packs from GitHub with attribution.
- [ ] Add a repeatable visual-reference intake checklist covering provenance,
      asset/code exclusion, public naming and similarity review.
- [ ] Add automated screenshot tests for every style at chaos 0 and chaos 5.
- [ ] Add licensed font upload/purchase fulfilment and verified `@font-face`
      delivery without exposing font files to non-licensees.

## Later

- [ ] API/database adapter with the same JSON contract.
- [ ] Cloud image storage and asset deduplication.
- [ ] Evaluate Pixabay only with owned image storage; permanent API hotlinking
      is not permitted by the provider.
- [ ] Wikipedia/Wikidata/OpenAlex topic adapters.
- [ ] User collections, private brand systems and custom template packs.
- [ ] Element-level editor beneath booklet → spread → page.
- [ ] Export the edited HTML/CSS state to print PDF and editable source.
