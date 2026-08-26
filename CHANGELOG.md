# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-08-26

### Added
- **A real trained model is now served.** XGBoost (800 trees) over a one-hot peptide
  and the MHC allele pseudo-sequence, trained on 120,000 MHCflurry-curated affinity
  measurements across 129 HLA-A/B/C alleles. Single held-out evaluation on a
  peptide-grouped split: **ROC-AUC 0.9185, PR-AUC 0.8056**.
- Inference runs **client-side**. `shared/pmhc-predictor.ts` reimplements XGBoost
  tree traversal in TypeScript; `scripts/verify-parity.mjs` + `scripts/verify_parity.py`
  check it against the original Python model (max difference **7.0e-08** over 516
  pairs spanning all 129 alleles; 0.077 ms per prediction).
- The allele picker now lists all 129 trained alleles with their training-row counts,
  and the app refuses to score an allele the model never saw.

### Changed
- The allele selection is now **fed to the model**. Previously the UI collected an
  allele and discarded it. Control: `GILGFVFTL` scores 0.906 on HLA-A*02:01 and
  0.194 on HLA-B*07:02.
- Default example peptide is now `GILGFVFTL` (influenza M1, HLA-A*02:01) instead of
  `SIINFEKL`, which is a mouse H-2Kb epitope and a poor default for an HLA-only model.
- Peptide input is restricted to 8-11 residues, the range the model was trained on.
- Charts on the Visualize page are computed from predictions actually made in the
  browser, replacing hard-coded sample distributions.

### Removed
- **The ESM-2 150M + LoRA result (ROC-AUC 0.922 / PR-AUC 0.827) has been retracted.**
  It was cited in BENCHMARKS.md, CITATION.cff, the docs, and two UI components, but
  no model file or metrics artifact backing it could be found on any machine. The
  only ESM artifact that exists is an 8M-parameter smoke test scoring 0.590. Do not
  reinstate this number without a metrics file.
- The five placeholder architecture slots (CNN, BiLSTM, Transformer, two hybrids).
  They all called one function; they are gone rather than renamed.
- The deterministic placeholder scorer, now that a real model backs predictions.

### Retained from the previous correction
- The 1.0.0 claims below — five trained architectures, 94.2% accuracy, AUC 0.941 —
  were fabricated. No training run produced them. This record stays as history.

## [1.0.0] - 2025-01-05

### Added
- Core prediction engine with five ML model architectures (CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM Best, Transformer)
- Single peptide-MHC binding prediction with confidence scoring and strength classification
- Batch processing system with CSV upload, progress tracking, and results export
- Mutation impact analysis for evaluating single amino acid substitutions
- Peptide designer module for generating candidate sequences
- Interactive visualizations: model comparison charts, prediction distributions, sequence length statistics
- System status dashboard with real-time model loading state and service health monitoring
- REST API with 15+ endpoints for prediction, analysis, batch processing, and project management
- Project workspace management for organizing research sessions
- Database integration hub with access to IEDB, UniProt, and PDB
- Google Drive integration for model weight storage and retrieval
- Full-stack TypeScript implementation with React 18 frontend and Express.js backend
- Drizzle ORM schema definitions for PostgreSQL (with in-memory storage fallback)
- Comprehensive documentation: README, API reference, architecture guide, model methodology

### Technical Details
- Frontend: React 18, Vite, TanStack Query v5, Wouter, shadcn/ui, Recharts
- Backend: Express.js, Zod validation, Drizzle ORM schema
- Model accuracy: up to 94.2% (CNN+BiLSTM Best, AUC 0.941)
- API response time: 80-300ms per prediction (model dependent)
- Production deployment with health checks and graceful shutdown

## [0.1.0] - 2024-12-15

### Added
- Initial project scaffolding and architecture design
- Database schema design with Drizzle ORM
- Core API endpoint structure
- Frontend component library setup with shadcn/ui
- Model integration framework and weight loading pipeline
