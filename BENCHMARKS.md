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
| ROC-AUC | **0.9185** |
| PR-AUC | **0.8056** |
| Test rows | 23,866 (27.8% binders) |

Published MHC-I predictors trained on far more data and with allele-aware
architectures report higher figures; this is a solid baseline, not
state of the art.

### Known limitations

- **Leave-one-allele-out generalization was not measured.** The peptide-grouped
  score describes performance on alleles the model has seen. It says nothing
  about an allele absent from training, which is the harder and more useful
  case.
- Alleles are unevenly supported: HLA-A\*02:01 has 14,387 training measurements,
  while the long tail has a few hundred. The app shows the count for whichever
  allele you select, because a prediction backed by 200 measurements deserves
  less trust than one backed by 14,000.
- Only quantitative affinity measurements were used. Mass-spectrometry ligand
  data, which modern predictors rely on heavily, was excluded.
- The 500 nM binder threshold is conventional but arbitrary.

## Biological sanity check

Aggregate metrics can hide a model that has learned the wrong thing, so the
model was also checked against textbook epitopes it was never specifically
tuned for. These are literature-known immunodominant epitopes and their
restricting alleles:

| Peptide | Allele | p(bind) | Epitope |
|---|---|---|---|
| GILGFVFTL | HLA-A\*02:01 | **0.906** | Influenza A M1 58-66 |
| NLVPMVATV | HLA-A\*02:01 | **0.907** | CMV pp65 |
| GLCTLVAML | HLA-A\*02:01 | **0.915** | EBV BMLF1 |
| KRWIILGLNK | HLA-B\*27:05 | **0.785** | HIV-1 gag KK10 |
| RAKFKQLL | HLA-B\*08:01 | 0.566 | EBV BZLF1 |

Two controls matter more than the positives:

| Case | p(bind) | Why it matters |
|---|---|---|
| GILGFVFTL on HLA-B\*07:02 | **0.194** | Same peptide, wrong allele. The score collapses from 0.906, so the model is genuinely conditioning on the allele rather than scoring peptides alone. |
| AAAAAAAAA on HLA-A\*02:01 | 0.361 | Poly-alanine has no anchor residues and scores low. |

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
| Max abs. difference | **7.0e-08** |
| Mean abs. difference | 1.1e-08 |
| Speed | **0.077 ms** per prediction (single-threaded JS) |

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
