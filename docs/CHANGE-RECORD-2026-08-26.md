# PeptideMHC — complete change record, 2026-08-26

Written for review. Every claim here is checkable against the repo; the
"Verify it yourself" section at the end gives the commands.

Commits: `2e02e43` (pre-existing baseline) → `cbae5c2` → `cd0f410`.
Net: 42 files changed, +4,887 / −9,836 lines.

---

## 1. What the app was before

- Every prediction came from `illustrativeScore()`, a deterministic function of
  average Kyte-Doolittle hydrophobicity and how close the length was to 9. It
  was **honestly labelled** as a placeholder — earlier work had already stripped
  the fabricated "94.2% accuracy" claims — but it was not a model.
- The UI offered **five architectures** (CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM
  Best, Transformer). All five called that same function.
- The MHC allele dropdown offered **four hardcoded alleles** and the selection
  was **collected and then discarded** — no prediction depended on it.
- An Express server existed. A separate background session had already deleted
  it and moved the endpoints in-browser before this session started; that work
  is inherited, not mine, and is described in §7.

## 2. The model now being served

Trained previously in `ml-training/peptide-mhc/train_baseline.py`; this session
exported and integrated it, it did not train it.

| Property | Value |
|---|---|
| Algorithm | XGBoost, 800 trees, `binary:logistic` |
| Target | P(IC50 < 500 nM) |
| Data | MHCflurry-curated public binding affinities |
| Rows | 120,000 (subsampled from 190,953, `random_state=42`) |
| Alleles | 129 HLA-A/B/C |
| Features | 1,000 = one-hot peptide (11 pos × 20 AA) + one-hot allele pseudo-sequence (39 pos × 20 AA) |
| Split | peptide-grouped 80/20 — no peptide in both train and test |
| **ROC-AUC** | **0.9185** |
| **PR-AUC** | **0.8056** |

The allele is represented by its **pseudo-sequence** — the binding-groove
residues that contact the peptide, the NetMHCpan convention. This is what makes
the model allele-conditioned instead of peptide-only.

### Recovering the exact trained-allele list

The exported allele table contained **20,249** pseudo-sequences, but only 129
were in training. Offering all 20,249 would let a user pick an allele the model
never saw and get a confident-looking number.

I re-ran the training script's data-prep verbatim (it is deterministic:
`cur.sample(n=120000, random_state=42)`) and reproduced its log exactly —
190,953 rows / 130 alleles → 120,000 rows / 129 alleles. The allele table was
then pruned to those 129, with per-allele row counts attached.

Side effect: the asset went from **1,166 KB → 11.9 KB**.

## 3. Files added

| File | Purpose |
|---|---|
| `shared/pmhc-predictor.ts` | XGBoost tree traversal + feature encoding in TypeScript. Pre-existing from the background session; **not written by me** — I reviewed and wired it. |
| `client/src/lib/pmhc-model.ts` | Lazy asset loader. Caches as a promise so concurrent callers share one download; clears the cache on failure so a network error is retryable. Loads the 12 KB allele table separately from the 2.6 MB model so the dropdown fills without pulling the trees. |
| `client/public/models/pmhc_model.json` | 800 trees, 2.6 MB (658 KB gzipped). |
| `client/public/models/pmhc_alleles.json` | 129 pseudo-sequences + training counts, 11.9 KB. |
| `scripts/verify-parity.mjs` | Scores 516 fixed peptide/allele pairs via the browser code path. |
| `scripts/verify_parity.py` | Scores the same pairs with the original Python model; fails above 1e-06. |
| `vercel.json` | Static build config; SPA rewrite excludes `/models/` so assets aren't swallowed. |

## 4. Files changed, and why

### `shared/schema.ts`
- `MODEL_KEYS`: five fake keys → `["xgb_pseudoseq"]`. Removed rather than
  renamed, so the UI cannot offer a model that does not exist.
- Peptide validation: was `min(1).max(15)`; now **8–11**, the trained range.
  Previously the encoder silently truncated anything longer.
- `mhcAllele` added to `mutationRequestSchema`.
- Design length capped 15 → 11.
- Response gains `margin`, `alleleSupportN`, `alleleSupport`, `disclaimer`.

