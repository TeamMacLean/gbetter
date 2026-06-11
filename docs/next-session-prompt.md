# Next Session — gBeta

**Last session:** 29 (2026-06-11). Everything committed and pushed to
origin/main (`7823811`); `npm run check` 0 errors, 504 unit tests pass; verified
live against the bundled cancer-variants test data. Working tree clean.

## State of the project
gBeta works end-to-end as a private, AI-native genome **analysis engine** over
loaded GFF3/VCF/BAM tracks: gene lookup, the full GQL (SELECT, WHERE,
INTERSECT/WITHIN, IN scopes, `count`, **aggregation** MIN/MAX/AVG/SUM/COUNT,
coverage queries), a conversational **Ask AI** panel with clickable ranked
results, and re-runnable notebook **Analyses**. Renamed from GBetter → **gBeta**
(localStorage auto-migrates old data). Docs (README + reference + tutorials) are
current.

## How to drive / verify (recipes)
- Live: `npm run dev` (5173) + Playwright via `node_modules/playwright`.
- Drive the AI without a key: `page.route('**/v1/messages', …)` to stub the
  Anthropic response, and pre-seed `localStorage['gbeta_ai_settings']`
  (`{activeProvider:'anthropic', apiKeys:{anthropic:'x'}, activeModels:{…}}`).
- **Probe pitfall**: importing a store separately inside `page.evaluate` can be a
  DIFFERENT instance than the running app (made IN VIEW falsely return 0). For
  viewport-dependent checks, drive the real UI (file input, search bar, console).
- Tests: `npx vitest run --exclude '**/real-bam-performance.test.ts'`. jsdom has
  no real localStorage and `File` lacks `.text()` — see the robustness tests for
  the mocks.

## Possible next directions (nothing urgent)
- **Arbitrary `GROUP BY`** — only scalar aggregates + the implicit per-gene
  INTERSECT grouping exist; grouping by an arbitrary field is the natural next
  GQL feature.
- **Export a result set** (CSV/BED) from the chat / result panel.
- **Persist the Ask AI chat thread**; let a chat exchange be saved as an Analysis.
- **CONTRIBUTING.md** — the README references contributing guidelines that don't
  exist yet; and a screenshot/GIF in the README.
- Median/quantile aggregates; multi-field aggregates.
- (Optional) Rename the GitHub repo + Pages to `gbeta` — would then need the
  `svelte.config.js` base path + README URLs flipped to match.

## Key code pointers
- Track-type recognition: `isGeneTrack`/`isVariantTrack` in `queryLanguage.ts`.
- Aggregate parse/exec: `parseSelectQuery` / `executeSelectQuery`.
- Gene resolution for SEARCH/WITHIN/FIND: `queryRouter.ts` `resolveQueryGeneTerms`.
- Storage migration: `services/storage.ts` `getMigrated`.
- AI: `services/ai/` (providers + `prompt.ts`), `components/AIChat.svelte`.
