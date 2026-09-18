# Reproducibility and Evidence Boundary

This repository is designed so that the model **it ships** can be inspected and
tested without a hosted service or the original training checkout. It does not
claim that a fresh clone can retrain the model end-to-end.

## What a fresh clone can verify

```bash
npm ci
npm run check
node --experimental-strip-types --test "scripts/tests/*.test.mjs"
npm run build
```

These checks verify the TypeScript source, static production bundle, and the
following evidence chain:

| Check | What it proves |
|---|---|
| Export-format test | the committed JSON model is self-describing enough for an independent tree traversal |
| Python-reference test | the shipped TypeScript predictor matches 516 recorded original-booster outputs |
| Asset-hash checks | a changed model or allele artifact invalidates the reference fixture |
| Model-card checks | user-facing headline metrics agree with runtime-owned facts and captured metric artifacts |
| Batch-input tests | FASTA/CSV allele labels remain paired with their intended peptides |
| Runtime-boundary tests | unsupported alleles are refused instead of receiving a peptide-only score |

`scripts/fixtures/training-metrics/MANIFEST.json` records SHA-256 digests,
capture time, and the source MLflow run identifier for the verbatim metric
snapshots used by the model-card tests.

## Optional local training-checkout guard

When a sibling `ml-training/peptide-mhc` checkout is present, the test suite
also compares every committed metric snapshot byte-for-byte with its source.
Without that checkout, Node marks that one guard as skipped with an explicit
reason; all artifact and runtime tests still run.

The stronger browser/Python parity check requires the original model artifact
and Python dependencies available to that training checkout:

```bash
node --experimental-strip-types scripts/verify-parity.mjs
uv run --with xgboost --with "numpy<2" python scripts/verify_parity.py
```

The first command exercises the shipped TypeScript code path. The second
command is an optional local comparison against the original XGBoost booster.

## What is not reproduced here

This repository does not publish the original training checkout, raw prepared
dataset, or fully locked training environment. Therefore a third party can
verify the committed runtime, recorded source outputs, model-card metrics, and
artifact hashes, but cannot independently regenerate the training run from this
repository alone.

That limitation is intentional and explicit. A future public training release
would need the data-license review, preprocessing scripts, pinned environment,
training invocation, and artifact-export procedure needed to turn this package
into a full retraining reproduction.