### `client/src/lib/local-backend.ts`
- Imports the real predictor instead of the placeholder.
- `predict()` is now async, awaits the model, **rejects untrained alleles** with
  a 400 rather than scoring them.
- `scoreFor()` (used by batch / mutation / design) same guard — see §6, item 4.
- Metrics are read from `PMHC_MODEL_CARD` rather than retyped, so the displayed
  numbers cannot drift from the model.
- `/api/models/performance` and `/api/visualize/data/` return the real model
  card instead of placeholder slot lists.
- `/api/predictions` added so charts can use real history.
- `modelsLoaded` reflects whether the model is actually in memory.

### `client/src/components/prediction-form.tsx`
- Allele dropdown is populated from the **129 trained alleles**, each showing
  its training-row count. Was four hardcoded entries.
- Default peptide `SIINFEKL` → `GILGFVFTL`. SIINFEKL is a **mouse H-2Kb**
  epitope; on a human-HLA-only model it scores ~0.35 and makes a working model
  look broken. GILGFVFTL is the canonical human influenza M1 / HLA-A\*02:01
  epitope and scores 0.906.

### `client/src/pages/visualize.tsx`
- `mockPredictionDistribution` and `mockSequenceLength` were hard-coded arrays
  presented as charts. Now computed from predictions actually made in this
  browser, with an empty state when there are none.

### Copy updated to match reality
`App.tsx` banner, `model-selector.tsx`, `prediction-results.tsx`,
`analysis.tsx`, `batch.tsx`, `model-performance.tsx`.

**Deliberately left alone:** the "illustrative" labels on motif-enrichment
p-values and the static example in `analysis.tsx`. Those are *still* illustrative
— only the model-backed claims were flipped.

### Docs
`README.md` rewritten (441 lines → ~130). `BENCHMARKS.md` rewritten.
`CHANGELOG.md`, `CITATION.cff`, `docs/model-methodology.md` corrected.

## 5. The retracted ESM-2 number

`BENCHMARKS.md` published **"ESM-2 150M + LoRA — ROC-AUC 0.922 / PR-AUC 0.827"**
in a public repo. It also appeared in `CITATION.cff`, `docs/model-methodology.md`,
`shared/illustrative-scorer.ts`, `model-performance.tsx` and `visualize.tsx`.

I could find **no model file and no metrics artifact** backing it — not on this
laptop, not in the desktop's user tree. The only ESM artifact that exists is
`pmhc_esm_metrics.json`, an 8M-parameter frozen smoke test reporting **0.590**.

Removed from all six locations.

