# Peptide-MHC Model Card

## Identity and intended use

**Model:** Peptide-MHC Class I Binding Predictor, exported XGBoost tree model.

**Intended use:** research and educational ranking of 8-11 residue peptides
against supported human HLA class I alleles. It may help explore candidate
peptide/allele pairs and compare scores within the supported input space.

**Not intended for:** diagnosis, prognosis, therapy selection, clinical trial
enrollment, patient-specific decisions, class II prediction, immunogenicity
prediction, or de novo peptide design.

## Model and data

- **Runtime:** XGBoost-trained gradient-boosted trees (800 estimators), exported
  to a compact tree representation and executed locally in TypeScript.
- **Target:** quantitative binding affinity thresholded at IC50 < 500 nM.
- **Training data:** MHCflurry-curated public binding-affinity measurements.
- **Training set:** 120,000 training rows across 129 supported HLA-A, -B, and
  -C alleles.
- **Encoding:** one-hot peptide at 11 positions plus one-hot 39-residue allele
  pseudo-sequence, for 1,000 total features.
- **Split:** peptide-grouped 80/20. No peptide appears in both training and
  held-out test data.

Only the 129 alleles represented in the shipped allele artifact are accepted at
runtime. This rejection is intentional: treating an unseen allele as an
all-zero feature vector would create a scientifically misleading prediction.

## Evaluation

| Evaluation | Result |
|---|---|
| Held-out ROC-AUC | **0.9188** |
| Held-out PR-AUC | **0.8085** |
| Held-out test rows / binder rate | 23,866 / 27.82% |
| LOAO macro ROC-AUC, 14 alleles | **0.842** |
| LOAO n-weighted ROC-AUC | 0.867 |
| LOAO HLA-A / HLA-B / HLA-C macro ROC-AUC | 0.874 / 0.859 / 0.749 |
| Raw Brier score / 10-bin ECE | 0.1119 / **0.0925** |

The application serves the raw model score. It does **not** apply the offline
Platt calibration experiment, which reduced ECE to 0.0084. A raw score should
therefore be used as a ranking signal, not read as a calibrated probability.

The reported browser/Python parity check covers 516 peptide/allele pairs across
all supported alleles. Its maximum absolute difference is 7.481e-08, under the
1e-06 failure threshold.

## Limitations and non-goals

- Coverage is uneven. HLA-A*02:01 has 14,387 training measurements; alleles in
  the tail have only a few hundred.
- The model uses quantitative affinity data, not mass-spectrometry ligand data.
- The leave-one-allele-out result is weaker than the supported-allele result,
  particularly for HLA-C; it should not be interpreted as a universal-allele
  guarantee.
- The 500 nM classification target is conventional but does not make a binding
  score clinically actionable.
- The model has not been validated as a clinical tool or a substitute for
  experimental assays.

## Artifact provenance and reproducibility

The browser model and allele assets are committed in this repository. The
repository also commits a Python reference-score fixture and verbatim metric
snapshots under `scripts/fixtures/training-metrics/`. SHA-256 metadata in that
directory's `MANIFEST.json` is verified in the test suite.

This is a traceable **artifact package**, not full independent retraining
reproduction: the original training checkout and its full dataset preparation
environment are not public in this repository. The exact boundary, commands
that run here, and the optional local cross-check against that checkout are
documented in [REPRODUCIBILITY.md](REPRODUCIBILITY.md).

## References

- O'Donnell TJ, et al. MHCflurry: Open-source class I MHC binding affinity
  prediction. *Cell Systems* (2018).
- Jurtz V, et al. NetMHCpan-4.0: Improved peptide-MHC class I interaction
  predictions integrating eluted ligand and peptide binding affinity data.
  *Journal of Immunology* (2017).
