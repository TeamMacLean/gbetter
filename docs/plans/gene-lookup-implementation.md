# Gene Lookup + Lighter-Touch AI — Implementation Plan

**Status:** Approved, in progress
**Spec:** `docs/specs/gene-lookup.md`
**Date:** 2026-06-10

## Goal

Let users navigate/query by gene symbol. A search term resolves to coordinates
via external APIs and becomes an alias for coordinates within GQL. The natural
language → AI → GQL → execute path stays single-shot but gains a **lighter-touch
inline** explanation/clarification (no chat panel yet).

## Key product decisions

- **AI emits gene SYMBOLS, never fabricates coordinates.** The model produces
  e.g. `NAVIGATE BRCA1`; the deterministic lookup service resolves it against
  real APIs. This is the "AI-native but REPRODUCIBLE" boundary.
- **Lighter-touch AI surface:** show the AI's `explanation` / clarification as a
  one-line inline note in the search bar ("Interpreting as `NAVIGATE TP53`" /
  "Did you mean…?"). No conversational chat panel in this phase.
- **Multi-match = best-guess + report:** navigate to the top hit AND always
  report that a guess was made, listing the alternatives, with the GenePicker as
  the click-through to switch.

## Integration risks (verified against the code)

- ✅ Assembly IDs in `src/lib/data/assemblies.json` match the spec's config keys
  (`grch38`, `mm39`, `saccer3`, `ecoli-k12`, …) across all 24 assemblies.
- ⚠️ **Chromosome naming.** MyGene returns bare names (`"17"`); the browser
  navigates with assembly-specific names (`chr17` for human, `NC_000913.3` for
  E. coli, NC_ accessions for GenArk). Resolved gene `chromosome` MUST be
  normalized to the assembly convention or navigation lands nowhere. Reuse
  existing normalization (`assembly.svelte.ts`, `GENARK_CHROMOSOME_MAPS` in
  `bigbed.ts`). Verify E. coli end-to-end early.
- ⚠️ **Async execution path.** Today `SearchBar`/`QueryConsole` use synchronous
  `parseQuery → executeQuery` plus a sync regex `translateNaturalLanguage`. Gene
  lookup (API) and the real AI `translate()` are async, so the execute path
  becomes a Promise.

## Phases

### Phase 0 — API spike (DONE)
Findings (2026-06-10):
- Latency fine: MyGene ~170–750ms (cold first call), Ensembl 2-step ~450–800ms.
  Timeout ~5s. No downloads needed.
- No backend overlap — route each assembly to its one backend, no fallback.
- Chromosome naming is per-organism: MyGene human → bare `"17"` (needs `chr17`),
  MyGene E. coli → `"NC_000913.3"` (already our convention), Ensembl → bare
  `seq_region_name` (`"1"`). Normalize by matching the returned name against the
  assembly's known chromosome names/aliases — NOT a blanket `chr` prefix.
- MyGene fuzzy-matches (typo `BRAC1` → `BRAT1`), so "no match" is rare; the
  best-guess-but-report-alternatives UX matters for trust.
- Data shape: filter hits lacking `genomic_pos`; map strand `-1/1` → `'-'/'+'`.

### Phase 1 — `geneLookup.ts` service (TDD, mocked APIs)
- `GeneResult`, `LookupConfig`, `GENE_LOOKUP_CONFIG` (24-assembly map).
- `isCoordinate(term)`; `lookupGene(term, assemblyId) → GeneResult[]`.
- MyGene client + Ensembl 2-step client; normalize results incl. chromosome-name
  mapping to the assembly convention (the ⚠️ above).
- Session cache keyed `{term}:{assemblyId}`.
- Unit tests mock `fetch`; real APIs only in Phase 5 browser check.
- Deliberately AI-free — usable from the GQL console with no API key.

### Phase 2 — GQL integration (`queryLanguage.ts`)
- `NAVIGATE / ZOOM / SELECT … WITHIN / HIGHLIGHT / PAN` accept a gene term where
  they accept coordinates.
- Async `executeQueryWithGeneLookup()` resolves gene terms before executing;
  returns: resolved-and-executed | multi-match | no-match | error. Keep sync
  `executeQuery` for coordinate-only queries.

### Phase 3 — `GenePicker.svelte`
Themed/accessible modal (reuse SparseCoverageDialog + Settings patterns):
symbol, name, coords, source; ↑/↓/Enter/Esc; returns a selection.

### Phase 4 — UI wiring
- `SearchBar` + `QueryConsole`: input → coordinate? navigate. GQL? parse. Else →
  AI `translate()` → GQL → resolve gene names → execute. Async, with a
  "Looking up…" status.
- Lighter-touch AI: inline one-line explanation/clarification note.
- Multi-match: best-guess top hit + inline "Showing X. Also found: …" with
  GenePicker click-through.
- AI prompt update: emit gene symbols, never fabricate coordinates.

### Phase 5 — Verification
Unit tests (mocked) green + live-browser check against the real APIs: BRCA1
(human), an E. coli gene (assembly already loaded), a Botrytis gene (Ensembl);
full NL→AI→resolve→navigate; multi-match "guessed + alternatives" report.

## Notes
- Live AI path needs an API key in Settings; gene lookup itself does not.
- Phase 1 chromosome normalization is the most likely surprise — verify E. coli
  early.
