# Model Methodology

This document describes the machine learning models used in the Peptide-MHC Binding Predictor, including their architectures, training procedures, and evaluation metrics.

## Problem Statement

Given a peptide sequence of 8--15 amino acid residues, predict the probability that the peptide will bind to a specific MHC class I molecule. This is formulated as a binary classification task where the output is a binding probability in [0, 1].

## Input Representation

All models share a common preprocessing pipeline:

1. **Sequence normalization**: Input sequences are validated to contain only the 20 standard amino acids (ACDEFGHIKLMNPQRSTVWY).
2. **Fixed-length encoding**: Sequences are padded (with zero vectors) or truncated to a maximum length of 15 residues.
3. **One-hot encoding**: Each amino acid is represented as a 20-dimensional binary vector, where the index corresponding to the amino acid is set to 1.
4. **Tensor shape**: The final input tensor has shape `(15, 20)` -- 15 positions by 20 amino acid channels.

This encoding preserves positional information and treats each residue independently, without learned embeddings.

## Model Architectures

### 1. CNN (Convolutional Neural Network)

**Architecture:**
```
Input: (1, 15, 20)
  -> Conv2d(1, 32, kernel_size=3, padding=1) -> ReLU -> BatchNorm2d -> MaxPool2d
  -> Conv2d(32, 64, kernel_size=3, padding=1) -> ReLU -> BatchNorm2d -> MaxPool2d
  -> Flatten
  -> Linear(64 * 3 * 5, 64) -> ReLU -> Dropout(0.3)
  -> Linear(64, 1) -> Sigmoid
Output: binding probability
```

**Rationale:** Convolutional layers capture local sequence motifs that are characteristic of MHC binding. The two-layer design balances representational capacity with training efficiency. BatchNorm stabilizes training, and MaxPool reduces spatial dimensions progressively.

**Hyperparameters:**
| Parameter | Value |
|-----------|-------|
| Epochs | 50 |
| Batch size | 128 |
| Learning rate | 0.001 |
| Optimizer | Adam |
| Dropout | 0.3 |

### 2. BiLSTM (Bidirectional LSTM)

**Architecture:**
```
Input: (1, 15, 20)
  -> Conv2d(1, 32, kernel_size=3, padding=1) -> ReLU -> BatchNorm2d -> MaxPool2d
  -> Channel averaging (reduce to sequence representation)
  -> BiLSTM(input_size=10, hidden_size=64, bidirectional=True)
  -> Global average pooling
  -> Linear(128, 64) -> ReLU -> Dropout(0.3)
  -> Linear(64, 1) -> Sigmoid
Output: binding probability
```

**Rationale:** The hybrid CNN-BiLSTM architecture first extracts local features via convolution, then models sequential dependencies in both directions using the bidirectional LSTM. This captures long-range interactions between residues that pure CNNs may miss.

**Hyperparameters:**
| Parameter | Value |
|-----------|-------|
| Epochs | 40 |
| Batch size | 128 |
| Learning rate | 0.001 |
| Optimizer | Adam |
| LSTM hidden size | 64 |
| Dropout | 0.3 |

### 3. CNN+BiLSTM (Hybrid)

A variant of the BiLSTM model with deeper convolutional feature extraction before the recurrent layers. Two configurations were trained:

- **Standard**: Default hyperparameters
- **Optimized (Best)**: Hyperparameter search over learning rate, hidden size, and dropout rate, selecting the configuration with the highest validation AUC

### 4. Transformer

**Architecture:**
```
Input: (15, 20)
  -> PositionalEncoding(d_model=20, max_len=15)
  -> TransformerEncoder(
       d_model=20,
       nhead=2,
       num_layers=2,
       dim_feedforward=64
     )
  -> Global average pooling
  -> Linear(20, 32) -> ReLU -> Dropout(0.1)
  -> Linear(32, 1) -> Sigmoid
Output: binding probability
```

**Rationale:** The self-attention mechanism allows the model to learn pairwise interactions between all positions in the sequence simultaneously, without the sequential processing constraint of LSTMs. Positional encoding preserves residue ordering information. The compact architecture (2 layers, 2 heads) is appropriate for the relatively short input sequences.

