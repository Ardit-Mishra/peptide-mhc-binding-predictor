![Peptide-MHC Binding Predictor](assets/banner.png)

# Peptide-MHC Class I Binding Predictor

A browser-local research workbench for scoring 8-11 residue peptides against
human MHC class I (HLA) alleles. It runs a trained, allele-conditioned XGBoost
model entirely on the user's machine: no prediction API, database, secret, or
server-side inference path is involved.

**Live:** [peptide.arditmishra.com](https://peptide.arditmishra.com)

**Read first:** [what was tried and why this model](DECISIONS.md) · [model card](docs/MODEL-CARD.md) ·
[benchmarks](BENCHMARKS.md) ·
[reproducibility boundary](docs/REPRODUCIBILITY.md) ·
[architecture](docs/architecture.md)

> Research and educational use only. This application is not a clinical,
> diagnostic, or treatment-selection tool.

---

## What it does

Given an 8-11 residue peptide and an HLA class I allele, the workbench returns
the model's raw score for the training target, IC50 < 500 nM. It supports
single prediction, allele-preserving batch FASTA/CSV input, mutation scanning,
and local-only history/export.

The score is an **uncalibrated ranking signal**, not a probability of binding.
It has held-out ROC-AUC **0.9188** and PR-AUC **0.8085** on a peptide-grouped
split, but raw 10-bin ECE **0.0925**. Read it as comparative evidence rather
than a clinical probability; full limitations are in the
[model card](docs/MODEL-CARD.md#limitations-and-non-goals).

The model is genuinely allele-conditioned. A **39-residue pseudo-sequence**
contributes 780 of the 1,000 input features. For example, `GILGFVFTL` scores
0.895 on HLA-A*02:01 and 0.214 on HLA-B*07:02 in the shipped runtime. An
unsupported allele would leave all 780 of its allele features blank, so the
runtime refuses it rather than returning a peptide-only score.

## Model at a glance

| | |
|---|---|
| Algorithm | XGBoost gradient-boosted trees, 800 estimators |
| Training data | MHCflurry-curated public binding-affinity measurements |
| Rows / alleles | 120,000 / 129 HLA-A, -B, and -C alleles |
| Features | one-hot peptide (11 x 20) + allele pseudo-sequence (39 x 20) |
| Evaluation split | peptide-grouped 80/20; no peptide in both train and test |
| Held-out ROC-AUC / PR-AUC | **0.9188 / 0.8085** |
| Runtime | compact exported trees evaluated locally in TypeScript |

The 14-allele leave-one-allele-out study is deliberately less flattering:
macro ROC-AUC **0.842**, including **0.749** for HLA-C. This is a baseline for
supported alleles, not a claim of state-of-the-art generalization.

## Evidence and verification

The repository makes different claims testable by different checks:

```bash
npm ci
npm run check
node --experimental-strip-types --test "scripts/tests/*.test.mjs"
npm run build
```

The suite validates the exported model structure, browser/Python reference
fixture, asset hashes, batch allele pairing, runtime refusal for unsupported
alleles, and published-model-card consistency. One optional local guard also
compares committed metric snapshots with the private training checkout when it
is available. See [reproducibility](docs/REPRODUCIBILITY.md) for exactly what
is and is not independently reproducible from this repository.

The app's browser runtime is checked against the original XGBoost booster over
516 peptide/allele pairs spanning every supported allele. The recorded maximum
absolute difference is **7.481e-08**, below the **1e-06** failure threshold.

## Local development

```bash
npm ci
npm run dev
npm run check
npm run build
```

`npm run dev` starts the Vite development server. `npm run build` writes a
static bundle to `dist/public`; any static host can serve it.

## Architecture

The application is a React/Vite single-page application. Prediction requests
are handled in-browser by `client/src/lib/local-backend.ts`, which loads
versioned JSON model assets and invokes `shared/pmhc-predictor.ts`. Local
history uses `localStorage`; there is no deployed backend. The complete current
architecture is documented in [docs/architecture.md](docs/architecture.md).

## Scope

- Supported task: quantitative MHC class I affinity ranking for 8-11 residue
  peptides and the 129 alleles represented in the shipped artifact.
- Unsupported alleles are refused rather than scored from blank allele features.
- This is not a class II predictor, immunogenicity predictor, mass-spectrometry
  ligand predictor, generative peptide-design system, or clinical workflow.
- The app makes no live IEDB, UniProt, PDB, or literature API calls.

## Historical record

The project previously contained placeholder scoring and unsubstantiated model
claims. Those paths were removed; the current historical account and the
evidence used to replace them are preserved in
[docs/CHANGE-RECORD-2026-08-26.md](docs/CHANGE-RECORD-2026-08-26.md).

## License

MIT — see [LICENSE](LICENSE).
