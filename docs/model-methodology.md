# Model Methodology

This page is the short methodology entry point for the model currently shipped
by Peptide-MHC. The complete, versioned description is the
[model card](MODEL-CARD.md); reproducibility limits and commands are in
[REPRODUCIBILITY.md](REPRODUCIBILITY.md).

## Current runtime

The application executes an exported **XGBoost gradient-boosted tree ensemble
(800 estimators)** locally in TypeScript. The model scores 8-11 residue peptide
and HLA class I allele pairs using one-hot peptide features plus a 39-residue
allele pseudo-sequence. It is trained on 120,000 MHCflurry-curated public
binding-affinity measurements across 129 supported HLA-A, -B, and -C alleles.

The browser bundle contains the model artifact and allele table; it does not
contact a model-serving backend. Unsupported alleles are rejected before
scoring, because an absent pseudo-sequence would otherwise create an invalid,
peptide-only feature vector.

## How to interpret output

The displayed score is the production model's raw sigmoid output for the
training target IC50 < 500 nM. It is useful for ranking within the supported
scope, but it is not calibrated as a probability and must not be used for
clinical or diagnostic decisions.

The held-out peptide-grouped evaluation reports ROC-AUC 0.9188 and PR-AUC
0.8085. The stricter 14-allele leave-one-allele-out study reports macro ROC-AUC
0.842. These numbers, calibration evidence, asset provenance, and limitations
are all specified in the [model card](MODEL-CARD.md).

## Historical context

Earlier project revisions contained retired demonstration scoring and model
labels that are not part of the current product. They are documented only as
history in [CHANGE-RECORD-2026-08-26.md](CHANGE-RECORD-2026-08-26.md), not as
current methodology.
