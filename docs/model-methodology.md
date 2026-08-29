# Model Methodology

**Current state, read this first:** The running application does not use a trained model.
Predictions come from a placeholder function (`server/models/*.ts`) that returns randomized
values shaped to look like plausible output, not from a trained CNN, BiLSTM, or Transformer —
no such trained models exist for this application. Predictions in the UI should be treated as
illustrative/demonstration output only.

A real model is being developed and evaluated offline, in a separate project
(`ml-training/peptide-mhc`), and is not yet wired into this app. Its held-out evaluation numbers
are reported below in "Real Model (In Progress)" and must never be presented as what this running
application currently outputs.

Everything below this point describes either (a) the current demonstration logic actually
present in the code, or (b) that separate, offline, in-progress model — never a shipped trained
model powering this app.

## Problem Statement

Given a peptide sequence of 8--15 amino acid residues, predict the probability that the peptide will bind to a specific MHC class I molecule. This is formulated as a binary classification task where the output is a binding probability in [0, 1].

## Input Representation

This preprocessing step is real and does run in the current code (`server/models/*.ts`,
`preprocess()`), even though the prediction step downstream of it is a placeholder:

1. **Sequence normalization**: Input sequences are validated to contain only the 20 standard amino acids (ACDEFGHIKLMNPQRSTVWY).
2. **Fixed-length encoding**: Sequences are padded (with zero vectors) or truncated to a maximum length of 15 residues.
3. **One-hot encoding**: Each amino acid is represented as a 20-dimensional binary vector, where the index corresponding to the amino acid is set to 1.
4. **Tensor shape**: The resulting tensor has shape `(15, 20)` -- 15 positions by 20 amino acid channels.

Note that this one-hot tensor is currently computed and then discarded — the placeholder
prediction step (below) does not consume it.

## Current State: Demonstration Prediction Logic

There is no trained model behind the running application. `server/models/cnn.ts`,
`bilstm.ts`, and `transformer.ts` each expose a `predictBinding()` method whose implementation
is a randomized placeholder (`Math.random()`-based) wrapped in an artificial `setTimeout` delay
to simulate compute time. Each file also hardcodes a `getMetrics()` return value (e.g. accuracy,
AUC, sensitivity, specificity) — these numbers are not derived from any evaluation run; they are
fixed literals invented to populate the UI's model-comparison views.

The five "architectures" surfaced in the UI (CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM Best,
Transformer) are labels on this same placeholder logic, not five distinct trained models. No
PyTorch model, weight file, or training run backs any of them, and the `.pt` files in `models/`
are not loaded by the server (see `docs/architecture.md`, "Model Loading").

**In short: any probability, confidence, or accuracy value the app currently displays is
illustrative demonstration output, not a model prediction.**

## Current State (superseded — read `client/src/lib/pmhc-model.ts` and `shared/pmhc-predictor.ts`)

**This section above described an earlier version of this app.** As of the model integration
recorded in `docs/CHANGE-RECORD-2026-08-26.md`, the running application no longer uses the
`Math.random()` placeholder: it loads the same XGBoost model described below as static JSON
assets and runs it client-side. The five fake "architectures" (CNN/BiLSTM/Transformer) are gone.
Kept above, unedited, as the historical record of what this app used to be — see the change
record for the full diff.

## The model this app actually serves

Trained in `ml-training/peptide-mhc/train_baseline.py`, exported to a compact JSON format the
browser can traverse (`shared/pmhc-predictor.ts` reimplements XGBoost tree traversal in
TypeScript; parity with the original Python model is checked by
`scripts/verify-parity.mjs` + `scripts/verify_parity.py`, max abs. difference 7.5e-08).

| Model | Data / Split | Held-out ROC-AUC | Held-out PR-AUC |
|-------|--------------|-------------------|-------------------|
| XGBoost baseline (allele pseudo-sequence conditioning) | MHCflurry curated data, leak-free peptide-grouped split | 0.9188 | 0.8085 |

"Peptide-grouped split" means no peptide sequence appears in both the training and test sets,
which avoids the inflated scores that come from sequence leakage across the split.

## Generalization and calibration (measured, not assumed)

The single held-out number above describes alleles the model was trained on and its raw,
uncalibrated output. Both gaps have since been measured — see `BENCHMARKS.md` for full detail
and source files, or the live evaluation panel on the app's home page:

- **Leave-one-allele-out**: macro ROC-AUC **0.842** across 14 held-out alleles (n-weighted 0.867),
  degrading by locus (HLA-A 0.874 → HLA-B 0.859 → HLA-C 0.749) and correlating with pseudo-sequence
  distance to the nearest trained allele (Pearson r = -0.677). An allele the model has never seen
  should be trusted noticeably less than the 0.9188 headline number.
- **Calibration**: the raw sigmoid this app displays has Brier 0.112 / ECE 0.093 (moderately
  miscalibrated, under-confident). Platt scaling would cut ECE to 0.008 with no ROC-AUC loss, but
  that correction is **not applied in production** — the probability shown is a ranking signal,
  not a calibrated percentage.
- **Mutation scan** (`/mutation-scan` in the app): live in-silico saturation mutagenesis —
  every position of a peptide substituted with all 20 amino acids and re-scored, rendered as a
  heatmap. This shows the trained model's own positional sensitivity; it is explicitly not a
  comparison to literature anchor-residue motifs, because no such motif dataset is checked into
  this repo to cite honestly.

## Limitations

- Training data has inherent biases toward well-studied alleles (particularly HLA-A\*02:01,
  14,387 training measurements vs. a few hundred for the long tail).
- Addresses peptide-MHC class I binding only, not class II.
- Held-out performance on a genuinely novel allele is measured above (LOAO) and is materially
  lower than the trained-allele number — this is stated in the app itself, not left implicit.
- Only quantitative affinity measurements were used; mass-spectrometry ligand data, which modern
  predictors rely on heavily, was excluded.
- The 500 nM binder threshold is conventional but arbitrary.

## References

- Jurtz, V., et al. (2017). NetMHCpan-4.0: Improved Peptide-MHC Class I Interaction Predictions. *Journal of Immunology*, 199(9), 3360-3368.
- O'Donnell, T. J., et al. (2018). MHCflurry: Open-Source Class I MHC Binding Affinity Prediction. *Cell Systems*, 7(1), 129-132.
- Vaswani, A., et al. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*, 30.