**Caveat on my search:** I scanned `C:\Users` on the desktop and the full
laptop project tree. I did not scan every drive on the desktop — a full `C:\`
recursive scan timed out. So "no artifact found" is not the same as "definitely
never existed". If a metrics file turns up, the number can be restored; until
then it must not be published.

## 6. Integration bugs found and fixed

These are the "plugged in without changing the surroundings" problems. Found by
auditing the integration surface after the model was already working — all six
are real, and all are fixed in `cd0f410`.

1. **`.gitignore` had a bare `public` rule** (inherited Gatsby boilerplate) that
   matched `client/public`. The model assets would never have been committed.
   *Production would have 404'd.*
2. **Vite's `publicDir` is `client/public`, not repo root.** I first put the
   models at repo root; they were not copied into `dist/`. Same 404, different
   cause. Caught by checking `dist/` rather than trusting the build's success.
3. **The "Confidence %" tile was misleading.** I had defined confidence as
   `|p − 0.5| × 2` — distance from the decision boundary — but the UI still
   captioned it "High Reliability" above 90. A confident *non-binder* (p=0.02)
   would render "96% Confidence / High Reliability". Replaced with the training-
   measurement count for the selected allele. The model produces no uncertainty
   estimate and the UI should not imply one.
4. **`scoreFor()` did not guard unknown alleles.** An unknown allele encodes as
   an all-zero block and the model still returns a plausible number. The
   `/api/predict` path checked; the batch / mutation / design path did not.
   Now throws. *Not reachable today* — all 15 alleles the design page offers are
   in the trained set (I checked) — but latent.
5. **`sample_peptide_dataset.csv` shipped 12- and 13-residue peptides.** With
   peptides now restricted to 8–11, uploading the project's own sample file
   failed validation for the entire batch. Both rows removed (42 remain).
6. **The batch page had no client-side length check**, so that failure surfaced
   as an unexplained 400. It now names the offending sequences.

Also corrected in the same pass:
- Binding strength quoted **invented affinity bands** ("IC50 500–5000 nM"). The
  model predicts P(IC50 < 500 nM) and never estimates an IC50. Bands now
  describe the probability.
- The metrics panel labelled fields "Training Accuracy" / "Test Sensitivity"
  while carrying a row count and a "not measured" string. Relabelled.

## 7. What I did NOT do — read this part

- **I did not train the model.** It existed. I exported, pruned, integrated and
  verified it.
- **I did not write `shared/pmhc-predictor.ts`.** A background session did. I
  reviewed it and wrote the parity tests that check it.
- **I did not remove the Express server.** Same background session.
- **Mutation analysis never sends an allele.** It silently defaults to
  HLA-A\*02:01 and the UI gives no allele control. Works, but undisclosed —
  worth fixing.
- **`margin` is returned by the API and displayed nowhere.** Dead payload.
- **No leave-one-allele-out evaluation exists.** The 0.9185 describes alleles the
  model has seen. Performance on an unseen allele is **unknown**, and that is the
  more useful number for a real predictor.
- **`literature.tsx`, `projects.tsx`, `settings.tsx`, `databases.tsx` were not
  reviewed** in this pass beyond a grep for stale model references.
- **No browser smoke test was run.** The Chrome extension was not connected. I
  verified via Node against the served assets over HTTP — which covers the fetch
  path, asset URLs, parsing and prediction, but *not* React rendering. Nobody has
  clicked the live UI.
- **`peptide.arditmishra.com` still points at the old host.** The Hostinger CNAME
  needs to point at `cname.vercel-dns.com` and the domain must be added in Vercel.

## 8. Verify it yourself

```bash
# Parity between the browser code path and the original Python model
node scripts/verify-parity.mjs
uv run --with xgboost --with "numpy<2" python scripts/verify_parity.py
# expect: max |python - js| ~7e-08 over 516 pairs, PASS

npm run check     # typecheck, expect 0 errors
npm run build     # expect dist/public/models/ to contain both JSONs
```

Biological sanity — known epitopes, from `BENCHMARKS.md`:

| Peptide | Allele | p | Meaning |
|---|---|---|---|
| GILGFVFTL | HLA-A\*02:01 | 0.906 | influenza M1, correct allele |
| NLVPMVATV | HLA-A\*02:01 | 0.907 | CMV pp65 |
| GLCTLVAML | HLA-A\*02:01 | 0.915 | EBV BMLF1 |
| KRWIILGLNK | HLA-B\*27:05 | 0.785 | HIV gag KK10 |
| **GILGFVFTL** | **HLA-B\*07:02** | **0.194** | **same peptide, wrong allele** |
| AAAAAAAAA | HLA-A\*02:01 | 0.361 | no anchor residues |

The last two matter most. The wrong-allele drop (0.906 → 0.194) is the evidence
that the allele is genuinely being used; nothing else in this change set proves
that as directly.

## 9. Questions worth asking a reviewer

1. Is `|p − 0.5| × 2` worth exposing at all, or should `confidence` leave the
   response entirely? It is currently computed and returned but no longer shown.
2. Should the app offer alleles outside the trained 129, clearly labelled
   "unverified", instead of refusing them? Pseudo-sequence encoding is *designed*
   to generalize — refusing may be over-cautious.
3. Should the batch path run in a Web Worker? It is 0.087 ms per peptide, so a
   1,000-peptide batch is ~90 ms and blocks the main thread. Probably fine.
4. Is dropping the two long peptides from the sample dataset the right call, or
   should the model handle 12–15mers (retraining with a longer encoding)?
