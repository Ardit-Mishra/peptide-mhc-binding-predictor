# Performance Benchmarks

Every number on this page was produced by a script in this repository and can be
reproduced with the commands shown. Nothing here is estimated or carried over
from a previous version of the project.

## Model

| | |
|---|---|
| Task | MHC class I peptide binding (IC50 < 500 nM) |
| Algorithm | XGBoost gradient-boosted trees, 800 estimators |
| Features | one-hot peptide (11 positions) + one-hot allele pseudo-sequence (39 positions) = 1,000 |
| Training data | MHCflurry-curated public binding affinity measurements |
| Training rows | 120,000 across 129 HLA-A/B/C alleles |
| Split | peptide-grouped 80/20 — no peptide appears in both training and test |

The allele is encoded as its pseudo-sequence (the NetMHCpan approach of
representing an allele by the binding-groove residues that contact the peptide),
so the model is genuinely allele-conditioned rather than peptide-only.

## Held-out results

A single evaluation on the held-out split. There is no second number to choose
from and no validation score reported as a test score.

| Metric | Value |
|---|---|
| ROC-AUC | **0.9188** |
| PR-AUC | **0.8085** |
| Test rows | 23,866 (27.8% binders) |

Published MHC-I predictors trained on far more data and with allele-aware
architectures report higher figures; this is a solid baseline, not
state of the art.

### Known limitations

- Alleles are unevenly supported: HLA-A\*02:01 has 14,387 training measurements,
  while the long tail has a few hundred. The app shows the count for whichever
  allele you select, because a prediction backed by 200 measurements deserves
  less trust than one backed by 14,000.
- Only quantitative affinity measurements were used. Mass-spectrometry ligand
  data, which modern predictors rely on heavily, was excluded.
- The 500 nM binder threshold is conventional but arbitrary.

## Leave-one-allele-out generalization

The studies below (LOAO, calibration, split ladder) are a re-run of
`train_baseline.py` — same code, same hyperparameters, same `random_state=42`
— and reproduce that run's own peptide-grouped ROC-AUC/PR-AUC (0.9188 / 0.8085)
to full float precision, so they describe the exact model exported to
`client/public/models/pmhc_model.json` (see `pmhc_metrics_split_ladder.json`
rung 2 against `pmhc_metrics.json`, and the browser/Python parity check
below).

The 0.9188 above describes alleles the model was trained on. To measure the
harder, more useful case — an allele absent from training entirely — 14 of the
129 trained alleles (spanning HLA-A/B/C and a range of prevalence; not
exhaustive, for compute budget) were each held out completely and re-trained
against, then scored as if never seen:

```bash
uv run --python 3.12 --with xgboost --with pandas --with scikit-learn \
  python ml-training/peptide-mhc/loao_distance_study.py
```

| | Macro ROC-AUC | n-weighted ROC-AUC | Alleles |
|---|---|---|---|
| Overall | **0.842** | 0.867 | 14 |
| HLA-A | 0.874 | 0.877 | 6 |
| HLA-B | 0.859 | 0.847 | 5 |
| HLA-C | **0.749** | 0.751 | 3 |

HLA-C — the least-represented locus in training — generalizes worst; one
held-out HLA-C allele's PR-AUC is as low as 0.181 on only 27 positives out of
526 rows. Distance to the nearest trained allele's pseudo-sequence correlates
with the drop (Pearson r = -0.677, Spearman r = -0.564): a genuinely novel
allele should be trusted less than these averages suggest, not more. Full
per-allele numbers: `ml-training/peptide-mhc/pmhc_metrics_loao_distance.json`.

## Calibration

The model's raw sigmoid output is what this app displays. It has never had
Platt or isotonic scaling applied in production. Measured on the held-out
peptide-grouped test split (23,866 rows):

```bash
uv run --python 3.12 --with xgboost --with pandas --with scikit-learn \
  python ml-training/peptide-mhc/calibration_study.py
```

| | Brier score | ECE (10-bin) |
|---|---|---|
| Raw (served in production) | 0.1119 | **0.0925** |
| Platt-scaled (offline only, not served) | 0.0993 | 0.0084 |
| Isotonic (offline only, not served) | 0.0994 | 0.0104 |

Verdict: **moderately miscalibrated, systematically under-confident** — a raw
score of 0.65 does not mean 65% of such peptides bind. Platt scaling on a
held-out validation split would cut ECE roughly 11x with no ROC-AUC loss, but
that correction is not wired into the live app; read the probability as a
ranking, not a calibrated percentage. Full numbers, plus a reliability
diagram: `ml-training/peptide-mhc/pmhc_metrics_calibration.json` and
`pmhc_reliability_diagram.png`.

