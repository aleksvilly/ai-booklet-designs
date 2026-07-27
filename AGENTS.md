# AI Booklet Designs — instructions for AI agents

Read this file completely before changing this repository. It is the operational
source of truth for the current project. Some older README files describe earlier
generator versions or optional patches and may be outdated. When documentation
conflicts, inspect the current code and workflows, then preserve the architecture
described here unless the user explicitly asks to change it.

## Project identity

- Repository: `aleksvilly/ai-booklet-designs`
- Default and production branch: `main`
- Production site: <https://aleksvilly.github.io/ai-booklet-designs/>
- The user normally communicates in Russian.
- The website UI and generated booklet content are currently primarily English.
- The user prefers small, direct iterations and has explicitly allowed direct
  pushes to `main`. Do not create a PR unless the user asks for one.

This is a static GitHub Pages site and an automated booklet-generation
experiment. Visitors can browse generated editorial booklet concepts, submit a
public generation request, follow its progress, and open the published result.

## Non-negotiable safety rules

1. **Never delete an existing booklet unless the user explicitly asks to delete
   that exact booklet.**
2. Never rewrite, truncate, regenerate, or clean all of `data/booklets.json` as
   a side effect of fixing future generation.
3. If a generated booklet contains a defect, distinguish between:
   - fixing that existing booklet; and
   - fixing the generator so future booklets are correct.
   The user may want only the second. Ask if the intent is unclear.
4. Preserve unrelated user changes and dirty-worktree files.
5. Never expose GitHub, OpenAI, Gemini, Unsplash, Pexels, Pixabay, Formspree, or
   other private credentials in HTML, JavaScript, commits, logs, issues, or
   documentation.
6. The generation queue is deliberately public, but it must not be used for
   personal contact data, passwords, API keys, or private briefs.
7. The contact form and the generation form have different privacy models. Do
   not merge them without explicit approval.
8. Before updating an existing GitHub file through the Contents API, fetch its
   current blob SHA from `main`. Never overwrite a newer remote version with a
   stale local file.
9. Do not change the public ntfy topic in only one place. It must remain
   identical in `index.html`, `app.js`, and
   `.github/workflows/poll-public-queue.yml`.

## Current high-level architecture

```text
Browser
  ├─ static collection from data/booklets.json
  ├─ private contact form → Formspree
  └─ public generation form → ntfy
                                  │
                                  ▼
                 poll-public-queue.yml
                 (GitHub schedule/manual/external cron)
                                  │
                                  ▼
                    GitHub Issue with status labels
                                  │
                                  ▼
                         publish.yml dispatch
                                  │
                 generator writes data/booklets.json
                                  │
                                  ▼
                     GitHub Pages deployment
                                  │
                                  ▼
               Issue gets result_url and is closed
```

## Important files

### Frontend

- `index.html`
  - Static page structure.
  - Hero generation form.
  - Contact form.
  - Request-status dialog.
  - Booklet-card template.
- `styles.css`
  - Site theme, responsive navigation, collection cards, booklet spreads,
    printing, generation form, and request-status dialog.
  - The request dialog has special layouts for short laptop screens and small
    phones such as iPhone SE.
- `app.js`
  - Loads and renders `data/booklets.json`.
  - Opens booklet details and supports direct URLs such as
    `?booklet=<booklet-id>`.
  - Handles dark mode and the mobile burger menu.
  - Sends forms without a full-page reload.
  - Stores generation request history in browser `localStorage`.
  - Reads public GitHub Issues and ntfy to show queue position and status.
- `data/booklets.json`
  - Production collection and generated content.
  - New generated booklets are prepended, not substituted for old booklets.
  - Treat this as valuable user data.
- `data/catalog/topics.json`
  - Recursive, multilingual topic encyclopedia.
  - Topic paths may have any depth and use stable slash-separated IDs.
- `data/catalog/styles.json`
  - Extensible style families, topic affinities, provenance, generator pools,
    strict profile contracts, and the chaos level at which mixing is allowed.
- `data/catalog/effects.json`
  - Public effect IDs, labels, groups, intensity hints, and internal Design DNA
    tokens.
- `docs/CATALOG-ROADMAP.md`
  - Checklist of finished, active, next, and later catalog/editor work.

### Generator

- `scripts/generate-daily.mjs`
  - Main generator used by `npm run generate`.
  - Builds Design DNA, page plans, text, typography, layout, image queries,
    sources, and generation metadata.
  - Supports OpenAI, Gemini, and local fallback generation.
- `scripts/catalog-registry.mjs`
  - Loads the shared JSON catalogs for Node-based generation.
  - Converts catalog style/effect records into existing Design DNA structures.
