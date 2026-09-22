# What was tried, what won, what is still unknown

The model that ships here is gradient-boosted trees on one-hot features. That is
a deliberately unfashionable answer, and it was chosen after training the
fashionable ones on the same split and measuring them. This file is that record.

Every number comes from a file in the training repository. The study scripts are
named throughout so each claim can be traced to the thing that produced it.

---

## The problem this started with

An earlier version of this app returned predictions from **`Math.random`**. The
interface looked finished and the number on screen meant nothing. Everything
below exists because of that: the model is real, the evaluation is real, and the
places it is weak are written down.

## Fifteen approaches, one split

Every arm below saw the **identical** peptide-grouped split —
`GroupShuffleSplit(test_size=0.2, random_state=42)`, grouped by peptide, so no
peptide appears in both train and test. 120,000 MHCflurry-curated affinity
measurements across 129 HLA alleles; label is IC50 < 500 nM.

| Arm | ROC-AUC | PR-AUC | Train (s) |
|---|---:|---:|---:|
| **XGBoost, one-hot (shipped)** | **0.9188** | **0.8085** | — |
| blosum62 / random forest | 0.9168 | 0.8071 | 23.2 |
| onehot / random forest | 0.9078 | 0.7844 | 29.2 |
| blosum62 / CNN | 0.9052 | 0.7809 | 26.2 |
| onehot / Transformer | 0.9040 | 0.7865 | 54.6 |
| blosum62 / Transformer | 0.9036 | 0.7728 | 54.6 |
| blosum62 / CNN-BiLSTM | 0.9005 | 0.7712 | 36.4 |
| blosum62 / BiLSTM | 0.9001 | 0.7756 | 33.0 |
| onehot / CNN | 0.8784 | 0.7310 | 26.6 |
| onehot / CNN-BiLSTM | 0.8744 | 0.7247 | 36.4 |
| onehot / BiLSTM | 0.8596 | 0.7009 | 33.0 |
| onehot / logistic regression | 0.7418 | 0.5350 | 13.0 |
| blosum62 / logistic regression | 0.7415 | 0.5336 | 31.7 |
| blosum62 / SVM | 0.7344 | 0.5225 | 95.9 |
| onehot / SVM | 0.7334 | 0.5243 | 0.9 |

Source: `pmhc_architecture_comparison.json`, `train_architectures.py`. Trained on
an RTX 3060, torch 2.5.1+cu121.

**No neural architecture beat the boosted trees.** The best of them,
`blosum62/cnn` at 0.9052, lands 1.4 points below, and the runner-up overall is a
random forest. This is the whole reason the shipped model is the one it is.

## Does a protein language model help?

Worth asking separately, because "use embeddings" is the reflexive answer. Frozen
**ESM-2** was tested against **BLOSUM62** through an *identical* CNN-BiLSTM head —
same optimizer, epochs, batch size, scorer, and the same split every run, with
seeds varying only initialisation and batch order.

| Encoding | ROC-AUC (3 seeds) | Head parameters |
|---|---:|---:|
| BLOSUM62 | 0.9056 ± 0.0021 | 66,305 |
| Frozen ESM-2 | 0.9020 ± 0.0050 | 242,945 |

> indistinguishable — the gap between arm means is within the seed-to-seed
> spread of at least one arm, so neither encoding can be called better on this
> evidence

A substitution matrix published in **1992** matched a pretrained protein language
model on this task, using a quarter of the head parameters.

What *did* matter was not the representation but how it was consumed:
**mean-pooling the same embeddings drops to 0.8548.** Keeping the per-residue
axis was worth more than the pretraining. Source: `pmhc_esm_vs_blosum.json`,
`train_esm_cnn_bilstm.py`.

## How hard is the split?

A single held-out number invites the reader to assume the easiest possible
evaluation. The ladder makes the choice explicit:

| Split | ROC-AUC |
|---|---:|
| Random | 0.9270 |
| **Peptide-grouped (reported)** | **0.9188** |
| Sequence-cluster | 0.9144 |
| Leave-one-allele-out (macro, 14 alleles) | 0.8419 |

The random split is the flattering one and it is named here as leaky rather than
quoted as the headline. Against an allele the model has never seen, performance
falls to 0.8419 macro — which is the number that matters if you bring a rare
allele. Source: `split_ladder_study.py`, `pmhc_metrics_split_ladder.json`.

## What is still unknown

- Three fixed-split seeds do not establish general performance across splits, nor
  statistical equivalence between encodings. They bound seed variance, nothing more.
- The pooled-versus-per-residue comparison changed the head as well as the pooling,
  so pooling is not cleanly isolated as the cause.
- No full-data production fit, no exhaustive leave-one-allele-out, no joint
  unseen-peptide *and* unseen-allele evaluation, and no prospective test.
- Alleles are unevenly supported: HLA-A\*02:01 has 14,387 measurements, the long
  tail a few hundred. The app shows the count for whichever allele is selected.
- Only quantitative affinity measurements were used. Mass-spectrometry ligand
  data, which modern predictors lean on, was excluded.
- The 500 nM threshold is conventional and arbitrary.
- Production provenance records a dirty working tree (`4e6027e872b2-dirty`).
- The serving format changed from the planned ONNX/TorchScript route to compact
  JSON trees traversed in TypeScript. No reason for that switch was recorded at
  the time.

## Scope

Binding classification is not immunogenicity, not antigen processing or
presentation, and not a clinical or diagnostic tool. Published predictors trained
on more data with allele-aware architectures report higher figures; this is a
solid baseline, not state of the art, and says so.
