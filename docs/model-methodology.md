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

## Real Model (In Progress)

A real, trained model is being developed and evaluated offline in a separate project
(`ml-training/peptide-mhc`) and is **not yet integrated into this application**. It is not the
architecture UI currently exposes (no CNN/BiLSTM/Transformer), and its numbers below describe
held-out offline evaluation only — never this app's live output.

| Model | Data / Split | Held-out ROC-AUC | Held-out PR-AUC |
|-------|--------------|-------------------|-------------------|
| XGBoost baseline (allele pseudo-sequence conditioning) | MHCflurry curated data, leak-free peptide-grouped split | 0.919 | -- |

"Peptide-grouped split" means no peptide sequence appears in both the training and test sets,
which avoids the inflated scores that come from sequence leakage across the split. Integrating
this model into the running application (replacing the placeholder logic above) is separate,
in-progress work and is not part of this document's demonstration description.

## Limitations

- The application currently in production uses simulated (random) inference, not a trained
  model. See "Current State" above.
- The real, offline-evaluated model described above has its own limitations: training data
  has inherent biases toward well-studied alleles (particularly HLA-A*02:01); it addresses
  peptide-MHC class I binding only, not class II; and held-out performance may not generalize
  to novel alleles or peptide families outside the training distribution.
- For production-grade predictions from the real model, a Python-based inference backend or
  ONNX runtime integration would be required to serve it from this application — that
  integration work is out of scope for this document.

## References

- Jurtz, V., et al. (2017). NetMHCpan-4.0: Improved Peptide-MHC Class I Interaction Predictions. *Journal of Immunology*, 199(9), 3360-3368.
- O'Donnell, T. J., et al. (2018). MHCflurry: Open-Source Class I MHC Binding Affinity Prediction. *Cell Systems*, 7(1), 129-132.
- Vaswani, A., et al. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*, 30.
