# Tests

Run all of them:

```bash
node --test scripts/tests/*.test.mjs
```

No test framework dependency (no vitest/jest) — these use Node's built-in
`node:test` runner (Node 18.1+; this repo targets Node 24) and import
`shared/*.ts` **directly**, because Node 22.6+ strips TypeScript types
natively for files with no enums/namespaces/decorators, which is all
`shared/schema.ts` and `shared/pmhc-predictor.ts` use. That means these tests
run the app's actual validation and inference code, not a hand-copied
reimplementation of it — verified once with:

```js
node -e "import('./shared/pmhc-predictor.ts').then(m => console.log(Object.keys(m)))"
```

| File | Covers |
|---|---|
| `schema.test.mjs` | Malformed-peptide and unsupported-model-key rejection via the real zod schemas. |
| `encoder.test.mjs` | `PeptideMHCPredictor` against the real shipped model assets — feature-count consistency, unsupported-allele guard, determinism, allele-conditioning. |
| `sanity.test.mjs` | The exact "biological sanity check" table published in `BENCHMARKS.md`, re-verified against the live asset so a published number can't silently drift from what ships (see `docs/CHANGE-RECORD-2026-08-26.md` §5 for the failure mode this guards against). |
| `model-card.test.mjs` | `PMHC_MODEL_CARD` (shared/pmhc-predictor.ts) stays consistent with the shipped asset and with the numbers quoted in `BENCHMARKS.md`. Two tests additionally cross-check against `ml-training/peptide-mhc/*.json` when that sibling repo happens to be present on disk (`test.skip` otherwise — it is not checked out in CI). |

What these do **not** cover: `client/src/lib/local-backend.ts` and
`pmhc-model.ts` use browser-only APIs (`fetch`, `localStorage`,
`import.meta.env`) and can't run under plain Node. Their allele/peptide
guards are exercised indirectly here via the same `shared/pmhc-predictor.ts`
primitives they call (`hasAllele`, `encode(...).alleleKnown`) — see the
comment in `encoder.test.mjs`.
