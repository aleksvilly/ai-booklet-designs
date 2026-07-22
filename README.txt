AI BOOKLET — OPTIONAL TOPIC AND DESCRIPTION

Replace these files in the repository:

1. scripts/generate-daily.mjs
2. .github/workflows/publish.yml

Optional:
- scripts/generate.js is an identical alias of generate-daily.mjs.

Manual GitHub Actions run:
- Topic filled + description filled: both are used.
- Topic filled + description empty: topic is used, details are generated automatically.
- Topic empty + description filled: a short topic is inferred from the description.
- Both empty: fully automatic behavior, unchanged.

Scheduled runs always stay automatic.
OpenAI 429 insufficient_quota does not stop generation; the local fallback uses the same custom brief.
