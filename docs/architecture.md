# System Architecture

## Overview

Peptide-MHC is a static React/Vite application. It has no Express service,
database, server-side prediction endpoint, credential, or background worker.
All prediction and history behavior occurs in the user's browser.

```
Browser
  |
  +-- React UI and local request handlers
  |      |
  |      +-- asset loader
  |      |      +-- pmhc_alleles.json (129 pseudo-sequences and support counts)
  |      |      +-- pmhc_model.json (exported XGBoost trees)
  |      |
  |      +-- PeptideMHCPredictor (TypeScript tree traversal)
  |      +-- localStorage (local prediction history only)
  |
  +-- static host (serves files only)
```

## Runtime surfaces

| Surface | Location | Responsibility |
|---|---|---|
| UI shell and routes | `client/src/App.tsx` | React routing and research-use notice |
| Single prediction | `client/src/pages/home.tsx` | peptide/allele input and result presentation |
| Batch prediction | `client/src/pages/batch.tsx` | FASTA/CSV parsing and allele-preserving batch output |
| Mutation scan | `client/src/pages/mutation-scan.tsx` | in-silico single-residue comparisons |
| Local visualizations | `client/src/pages/visualize.tsx` | browser-local history and CSV export |
| Local API boundary | `client/src/lib/local-backend.ts` | validated in-browser request handling |
| Model loader | `client/src/lib/pmhc-model.ts` | lazy, cached loading of static model assets |
| Inference runtime | `shared/pmhc-predictor.ts` | encoding and compact tree traversal |

Routes are `/`, `/predict`, `/batch`, `/mutation-scan`, and `/visualize`. The
application may use TanStack Query for local request/cache ergonomics, but no
request in the prediction path reaches a remote API.

## Inference data flow

1. The UI validates an 8-11 residue peptide and a selected HLA allele.
2. The local request boundary loads the allele table and compact model JSON on
   demand. The 2.6 MB model is not fetched until first prediction.
3. `PeptideMHCPredictor` encodes the peptide (11 x 20) and allele
   pseudo-sequence (39 x 20) into 1,000 features.
4. The exported 800-tree XGBoost ensemble is traversed in TypeScript and its
   raw sigmoid output is returned with support metadata.
5. The result is displayed locally. Optional history is stored in browser
   `localStorage` and never sent to a service operated by this project.

An allele outside the shipped 129-allele support set is rejected. This avoids a
plausible-looking score produced with missing allele features.

## Static artifacts and provenance

| Artifact | Role |
|---|---|
| `client/public/models/pmhc_model.json` | exported tree ensemble consumed by the browser runtime |
| `client/public/models/pmhc_alleles.json` | supported allele pseudo-sequences and training-row counts |
| `scripts/fixtures/python-reference.json` | Python-booster reference scores for browser/Python parity testing |
| `scripts/fixtures/training-metrics/` | immutable metric snapshots with SHA-256 manifest |

The model loader caches successful asset loads as a promise and clears failed
loads so a transient asset failure can be retried. Test coverage pins the
browser fixture to the exact model and allele asset hashes.

## Build and deployment

`npm run build` produces `dist/public`. A static host only needs to serve that
directory and preserve the SPA fallback without rewriting `/models/` assets.
`vercel.json` captures the deployed static-host configuration.

There is intentionally no API deployment, database migration, secret
configuration, or server health endpoint. Release verification is a static
bundle and scientific-evidence gate; see [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).

## Security and privacy boundaries

- Predictions execute on-device; the project does not receive peptide inputs.
- No model or workflow secret is embedded in the bundle.
- Browser history is local and is exportable or removable by the user.
- The workbench has a research-only boundary and makes no clinical claim.
