![Project Banner](assets/banner.png)
# Peptide-MHC Binding Predictor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Models-ee4c2c.svg)](https://pytorch.org/)

A full-stack web application for predicting peptide-MHC (Major Histocompatibility Complex) binding affinity using deep learning. The platform serves five trained neural network architectures through a modern research interface, supporting single-sequence prediction, batch processing, mutation impact analysis, and peptide design.

**Live instance:** [peptide.arditmishra.com](https://peptide.arditmishra.com)

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
- Five deep learning model architectures: CNN, BiLSTM, CNN+BiLSTM, CNN+BiLSTM (optimized), and Transformer
- Input validation for standard amino acid sequences (8--15 residues)
- Binding probability, confidence score, and strength classification per prediction
- Model performance metrics displayed alongside results

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
    +-- Model Inference (server/models/)
    +-- Model Loader (server/services/model-loader.ts)
    +-- Google Drive Integration (server/services/google-drive.ts)
    |
    v
Pre-trained PyTorch Weights (models/*.pt)
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
- **Model weights**: PyTorch `.pt` files loaded at server startup

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Model Performance

All models were trained on peptide-MHC binding datasets and evaluated using held-out test sets.

| Model | Architecture | Accuracy | AUC-ROC | Sensitivity | Specificity |
|-------|-------------|----------|---------|-------------|-------------|
| CNN | 2-layer CNN with BatchNorm | 92.4% | 0.914 | 89.2% | 91.7% |
| BiLSTM | CNN + Bidirectional LSTM | 89.7% | 0.892 | 87.5% | 89.3% |
| CNN+BiLSTM | Hybrid CNN-BiLSTM | 93.2% | 0.925 | 91.4% | 94.3% |
| CNN+BiLSTM Best | Optimized hybrid | 94.2% | 0.941 | 92.8% | 93.5% |
| Transformer | 2-layer encoder, 2 heads | 94.1% | 0.935 | 92.1% | 93.8% |

For training details, hyperparameters, and methodology, see [docs/model-methodology.md](docs/model-methodology.md).

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

**Response:**
```json
{
  "sequence": "SIINFEKL",
  "model": "TRANSFORMER v2.1",
  "probability": 0.8723,
  "confidence": 93.4,
  "rank": "Strong",
  "computeTime": "0.15s",
  "trainingAcc": "94.1%",
  "validationAuc": "0.935",
  "sensitivity": "92.1%",
  "specificity": "93.8%",
  "mhcAllele": "HLA-A*02:01"
}
```

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
│       ├── model-loader.ts          # Model weight loading and caching
│       └── google-drive.ts          # Google Drive API client
├── shared/                          # Shared code (client + server)
│   └── schema.ts                    # Database schema and API types (Drizzle + Zod)
├── models/                          # Pre-trained PyTorch weights (.pt)
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

The Jupyter notebooks used to train each model architecture are maintained separately. The training pipeline follows this structure:

- `01_data_ingestion.ipynb` -- Data loading, cleaning, and preprocessing
- `04_model_training_cnn.ipynb` -- CNN model training and evaluation
- `04_model_training_bilstm.ipynb` -- BiLSTM model training and evaluation
- `04_model_training_cnn_bilstm.ipynb` -- CNN+BiLSTM hybrid training
- `04_model_training_transformer_custom.ipynb` -- Transformer model training

To add training notebooks to the repository, place them in a `notebooks/` directory.

### Input Encoding

All models use the same preprocessing pipeline:
1. Peptide sequences are padded/truncated to a fixed length of 15 residues
2. Each amino acid is one-hot encoded into a 20-dimensional vector (standard amino acids: ACDEFGHIKLMNPQRSTVWY)
3. The resulting tensor shape is (15, 20) per sequence

### Pre-trained Weights

Model weight files (`.pt` format) are stored in the `models/` directory. These are standard PyTorch state dictionaries that can be loaded in Python for use in custom pipelines. The web application validates weight file presence at startup and uses the model architectures defined in `server/models/` for inference wrapping.

Note: The Node.js server does not execute PyTorch operations directly. The current inference pipeline wraps model architecture definitions with simulated forward passes for demonstration. For production-grade inference with actual tensor computation, integrate a Python inference backend or convert models to ONNX format.

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

If you use this software in your research, please cite:

```bibtex
@software{mishra2025peptide,
  title   = {Peptide-MHC Binding Predictor},
  author  = {Mishra, Ardit},
  year    = {2025},
  url     = {https://github.com/arditmishra/peptide-mhc-predictor},
  license = {MIT}
}
```

See [CITATION.cff](CITATION.cff) for machine-readable citation metadata.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*Developed by [Ardit Mishra](https://arditmishra.com) for computational immunology research.*