- `scripts/catalog-smoke.mjs`
  - Validates IDs, references and required fields with `npm run test:catalog`.
- `scripts/image-fallback-helpers.mjs`
  - Image-provider fallback system.
  - Supports Unsplash, Pexels, Pixabay, Openverse, Wikimedia, and decorative
    fallback art where configured.
  - `cleanImageMetadataText()` strips HTML and decodes common HTML entities from
    third-party captions, creator names, licences, and attribution.
  - All new external image metadata must pass through this cleaner before being
    stored.
- `package.json`
  - `npm run generate` runs `scripts/generate-daily.mjs`.
  - `npm run serve` starts a simple local static server.

### GitHub Actions

- `.github/workflows/poll-public-queue.yml`
  - Reads public ntfy messages from the last 12 hours.
  - Uses exact ntfy event IDs for idempotency.
  - Creates a GitHub Issue and dispatches `publish.yml`.
  - Limits public generation to three accepted requests per rolling hour.
- `.github/workflows/generate-from-form.yml`
  - Alternative entry point for correctly formatted GitHub Issues.
  - Trigger: an opened issue whose title starts with `[BOOKLET REQUEST]` and
    which already has the `booklet-request` label.
  - Parses and validates the issue fields, then dispatches `publish.yml`.
- `.github/workflows/publish.yml`
  - Generates on `schedule` or `workflow_dispatch`.
  - A normal push to `main` deploys the current static site without generating a
    new booklet.
  - Generation commits `data/booklets.json`, then deploys GitHub Pages.
  - When `request_issue` is supplied, it marks that issue `finished`, adds
    `result_url`, comments with the direct booklet URL, and closes the issue.

## Public generation request flow

### 1. Browser submission

The generation form posts JSON as plain text to:

```text
https://ntfy.sh/ai-booklet-8bcc753d24dacb6d280ae36b
```

Current public request fields:

- `request_type=booklet_generation`
- `count=1`
- `topic` — optional; an empty topic intentionally means random selection
- `topic_path` — optional stable catalog path such as
  `sports/tennis/equipment`; an empty value means free text or random
- `style`
- `chaos_level`
- `max_fonts`
- `custom_style`
- `ai_provider`
- `custom_fonts`
- `description`
- `source`
- `submitted_at`

ntfy returns an event ID. `app.js` stores up to 20 requests under:

```text
ai-booklet-generation-requests-v1
```

The history is local to that browser/device. It is not account-based or
cross-device.

### 2. Queue intake

`poll-public-queue.yml` reads:

```text
https://ntfy.sh/ai-booklet-8bcc753d24dacb6d280ae36b/json?poll=1&since=12h
```

The workflow ignores non-generation messages, validates allowed values, and
searches existing issues for markers in this exact format:

```html
<!-- ntfy-id: EVENT_ID -->
```

Do not change this marker format without updating both the workflow and
`app.js`.

The workflow creates an issue with:

- title: `[BOOKLET REQUEST] <topic or Random topic>`
- label: `booklet-request`
- status label: `processing`
- a normalized field list in the body
- the ntfy marker

It then dispatches `publish.yml` with `count=1`, `force_generate=true`, and the
validated public request inputs.

### 3. External cron

GitHub scheduled workflows may be delayed or dropped. The user has also set up
an external cron/manual dispatcher intended to call the GitHub Workflow
Dispatch API for:

```text
.github/workflows/poll-public-queue.yml
```

Target endpoint:

```text
POST https://api.github.com/repos/aleksvilly/ai-booklet-designs/actions/workflows/poll-public-queue.yml/dispatches
{"ref":"main"}
```

Expected cadence: every five minutes.

This external job requires a fine-grained token with repository-specific
`Actions: write`. The token belongs outside this repository. Never request that
the token be pasted into chat or committed.

No self-hosted GitHub runner is required. Workflows use GitHub-hosted
`ubuntu-latest`.

### 4. Status and completion

Issue labels:

- `pending` — waiting for dispatch
- `processing` — generator/deployment is running
- `finished` — deployed successfully
- `booklet-request` — identifies public generation requests

The browser checks the public Issues API for the matching ntfy marker.

Popup stages:

1. Sent & queued
2. Preparing
3. Ready
4. Published

Before completion, the booklet button is visible but disabled. After completion,
the issue body contains:

```text
result_url: https://aleksvilly.github.io/ai-booklet-designs/?booklet=<id>
```

The popup then freezes the timer as total time and enables the direct booklet
link.

## Critical request-parsing detail

An empty `topic:` line is valid and means random selection.

