# Performance Benchmarks

## Status: Demonstration UI, Not Trained Models

This app's live predictions are **illustrative placeholder outputs**, not the output of a trained
model. The five "architectures" exposed in the UI (CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM Best,
Transformer) do not have corresponding trained weights wired into an inference engine — there is no
model-performance leaderboard to report for this running app, and the numbers that used to appear
here were never produced by any training run. They have been removed.

## Real Model — Offline, Being Integrated

A real allele-conditioned binding predictor has been trained **offline**, separately from this app,
using MHCflurry curated data with allele pseudo-sequence conditioning and a leak-free
peptide-grouped train/test split (peptides in the held-out test set never appear in training).
Held-out test results:

| Model | ROC-AUC | PR-AUC |
|-------|---------|--------|
| XGBoost baseline | 0.919 | -- |
| ESM-2 150M + LoRA | 0.922 | 0.827 |

These are **offline held-out evaluation numbers of a model currently being integrated** — they are
not what the live `peptide.arditmishra.com` app currently outputs. Integrating this model into the
running service is a separate, in-progress effort.

## What the Live App Actually Does

- `server/models/{cnn,bilstm,transformer}.ts` generate scores using `Math.random()`, with an
  artificial `setTimeout` delay standing in for compute time. No tensor computation happens.
- `models/*.pt` files exist on disk in the `models/` directory. The server checks that these files
  are present at startup; it does not load them into any inference engine and does not read their
  weights. They are not currently used for prediction in any way.

## Resource Usage (Actual)

- Memory (RSS): ~200-400MB during active use (Node/Express + React dev tooling), not attributable to
  model inference since none occurs.
- Disk: the `.pt` files under `models/` total roughly 135MB but are inert -- present on disk, not
  loaded or read by the running server.
- Startup time: 2-5 seconds (this is file-existence validation, not model weight loading).

## Build Verification

```bash
npm ci                 # Install exact dependency versions
npm run check          # TypeScript type checking
npm run build           # Production build (frontend + backend)
```

## Citation

If you reference this project, please cite it as a demonstration application, not a validated ML
system:

```bibtex
@software{mishra2025peptide,
  title  = {Peptide-MHC Binding Predictor (Demonstration UI)},
  author = {Mishra, Ardit},
  year   = {2025},
  url    = {https://github.com/arditmishra/peptide-mhc-predictor},
  note   = {Demonstration interface with illustrative predictions; no trained model is
            currently served. A real offline-trained model (XGBoost / ESM-2+LoRA, held-out
            ROC-AUC 0.919 / 0.922) is being integrated separately.}
}
```

---

*Last updated: August 2026*