## Split difficulty ladder

The same 120,000-row dataset and model hyperparameters, scored on four splits
of increasing difficulty, shows how much of 0.9188 is a property of the split
rather than the model:

| Split | ROC-AUC | PR-AUC |
|---|---|---|
| Random (leaks — same peptide can land in both train and test) | 0.9270 | 0.8367 |
| Peptide-grouped (**same split as production**) | 0.9188 | 0.8085 |
| Sequence-cluster (approximate, single-substitution union-find) | 0.9144 | 0.8074 |
| Allele-held-out (LOAO, above) | 0.8419 | 0.6432 |

`ml-training/peptide-mhc/pmhc_metrics_split_ladder.json`

## Biological sanity check

Aggregate metrics can hide a model that has learned the wrong thing, so the
model was also checked against textbook epitopes it was never specifically
tuned for. These are literature-known immunodominant epitopes and their
restricting alleles:

| Peptide | Allele | p(bind) | Epitope |
|---|---|---|---|
| GILGFVFTL | HLA-A\*02:01 | **0.895** | Influenza A M1 58-66 |
| NLVPMVATV | HLA-A\*02:01 | **0.918** | CMV pp65 |
| GLCTLVAML | HLA-A\*02:01 | **0.921** | EBV BMLF1 |
| KRWIILGLNK | HLA-B\*27:05 | **0.762** | HIV-1 gag KK10 |
| RAKFKQLL | HLA-B\*08:01 | 0.535 | EBV BZLF1 |

Two controls matter more than the positives:

| Case | p(bind) | Why it matters |
|---|---|---|
| GILGFVFTL on HLA-B\*07:02 | **0.214** | Same peptide, wrong allele. The score collapses from 0.895, so the model is genuinely conditioning on the allele rather than scoring peptides alone. |
| AAAAAAAAA on HLA-A\*02:01 | 0.382 | Poly-alanine has no anchor residues and scores low. |

The wrong-allele control is the important one: the earlier version of this
project fed the allele to the UI but never to the model. It does now.

## Browser/Python parity

The app runs inference client-side by reimplementing XGBoost tree traversal in
TypeScript. That is only legitimate if it reproduces the original model, so it is
tested rather than asserted:

```bash
node scripts/verify-parity.mjs      # score pairs with the browser code path
uv run --with xgboost --with "numpy<2" python scripts/verify_parity.py
```

Result on 516 peptide/allele pairs spanning all 129 alleles and lengths 8-11:

| | |
|---|---|
| Max abs. difference | **7.5e-08** |
| Mean abs. difference | 1.1e-08 |
| Speed | **0.089 ms** per prediction (single-threaded JS) |

The residual is float32 rounding in the tree-sum accumulation, not a logic
difference. The check fails the build if any difference exceeds 1e-06.

## Runtime cost

| | |
|---|---|
| Model asset | 2.6 MB JSON, **658 KB** gzipped |
| Allele table | 12 KB, 2 KB gzipped |
| When downloaded | on first prediction, not at page load |
| Server compute | none — there is no backend |

## What this app does *not* do

- No IEDB, UniProt, or PDB integration exists. Those endpoints report
  "not connected" rather than returning invented records.
- The peptide designer generates **uniformly random** sequences and scores them
  with the model. It is not a generative or optimization model.
- Motif-enrichment p-values on the analysis page are static illustrative
  examples and are labelled as such in the UI.

## Reproducing the model

Training code lives in `ml-training/peptide-mhc/` (outside this repo):

```bash
uv run --with xgboost --with pandas --with "numpy<2" --with scikit-learn \
  python train_baseline.py          # downloads MHCflurry data, trains, evaluates
python export_for_browser.py        # emits the compact JSON the app ships
```

## Citation

```bibtex
@software{mishra2026peptidemhc,
  title  = {Peptide-MHC Class I Binding Predictor},
  author = {Mishra, Ardit},
  year   = {2026},
  url    = {https://github.com/Ardit-Mishra/peptide-mhc-binding-predictor},
  note   = {XGBoost model with allele pseudo-sequence conditioning, held-out
            peptide-grouped ROC-AUC 0.919, served client-side. Research and
            educational use only; not a clinical or diagnostic tool.}
}
```

---

*Last verified: August 2026*