Do not use `\s*` around single-line field values in the issue parser because
`\s` includes newlines and can consume the next field. Use `[ \t]*`. The parser
in `generate-from-form.yml` deliberately follows this rule.

Bad outcome to avoid:

```text
topic:
style: auto
```

being parsed as `topic = "style: auto"`.

## Rate limiting and queue estimates

Public intake currently accepts at most three booklet-request issues during a
rolling hour. Additional ntfy messages remain in the 12-hour public queue and
can be accepted after capacity becomes available.

`app.js` estimates:

- the request's current unprocessed queue position;
- the next five-minute poll boundary;
- approximate wait based on recently accepted issues.

This is an estimate. GitHub Actions scheduling and external cron execution are
not guaranteed to start at the exact displayed second.

Do not silently increase or remove the rate limit. It protects AI API usage and
GitHub workflow volume. Ask the user first.

## Generator inputs

Important environment variables:

- `BOOKLET_COUNT` — 1, 3, or 6
- `FORCE_GENERATE` — generate even when today's booklets already exist
- `USE_AI` — enable/disable external text AI
- `AI_PROVIDER` — `auto`, `openai-first`, `gemini-first`, `openai-only`,
  `gemini-only`, or `local`
- `CHAOS_LEVEL` — `-1` automatic, then `0` safe through `5` wild
- `MAX_FONTS` — maximum font count
- `BOOKLET_STYLE`
- `BOOKLET_FONTS`
- `BOOKLET_TOPIC` — empty means random
- `BOOKLET_TOPIC_PATH` — optional slash-separated catalog path
- `BOOKLET_DESCRIPTION`
- `BOOKLET_RUN_ID`
- `BOOKLET_DATE`
- `IMAGE_PROVIDER`
- `SKIP_ENRICHMENT` — only for disposable/local generator tests

Secrets and optional provider variables:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `PEXELS_API_KEY`
- `PIXABAY_API_KEY`

Model variables:

- `OPENAI_MODEL`
- `GEMINI_MODEL`
- `GEMINI_FALLBACK_MODEL`
- `GEMINI_SECOND_FALLBACK_MODEL`
- `GEMINI_MAX_ATTEMPTS`

## Image metadata rules

Third-party image APIs may return HTML in fields that look like plain text.
Wikimedia has returned values such as:

```html
<div class="fn">The NIST impact test facility</div>
```

If stored directly, the frontend safely escapes it and users see the HTML tags
inside `figcaption`.

Rules:

1. Keep frontend escaping. Never solve this by rendering external metadata as
   raw `innerHTML`.
2. Normalize metadata at ingestion with `cleanImageMetadataText()`.
3. Apply the cleaner to alt text, creator, provider/source, licence, and
   attribution fields.
4. Decode common entities, strip tags/scripts/styles, remove control
   characters, normalize whitespace, and apply a length limit.
5. A generator fix must not automatically mutate old booklet records unless the
   user explicitly requests a migration.

## Contact form

The contact form sends private enquiries to:

```text
https://formspree.io/f/meeyvjjd
```

It may contain name, email, phone, and message. Keep it separate from ntfy and
public GitHub Issues.

The generation form intentionally contains no email or phone field.

## Frontend invariants

- Preserve HTML escaping via `escapeHtml()` and URL validation via `safeUrl()`.
- Never insert third-party API strings using untrusted `innerHTML`.
- Keep the status dialog usable without page reload.
- Keep it compact on short laptop screens and iPhone SE-size screens.
- Keep the booklet-view button disabled while queued/processing.
- Finished requests show all progress checks, a final total time, and a direct
  result link.
- Request history must survive reload through `localStorage`.
- Dark mode must remain functional.
- Mobile navigation must remain accessible through the burger button.
- Direct booklet links using `?booklet=<id>` must continue to work.
- Print styles for booklet spreads must not be broken by site-level UI changes.

## Extensible catalog architecture

Treat `data/catalog/*.json` as the portable source of truth for new topics,
styles and effects. The current generator still contains legacy arrays during
the migration, but catalog records override matching legacy style IDs and may
introduce completely new IDs without editing the generator.

Catalog rules:

1. IDs are permanent, lowercase and URL-safe. Translate labels, never IDs.
2. Topic trees are recursive. Never hard-code a maximum depth in stored data.
3. `topic_path` is slash-separated IDs. `topic` remains the human-readable
   prompt and preserves compatibility with old requests.
4. A selected style is a contract at chaos 0–4. Chaos 5 may deliberately break
   and remix it. A style can override this boundary with `lockUntilChaos`.
5. Topic affinity recommends styles but must not silently replace an explicit
   user style.
