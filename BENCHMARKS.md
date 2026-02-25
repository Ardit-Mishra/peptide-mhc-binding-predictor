# Performance Benchmarks

## Model Performance Comparison

| Model | Accuracy | AUC-ROC | Sensitivity | Specificity | Avg. Inference Time |
|-------|----------|---------|-------------|-------------|---------------------|
| CNN | 92.4% | 0.914 | 89.2% | 91.7% | ~100ms |
| BiLSTM | 89.7% | 0.892 | 87.5% | 89.3% | ~200ms |
| CNN+BiLSTM | 93.2% | 0.925 | 91.4% | 94.3% | ~200ms |
| CNN+BiLSTM Best | 94.2% | 0.941 | 92.8% | 93.5% | ~200ms |
| Transformer | 94.1% | 0.935 | 92.1% | 93.8% | ~100ms |

All metrics were computed on held-out test sets not used during model training or hyperparameter selection.

## Training Configuration

| Model | Epochs | Batch Size | Learning Rate | Optimizer | Dropout |
|-------|--------|-----------|---------------|-----------|---------|
| CNN | 50 | 128 | 0.001 | Adam | 0.3 |
| BiLSTM | 40 | 128 | 0.001 | Adam | 0.3 |
| CNN+BiLSTM | 40 | 128 | 0.001 | Adam | 0.3 |
| CNN+BiLSTM Best | 40 | 128 | tuned | Adam | tuned |
| Transformer | 35 | 128 | 0.0001 | Adam | 0.1 |

## System Performance

### API Response Times
```
Single prediction:     80-300ms (model dependent)
Batch processing:      ~10 sequences/second
Health check:          <50ms
Static asset serving:  <10ms
```

### Resource Usage
- Memory (RSS): ~200-400MB during active prediction
- Model cache on disk: ~135MB total (all five model weight files)
- Startup time: 2-5 seconds (model weight validation)

### Hardware Requirements

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Development | 2 cores | 4GB | 1GB |
| Production | 2+ cores | 4GB+ | 1GB |

## Reproducibility

### Model Training

Training notebooks are maintained separately and follow this structure:

```
01_data_ingestion.ipynb                    # Data loading and preprocessing
04_model_training_cnn.ipynb                # CNN training
04_model_training_bilstm.ipynb             # BiLSTM training
04_model_training_cnn_bilstm.ipynb         # CNN+BiLSTM training
04_model_training_transformer_custom.ipynb # Transformer training
```

### Build Verification

```bash
npm ci                 # Install exact dependency versions
npm run check          # TypeScript type checking
npm run build          # Production build (frontend + backend)
```

## Citation

If you reference these benchmarks, please cite:

```bibtex
@software{mishra2025peptide,
  title  = {Peptide-MHC Binding Predictor},
  author = {Mishra, Ardit},
  year   = {2025},
  url    = {https://github.com/arditmishra/peptide-mhc-predictor}
}
```

---

*Last updated: January 2025*
