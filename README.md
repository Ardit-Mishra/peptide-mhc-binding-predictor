# Peptide-MHC Binding Predictor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Demo](https://img.shields.io/badge/Predictions-Illustrative_Demo-orange.svg)](#model-performance)

A full-stack web application demonstrating a research interface for peptide-MHC (Major Histocompatibility Complex) binding prediction, supporting single-sequence prediction, batch processing, mutation impact analysis, and peptide design.

**Live instance:** [peptide.arditmishra.com](https://peptide.arditmishra.com)

> **This is a demonstration application. Live predictions are illustrative placeholder outputs, not
> the output of a trained model.** The UI exposes five prediction profiles (CNN, BiLSTM,
> CNN+BiLSTM, CNN+BiLSTM Best, Transformer) corresponding to different model archetypes, but none of
> them is currently backed by trained weights -- scores are generated with `Math.random()` behind an
> artificial delay. A real model has been trained **offline**, separately from this app (XGBoost
> baseline: held-out ROC-AUC 0.919; ESM-2 150M + LoRA: held-out ROC-AUC 0.922 / PR-AUC 0.827, on a
> leak-free peptide-grouped split of MHCflurry curated data). Integrating that model into this
> running service is a separate, in-progress effort -- see [BENCHMARKS.md](BENCHMARKS.md) for
> details.

---

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [Architecture](#architecture)
- [Model Performance](#model-performance)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Reproducibility](#reproducibility)
- [Contributing](#contributing)
- [Citation](#citation)
- [License](#license)

---

## Motivation

Peptide-MHC binding is a critical step in adaptive immunity. Accurate computational prediction of binding affinity accelerates research in:

- **Cancer immunotherapy** -- neoantigen identification and personalized vaccine design
- **Vaccine development** -- epitope selection and population coverage optimization
- **Autoimmune disease research** -- self-antigen characterization

This tool provides researchers with an accessible interface to run predictions without requiring local ML infrastructure, while maintaining transparency about model architectures and training methodology.

## Features

### Prediction Engine
- A demonstration interface with five illustrative prediction profiles corresponding to different
  model archetypes -- CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM (optimized), and Transformer -- none of
  which is currently backed by trained weights. Real model integration (XGBoost / ESM-2+LoRA, held-out
  ROC-AUC 0.919 / 0.922) is in progress separately; see [BENCHMARKS.md](BENCHMARKS.md).
- Input validation for standard amino acid sequences (8--15 residues)
- Binding probability, confidence score, and strength classification per prediction (illustrative,
  not model output)

### Batch Processing
- Upload multiple sequences for parallel prediction across selected models
- Progress tracking with real-time status updates
- Results export in structured format

### Analysis Tools
- **Mutation impact analysis**: Evaluate how single amino acid substitutions affect binding probability
- **Peptide designer**: Generate candidate sequences optimized for target MHC alleles
- **Cross-model comparison**: Run identical sequences through multiple architectures

### Research Interface
- System status dashboard with model loading state and service health
- Interactive visualizations for model comparison and prediction distributions
- Project workspace organization for managing research sessions

## Architecture
### Optional Cloud Storage Integration

The platform supports optional Google Drive integration for dataset persistence and model artifact storage.

⚠️ This feature requires user-provided Google Cloud credentials.
No credentials are included in this repository.

To enable:
1. Create a Google Cloud project
2. Enable Drive API
3. Generate service account credentials
4. Add them to your local `.env` file

### System Overview

```
Client (React 18 + TypeScript)
    |
    | HTTP/JSON
    v
Server (Express.js + TypeScript)
    |
    +-- REST API (routes.ts)
    +-- Storage Layer (storage.ts, in-memory)
    +-- Model Inference (server/models/, Math.random()-based, illustrative only)
    +-- Model Loader (server/services/model-loader.ts, checks file presence only)
    +-- Google Drive Integration (server/services/google-drive.ts)
    |
    v
.pt files present on disk (models/*.pt) -- not loaded into an inference engine
```

### Frontend
- **Framework**: React 18 with TypeScript
- **Build tool**: Vite
- **State management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **UI components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Form handling**: React Hook Form with Zod validation
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js with TypeScript (tsx)
- **Framework**: Express.js
- **Validation**: Zod schemas shared between client and server
- **ORM**: Drizzle ORM (PostgreSQL schema definitions)
- **Storage**: In-memory with interface abstraction for database migration
- **Model weights**: PyTorch `.pt` files present in `models/`; the server checks for their existence at startup but does not load or read them -- they are not used for inference

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Model Performance

The five architectures named in the UI were never trained -- there is no leaderboard to report for
this running app. The only real numbers associated with this project come from a model trained
**offline**, separately, and not yet wired into this service:

| Model | ROC-AUC (held-out) | PR-AUC (held-out) |
|-------|---------------------|--------------------|
| XGBoost baseline | 0.919 | -- |
| ESM-2 150M + LoRA | 0.922 | 0.827 |

Evaluated on a leak-free peptide-grouped split (test-set peptides never appear in training) of
MHCflurry curated data, with allele pseudo-sequence conditioning. These are offline held-out
evaluation numbers of a model currently being integrated -- not the output of the live app. See
[BENCHMARKS.md](BENCHMARKS.md).

## Installation

### Prerequisites
- Node.js 20+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/arditmishra/peptide-mhc-predictor.git
cd peptide-mhc-predictor

# Install dependencies
npm install

# Configure environment (optional -- see .env.example)
cp .env.example .env

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | PostgreSQL connection string (uses in-memory storage if not set) |
| `GOOGLE_CREDENTIALS` | No | Google service account JSON for model file management |
| `SESSION_SECRET` | No | Secret key for session management |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `PORT` | No | Server port (default: `5000`) |

See [.env.example](.env.example) for the full list.

### Production Build

```bash
# Build frontend and bundle server
npm run build

# Start production server
npm start
```

## Usage

### Single Prediction

1. Navigate to the prediction page
2. Enter a peptide sequence (8--15 standard amino acid characters)
3. Select a model architecture
4. Optionally specify an MHC allele (defaults to HLA-A*02:01)
5. Submit to receive binding probability, confidence, and strength classification

### Batch Processing

1. Navigate to the Batch Processing page
2. Create a project workspace
3. Upload a list of sequences
4. Select one or more models
5. Monitor progress and download results

### Mutation Analysis

1. Navigate to the Analysis page
2. Enter a reference peptide sequence
3. Specify the position and replacement amino acid
4. Select a model for comparison
5. Review the predicted impact on binding affinity

## API Reference

### Health Check
```
GET /api/health
```
Returns server status, model loading progress, memory usage, and deployment readiness.

### Single Prediction
```
POST /api/predict
Content-Type: application/json

{
  "sequence": "SIINFEKL",
  "model": "transformer",
  "mhcAllele": "HLA-A*02:01"
}
```

**Response (actual current shape):**
```json
{
  "sequence": "SIINFEKL",
  "model": "Illustrative Demo Scorer (Transformer slot — no trained model)",
  "probability": 0.8723,
  "confidence": 65.0,
  "rank": "Strong",
  "computeTime": "0.00s",
  "trainingAcc": "N/A (illustrative demo — no trained model)",
  "validationAuc": "N/A (offline eval of a separate model being integrated: XGBoost ROC-AUC 0.919 / ESM-2+LoRA ROC-AUC 0.922 — not this app's output)",
  "sensitivity": "N/A (illustrative demo — no trained model)",
  "specificity": "N/A (illustrative demo — no trained model)",
  "mhcAllele": "HLA-A*02:01"
}
```

`probability` and `confidence` come from the deterministic illustrative scorer
(`server/lib/illustrative-scorer.ts`) -- a function of sequence chemistry, not a trained model's
output. `trainingAcc`, `validationAuc`, `sensitivity`, and `specificity` are honest `"N/A"`
placeholder strings, not hardcoded per-model numbers -- no trained model exists to report these
for. Do not treat this response shape as evidence of model performance.

### Batch Processing
```
POST /api/batch/create
Content-Type: application/json

{
  "projectId": "project-id",
  "name": "Batch run 1",
  "models": ["cnn", "transformer"],
  "sequences": ["SIINFEKL", "GILGFVFTL", "NLVPMVATV"]
}
```

### Mutation Analysis
```
POST /api/analysis/mutation
Content-Type: application/json

{
  "sequence": "SIINFEKL",
  "position": 3,
  "newAminoAcid": "A",
  "model": "cnn"
}
```

### Additional Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/system-status` | Current system and model status |
| `GET` | `/api/models/performance` | Performance metrics for all models |
| `GET` | `/api/recent-activity` | Recent prediction activity |
| `GET` | `/api/batch/jobs` | List batch processing jobs |
| `GET` | `/api/projects` | List research projects |
| `POST` | `/api/projects` | Create a new project |
| `POST` | `/api/design/generate` | Generate optimized peptide candidates |
| `GET` | `/api/databases` | Available scientific databases |

## Project Structure

```
peptide-mhc-predictor/
├── client/                          # React frontend
│   ├── index.html                   # Entry HTML
│   └── src/
│       ├── App.tsx                  # Router and layout
│       ├── main.tsx                 # React entry point
│       ├── index.css                # Global styles (Tailwind)
│       ├── components/              # Reusable UI components
│       │   ├── prediction-form.tsx  # Sequence input and model selection
│       │   ├── prediction-results.tsx
│       │   ├── model-performance.tsx
│       │   ├── model-selector.tsx
│       │   ├── system-status.tsx
│       │   ├── navigation.tsx
│       │   ├── recent-activity.tsx
│       │   └── ui/                  # shadcn/ui components
│       ├── hooks/                   # Custom React hooks
│       ├── lib/                     # Utilities and API client
│       └── pages/                   # Route pages
│           ├── home.tsx             # Dashboard
│           ├── batch.tsx            # Batch processing
│           ├── analysis.tsx         # Mutation analysis
│           ├── design.tsx           # Peptide designer
│           ├── visualize.tsx        # Data visualization
│           ├── databases.tsx        # Database browser
│           ├── literature.tsx       # Literature tools
│           ├── projects.tsx         # Project management
│           └── settings.tsx         # Application settings
├── server/                          # Express backend
│   ├── index.ts                     # Server entry point
│   ├── routes.ts                    # API route definitions
│   ├── storage.ts                   # Data storage interface
│   ├── vite.ts                      # Vite dev server integration
│   ├── db.ts                        # Database connection
│   ├── models/                      # ML model wrappers
│   │   ├── cnn.ts                   # CNN classifier
│   │   ├── bilstm.ts               # CNN+BiLSTM classifier
│   │   └── transformer.ts          # Transformer classifier
│   └── services/                    # External service integrations
│       ├── model-loader.ts          # Checks .pt file presence at startup only (no loading)
│       └── google-drive.ts          # Google Drive API client
├── shared/                          # Shared code (client + server)
│   └── schema.ts                    # Database schema and API types (Drizzle + Zod)
├── models/                          # .pt files present on disk; not loaded for inference (see BENCHMARKS.md)
├── docs/                            # Extended documentation
│   ├── architecture.md              # System architecture details
│   └── model-methodology.md         # Training methodology and evaluation
├── .env.example                     # Environment variable template
├── BENCHMARKS.md                    # Performance benchmarks
├── CHANGELOG.md                     # Version history
├── CITATION.cff                     # Citation metadata
├── CONTRIBUTING.md                  # Contribution guidelines
├── LICENSE                          # MIT License
└── package.json                     # Dependencies and scripts
```

## Reproducibility

### Model Training

The CNN, BiLSTM, CNN+BiLSTM, and Transformer architectures referenced in the UI were never trained
-- no notebooks for them exist in or alongside this repository, and any prior claim that they did
was inaccurate.

A real allele-conditioned model (XGBoost baseline and ESM-2 150M + LoRA) has been trained **offline**
in a separate repository (`../ml-training/peptide-mhc`), using MHCflurry curated data with a
leak-free peptide-grouped split. See [BENCHMARKS.md](BENCHMARKS.md) for the held-out results.
Integrating that model into this app is a separate, in-progress effort.

### Input Encoding

All models use the same preprocessing pipeline:
1. Peptide sequences are padded/truncated to a fixed length of 15 residues
2. Each amino acid is one-hot encoded into a 20-dimensional vector (standard amino acids: ACDEFGHIKLMNPQRSTVWY)
3. The resulting tensor shape is (15, 20) per sequence

### Pre-trained Weights

Files with a `.pt` extension are present in the `models/` directory, but they are **prop files, not
active model weights** -- the server only checks that they exist at startup; it never loads, reads,
or executes them. `server/models/*.ts` produce prediction scores using `Math.random()` behind an
artificial delay, entirely independent of anything in `models/`.

Note: The Node.js server does not execute PyTorch operations at all, and the current inference
pipeline does not wrap any real, trained model -- it is a demonstration path only. Serving the real
offline-trained model (see [BENCHMARKS.md](BENCHMARKS.md)) will require a genuine Python inference
backend or an ONNX export, and is tracked as a separate effort.

### Environment Reproduction

```bash
# Exact dependency versions are locked in package-lock.json
npm ci

# Verify TypeScript compilation
npm run check

# Run production build
npm run build
```

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up the development environment
- Code standards and commit conventions
- Submitting pull requests
- Reporting issues

## Citation

This repository is a demonstration application -- it does not ship a validated ML system, and its
live predictions should not be cited as research results. If you reference it, please cite it as
such:

```bibtex
@software{mishra2025peptide,
  title   = {Peptide-MHC Binding Predictor (Demonstration UI)},
  author  = {Mishra, Ardit},
  year    = {2025},
  url     = {https://github.com/arditmishra/peptide-mhc-predictor},
  license = {MIT},
  note    = {Demonstration interface with illustrative predictions; no trained model is
             currently served. A real offline-trained model (XGBoost / ESM-2+LoRA, held-out
             ROC-AUC 0.919 / 0.922) is being integrated separately.}
}
```

See [CITATION.cff](CITATION.cff) for machine-readable citation metadata.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*Developed by [Ardit Mishra](https://arditmishra.com) for computational immunology research.*
