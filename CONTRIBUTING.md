# Contributing to Peptide-MHC Binding Predictor

Thank you for your interest in contributing to this project. We welcome contributions from researchers, developers, and domain experts in computational biology and immunology.

## Ways to Contribute

### Scientific Contributions
- **Model improvements**: Enhance existing architectures or add new model types
- **Dataset integration**: Add support for additional immunological databases
- **Validation studies**: Provide experimental validation of predictions
- **Benchmark comparisons**: Compare against other peptide-MHC prediction tools

### Technical Contributions
- **Feature development**: New analysis tools, visualizations, or export formats
- **Performance optimization**: Improve prediction speed or reduce memory usage
- **Bug fixes**: Identify and resolve issues
- **Documentation**: Improve guides, API documentation, or inline comments

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Basic understanding of TypeScript
- Familiarity with immunology concepts (helpful but not required)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-fork/peptide-mhc-predictor.git
   cd peptide-mhc-predictor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Verify the application** is running at `http://localhost:5000`

## Development Guidelines

### Code Standards
- **TypeScript**: All code uses TypeScript with strict mode
- **Formatting**: Follow the existing code style in each file
- **Component patterns**: Follow established patterns in `client/src/components/`
- **API design**: RESTful endpoints with Zod validation on request bodies

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add support for HLA-B allele predictions
fix: correct one-hot encoding for non-standard residues
docs: update API reference with batch processing examples
refactor: simplify model loader caching logic
```

### Branch Naming

```
feature/add-new-model-architecture
fix/batch-processing-timeout
docs/update-training-methodology
```

## Submitting Changes

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Verify the application builds without errors: `npm run build`
4. Verify TypeScript compiles: `npm run check`
5. Open a pull request with:
   - A description of what the PR accomplishes
   - Any relevant context or motivation
   - Steps to test the changes

### Code Review

- All pull requests require at least one reviewer approval
- Changes to model architectures or training methodology require scientific review
- CI checks must pass before merging

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `client/src/components/` | Reusable UI components |
| `client/src/pages/` | Route-level page components |
| `server/models/` | ML model inference wrappers |
| `server/services/` | External service integrations |
| `server/routes.ts` | API endpoint definitions |
| `shared/schema.ts` | Shared types and validation schemas |
| `docs/` | Extended documentation |
| `models/` | Pre-trained model weights (.pt) |

## Reporting Issues

When filing an issue, please include:

- A clear description of the problem
- Steps to reproduce (if applicable)
- Expected vs actual behavior
- Environment details (OS, browser, Node.js version)
- Relevant error messages or screenshots

## Scientific Contribution Guidelines

### Model Development
- Include validation against benchmark datasets
- Document training methodology, hyperparameters, and performance metrics
- Provide scripts or notebooks for reproducibility
- Compare against existing models in the platform

### Dataset Integration
- Verify data usage complies with source licensing
- Validate data quality and format consistency
- Document the data source, structure, and any preprocessing steps

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).