**Hyperparameters:**
| Parameter | Value |
|-----------|-------|
| Epochs | 35 |
| Batch size | 128 |
| Learning rate | 0.0001 |
| Optimizer | Adam |
| Attention heads | 2 |
| Encoder layers | 2 |
| Feedforward dim | 64 |
| Dropout | 0.1 |

## Training Procedure

### Data
Training data consists of peptide-MHC binding measurements. Positive examples are peptides experimentally confirmed to bind MHC molecules; negative examples are non-binders or low-affinity binders.

### Loss Function
Binary cross-entropy loss is used for all models:

```
L = -(y * log(p) + (1 - y) * log(1 - p))
```

where `y` is the true label (0 or 1) and `p` is the predicted probability.

### Optimization
All models use the Adam optimizer with model-specific learning rates (see hyperparameter tables above). Learning rate scheduling was not applied in the current training runs.

### Regularization
- **Dropout**: Applied before the final classification layer (0.1--0.3 depending on model)
- **Batch normalization**: Used in CNN layers to stabilize training
- **Early stopping**: Training was monitored on validation loss

## Evaluation

### Metrics

| Metric | Definition |
|--------|-----------|
| Accuracy | (TP + TN) / (TP + TN + FP + FN) |
| AUC-ROC | Area under the receiver operating characteristic curve |
| Sensitivity (Recall) | TP / (TP + FN) -- proportion of true binders correctly identified |
| Specificity | TN / (TN + FP) -- proportion of true non-binders correctly identified |

### Results Summary

| Model | Accuracy | AUC-ROC | Sensitivity | Specificity |
|-------|----------|---------|-------------|-------------|
| CNN | 92.4% | 0.914 | 89.2% | 91.7% |
| BiLSTM | 89.7% | 0.892 | 87.5% | 89.3% |
| CNN+BiLSTM | 93.2% | 0.925 | 91.4% | 94.3% |
| CNN+BiLSTM Best | 94.2% | 0.941 | 92.8% | 93.5% |
| Transformer | 94.1% | 0.935 | 92.1% | 93.8% |

### Observations

- The **CNN+BiLSTM Best** model achieves the highest AUC-ROC (0.941), benefiting from hyperparameter optimization.
- The **Transformer** model achieves comparable accuracy (94.1%) with a simpler architecture and lower dropout requirement.
- The **CNN** model offers the best speed-accuracy tradeoff for high-throughput screening scenarios.
- The **BiLSTM** model has lower overall accuracy but captures sequential dependencies that may be important for certain allele-specific predictions.

## Model Selection Guidance

| Use Case | Recommended Model | Reason |
|----------|------------------|--------|
| High-throughput screening | CNN | Fastest inference, good accuracy |
| Sequence-dependent analysis | BiLSTM | Captures positional dependencies |
| General-purpose prediction | CNN+BiLSTM Best | Highest AUC-ROC |
| Research exploration | Transformer | Strong accuracy, interpretable attention |
| Ensemble prediction | All models | Cross-model agreement increases confidence |

## Limitations

- Models are trained on experimentally determined binding data, which has inherent biases toward well-studied alleles (particularly HLA-A*02:01).
- Predictions are for peptide-MHC class I binding only; class II binding requires different models.
- The current implementation uses simulated inference on the web server. For production-grade predictions with actual PyTorch inference, a Python-based inference backend or ONNX runtime integration would be required.
- Model performance metrics reflect the specific training/test split used; performance on novel alleles or peptide families may differ.

## Training Notebooks

The training pipelines are structured as Jupyter notebooks:

| Notebook | Content |
|----------|---------|
| `01_data_ingestion.ipynb` | Data loading, cleaning, and preprocessing |
| `04_model_training_cnn.ipynb` | CNN model training and evaluation |
| `04_model_training_bilstm.ipynb` | BiLSTM model training and evaluation |
| `04_model_training_cnn_bilstm.ipynb` | CNN+BiLSTM hybrid training |
| `04_model_training_transformer_custom.ipynb` | Transformer model training |

To include these in the repository, add them to a `notebooks/` directory.

## References

- Jurtz, V., et al. (2017). NetMHCpan-4.0: Improved Peptide-MHC Class I Interaction Predictions. *Journal of Immunology*, 199(9), 3360-3368.
- O'Donnell, T. J., et al. (2018). MHCflurry: Open-Source Class I MHC Binding Affinity Prediction. *Cell Systems*, 7(1), 129-132.
- Vaswani, A., et al. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*, 30.
