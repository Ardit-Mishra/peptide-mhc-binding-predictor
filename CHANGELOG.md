# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
