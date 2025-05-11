A Python script to train, evaluate, and save predictions for two machine learning tasks on housing data:

1. **Price Prediction**: regression using XGBoost
2. **Type Classification**: classification using Random Forests

Built with pandas, NumPy, scikit-learn, and XGBoost, it includes data cleaning, feature engineering, preprocessing pipelines, and model evaluation.

---

## Overview

The `housing_price_type_ml.py` script performs two sequential stages:

- **Part 1 – Price Modelling**: load training and test CSVs; clean, impute, scale, and log-transform skewed features; then train an XGBoost regressor with hyperparameters for mean absolute error (MAE) loss, outputting predictions to `houses.regression.csv`.

- **Part 2 – Type Modelling**: load the same CSVs; apply similar cleaning and sparse-value removal; log-transform numeric skew; then train a Random Forest classifier on numerical features, outputting classification results to `houses.classification.csv` and printing the weighted F1 score.

Each stage includes functions for data loading, cleaning, sparse row/column removal, skew transformation, preprocessing pipelines, training, evaluation, and CSV export.

---

## Functionality

1. **Data Loading & Cleaning**
   - Reads CSV via `pd.read_csv()`.
   - Cleans percentage strings (e.g. `"15%"` → `0.15`).
   - Drops sparse columns and rows above predefined thresholds.
   - Applies log1p transform to features with absolute skew > 0.3.

2. **Price Prediction Pipeline**
   - Drops irrelevant columns (`price`, IDs, suburb metadata).
   - Builds a `ColumnTransformer` with:
     - **Numerical**: mean imputation + standard scaling
     - **Categorical**: constant imputation + one-hot encoding
   - Uses `XGBRegressor` with tuned hyperparameters (900 estimators, learning rate 0.07, max depth 4, etc.).
   - Evaluates MAE on test set and writes predictions CSV.

3. **Type Classification Pipeline**
   - Drops irrelevant columns (`type`, IDs, sparse metadata).
   - Restricts to numerical features.
   - Builds a `ColumnTransformer` with mean imputation + scaling.
   - Trains a `RandomForestClassifier` (105 trees, min samples split=3).
   - Evaluates weighted F1 score and writes classification CSV.

4. **Command-line Interface**
   - Script expects two arguments: `<train_csv> <test_csv>`.
   - Runs price modelling then type modelling, printing status and metrics.

---

## Features

- **Modular Design**: distinct functions for each preprocessing and modelling step.
- **Sparse Data Handling**: custom logic to drop rows/columns with >60%/40% missing or irrelevant values.
- **Skew Correction**: automatic log transforms for highly skewed features.
- **Preprocessing Pipelines**: use of `ColumnTransformer` and `Pipeline` for reproducible workflows.
- **Hyperparameter Configuration**: explicit settings for XGBoost and Random Forest.
- **Evaluation & Export**: prints MAE and F1 metrics; saves prediction CSVs for submission.

---

## Tech Stack

- **Language**: Python 3
- **Libraries**:
  - pandas, NumPy for data manipulation
  - SciPy for skew calculation
  - scikit-learn for imputation, encoding, scaling, pipelines, and Random Forest
  - XGBoost for regression modelling

---

## Getting Started

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt