# System Architecture

This document describes the technical architecture of the Peptide-MHC Binding Predictor, covering the frontend, backend, data flow, and deployment configuration.

## Overview

The application follows a monolithic full-stack architecture where a single Node.js process serves both the REST API and the client-side application. In development, Vite provides hot module replacement; in production, pre-built static assets are served directly by Express.

```
                    +---------------------+
                    |    Client Browser    |
                    +----------+----------+
                               |
                         HTTP / JSON
                               |
                    +----------v----------+
                    |    Express Server    |
                    |    (port 5000)       |
                    +----------+----------+
                               |
              +----------------+----------------+
              |                |                |
     +--------v------+  +-----v------+  +------v--------+
     |  REST API     |  |  Static    |  |  Vite Dev     |
     |  /api/*       |  |  Assets    |  |  Server (dev) |
     +--------+------+  +------------+  +---------------+
              |
     +--------v------+
     |  Storage      |
     |  Interface    |
     +--------+------+
              |
     +--------v------+
     |  Model        |
     |  Inference    |
     +---------------+
```

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 18 | Component-based rendering |
| Language | TypeScript | Type safety |
| Build Tool | Vite | Development server, production bundling |
| State | TanStack Query v5 | Server state caching, mutation management |
| Routing | Wouter | Lightweight client-side routing |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS with accessible components |
| Forms | React Hook Form + Zod | Validated form state management |
| Charts | Recharts | Data visualization |

### Component Organization

Components are organized by feature rather than by type:

- `components/prediction-form.tsx` -- Sequence input form with model selection
- `components/prediction-results.tsx` -- Prediction output display
- `components/model-performance.tsx` -- Model metrics comparison
- `components/model-selector.tsx` -- Model architecture selector
- `components/system-status.tsx` -- Health and status indicators
- `components/navigation.tsx` -- Application navigation
- `components/recent-activity.tsx` -- Activity feed
- `components/ui/` -- Generic shadcn/ui components (Button, Card, Dialog, etc.)

### Page Structure

Each page corresponds to a route registered in `App.tsx`:

| Route | Page | Description |
|-------|------|-------------|
| `/` | `home.tsx` | Dashboard with status, model metrics, and quick prediction |
| `/batch` | `batch.tsx` | Batch sequence processing |
| `/analysis` | `analysis.tsx` | Mutation impact analysis |
| `/design` | `design.tsx` | Peptide sequence designer |
| `/visualize` | `visualize.tsx` | Interactive data visualizations |
| `/databases` | `databases.tsx` | Scientific database browser |
| `/literature` | `literature.tsx` | Literature and research tools |
| `/projects` | `projects.tsx` | Project workspace management |
| `/settings` | `settings.tsx` | Application settings |

### Data Fetching

All server communication uses TanStack Query with a default fetch-based query function. Queries are keyed by API path for automatic cache invalidation:

```typescript
// Queries use the default fetcher (no queryFn needed)
const { data } = useQuery({ queryKey: ['/api/system-status'] });

// Mutations use apiRequest and invalidate relevant caches
const mutation = useMutation({
  mutationFn: (data) => apiRequest('POST', '/api/predict', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/predictions'] })
});
```

## Backend Architecture

### Server Initialization

The server startup sequence in `server/index.ts`:

1. Create Express application with JSON and URL-encoded body parsing
2. Register request logging middleware for `/api/*` routes
3. Register all API routes via `registerRoutes()`
4. Initialize model loading in the background (non-blocking)
5. Set up Vite dev server (development) or static file serving (production)
6. Bind to port 5000 on 0.0.0.0

### API Layer

Routes are defined in `server/routes.ts` and follow RESTful conventions:

- All API endpoints are prefixed with `/api/`
- Request bodies are validated using Zod schemas from `shared/schema.ts`
- Responses use consistent JSON formatting
- Error responses include structured error messages

### Storage Interface

The storage layer (`server/storage.ts`) defines an `IStorage` interface that abstracts all data operations. The current implementation uses in-memory storage (`MemStorage`), but the interface is designed for drop-in replacement with a database-backed implementation.

The schema is defined using Drizzle ORM in `shared/schema.ts`, providing:
- Type-safe table definitions
- Insert schemas via `drizzle-zod`
- Shared types between frontend and backend

### Model Inference Pipeline

```
Sequence Input (string)
    |
    v
Validation (Zod schema: 1-15 chars, standard amino acids)
    |
    v
Model Selection (cnn | bilstm | cnn_bilstm | cnn_bilstm_best | transformer)
    |
    v
Preprocessing (one-hot encoding: string -> [15 x 20] tensor)
    |
    v
Inference (model.predict() -> probability, confidence)
    |
    v
Post-processing (rank classification, metric aggregation)
    |
    v
Response (JSON with probability, confidence, rank, compute time, model metrics)
```

### Model Loading

The `ModelLoader` service manages model weight files:

1. On startup, checks for `.pt` files in the `models/` directory
2. If files exist locally, loads them directly
3. If files are missing and Google Drive credentials are configured, downloads from Drive
4. Models are cached in memory after first load
5. Loading status is tracked and exposed via the health check endpoint

## Data Model

### Core Tables (Drizzle Schema)

```
users
  id          VARCHAR (PK, UUID)
  username    TEXT (unique)
  password    TEXT

predictions
  id          VARCHAR (PK, UUID)
  sequence    TEXT
  model       TEXT
  probability REAL
  confidence  REAL
  mhcAllele   TEXT
  computeTime REAL
  createdAt   TIMESTAMP

systemStatus
  id                    VARCHAR (PK, UUID)
  googleDriveConnected  BOOLEAN
  modelsLoaded          INTEGER
  datasetAccessible     BOOLEAN
  lastSync              TIMESTAMP
  cacheSize             INTEGER
  predictionsToday      INTEGER

projects
  id          VARCHAR (PK, UUID)
  name        TEXT
  description TEXT
  userId      VARCHAR
  isPublic    BOOLEAN
  createdAt   TIMESTAMP
  updatedAt   TIMESTAMP

batchJobs
  id                  VARCHAR (PK, UUID)
  projectId           VARCHAR
  name                TEXT
  status              TEXT (pending | running | completed | failed)
  totalSequences      INTEGER
  processedSequences  INTEGER
  models              TEXT[]
  results             JSONB
  createdAt           TIMESTAMP
  completedAt         TIMESTAMP
```

Additional tables support mutation analysis, peptide design suggestions, literature references, experimental validation data, and model performance tracking.

## Deployment

### Development Mode

```bash
npm run dev
```

- Vite dev server provides hot module replacement for React components
- TypeScript is compiled on-the-fly via `tsx`
- API requests and static assets are served on the same port (5000)

### Production Mode

```bash
npm run build  # Vite builds frontend; esbuild bundles server
npm start      # Runs bundled server from dist/
```

- Frontend is pre-built to `dist/public/` with hashed asset filenames
- Server is bundled to `dist/index.js` as a single ESM file
- Express serves static files from `dist/public/` with a catch-all fallback to `index.html` for client-side routing

### Health Checks

The `/api/health` endpoint reports:
- Server uptime and readiness state
- Model loading progress (count and percentage)
- Memory usage (RSS, heap, external)
- Service connectivity (Google Drive, database)

The server returns HTTP 200 when fully operational, 202 during initialization, and 503 when models are still loading.

### Graceful Shutdown

The server handles SIGTERM and SIGINT signals for clean shutdown:
- Active connections are allowed to complete (30-second timeout)
- Resources are released before process exit
- Uncaught exceptions and unhandled rejections trigger graceful shutdown