6. Effect `id` is the browser/workflow/API value. `generatorToken` is the
   internal renderer/generator value.
7. New browser choices must come from the catalogs where possible. Keep HTML
   fallbacks so the form remains usable if a catalog fetch fails.
8. Imported styles must record provenance and licence information. Recreate
   visual grammar with project-native tokens; do not commit proprietary brand
   assets or unlicensed source code.
9. Run `npm run test:catalog` after every catalog change.
10. Update `docs/CATALOG-ROADMAP.md` when a catalog/editor milestone is finished
    or a new follow-up is discovered.

Current UI behaviour:

- The topic explorer uses cascading native selects. On iOS these open as the
  native vertical wheel picker.
- Selecting any depth immediately fills the normal `topic` field and stores the
  stable `topic_path`.
- Users may overwrite the generated topic text; doing so clears `topic_path`.
- The editor remains a separate parameter system with the inheritance chain
  booklet → spread → page.

## Deployment behaviour

`publish.yml` runs on every push to `main`, but the generation step is guarded:

```text
github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
```

Therefore:

- code/data pushes deploy the static site;
- scheduled or manually dispatched runs generate and deploy;
- the generator's own `data/booklets.json` commit causes another deployment
  push, but must not generate recursively.

The generator prepends additions:

```js
[...additions, ...existing]
```

`publish.yml` relies on the newest generated booklet being `booklets[0]` when
creating the direct `result_url`. Preserve this relationship or update both
places together.

## Recommended change workflow for AI agents

1. Read this file and inspect the actual current files.
2. Resolve whether the task is:
   - frontend-only;
   - generator-only;
   - queue/workflow-only;
   - an explicit edit to existing booklet data.
3. Check `git status` and preserve unrelated changes.
4. Make the smallest coherent change.
5. Validate locally.
6. Fetch current GitHub blob SHAs before remote writes.
7. Push only intended files directly to `main` when the user has authorized it.
8. Verify the new remote content.
9. For frontend changes, wait for GitHub Pages and verify the deployed assets.
10. Report exactly what changed and whether any existing booklet data changed.

## Validation checklist

Use relevant checks:

```bash
node --check app.js
node --check scripts/generate-daily.mjs
node --check scripts/image-fallback-helpers.mjs
git diff --check
```

For workflow YAML, parse or format-check the changed file with a YAML-aware
tool. Inspect workflow conditions and permissions manually.

For metadata sanitization, test representative values:

```text
<div class="fn">Title</div>
&lt;div&gt;Title &amp; subtitle&lt;/div&gt;
<script>alert(1)</script><b>Clean title</b>
```

Do not run `npm run generate` in the production working tree merely as a syntax
test: it writes `data/booklets.json`. If a real generator run is needed, use a
disposable copy and `SKIP_ENRICHMENT=true`, or explicitly preserve and compare
the production data.

For deployed frontend verification, confirm that the expected marker exists in:

```text
https://aleksvilly.github.io/ai-booklet-designs/
https://aleksvilly.github.io/ai-booklet-designs/app.js
https://aleksvilly.github.io/ai-booklet-designs/styles.css
```

## Debugging public requests

When a request appears stuck:

1. Read recent ntfy events and find the event ID.
2. Search all booklet-request issues for the exact ntfy marker.
3. Check the rolling three-per-hour limit.
4. Check runs of `Poll public request queue`.
5. Check whether the external cron dispatched the workflow.
6. If an issue exists, check `Generate from website form` or the direct
   `publish.yml` dispatch.
7. Check `Generate and publish`.
8. Inspect issue labels, comments, state, and `result_url`.
9. Do not create a duplicate issue unless idempotency markers and the original
   run have been understood.

Useful public locations:

- Actions: <https://github.com/aleksvilly/ai-booklet-designs/actions>
- Issues: <https://github.com/aleksvilly/ai-booklet-designs/issues>
- ntfy topic:
  <https://ntfy.sh/ai-booklet-8bcc753d24dacb6d280ae36b>

## Known limitations

- Native GitHub `schedule` events may be delayed or dropped.
- External cron configuration is outside this repository.
- ntfy is public and retains messages for a limited time.
- Request history is browser-local.
- Browser status checks use unauthenticated public GitHub API limits.
- External GIFs may fail; the UI cycles through fallbacks.
- `finished` currently represents both generated and successfully published;
  the Ready and Published progress steps complete together.

## When uncertain

Prefer preserving data and asking one focused question. Never guess that a
destructive cleanup, schema rewrite, credential exposure, rate-limit removal,
or workflow replacement is acceptable.
