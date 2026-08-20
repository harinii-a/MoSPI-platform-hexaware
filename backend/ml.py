"""
Generic ML Anomaly Detection Engine
Auto-selects numerical features from dataset config and runs Isolation Forest.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Optional, Tuple


def detect_ml_anomalies(
    df: pd.DataFrame,
    config: dict,
    contamination: float = 0.1,
) -> dict:
    """
    Run Isolation Forest anomaly detection on auto-selected numerical features.

    Args:
        df: Dataset DataFrame
        config: Dataset configuration with column mappings
        contamination: Expected proportion of anomalies

    Returns:
        dict with predictions, scores, features_used, anomaly_indices
    """
    # Auto-select features: prefer configured measure cols, fall back to all numerics
    measure_cols = config.get("measure_cols", [])
    numeric_cols = config.get("numeric_cols", [])

    # Use measures first, then all numerics
    candidate_cols = measure_cols if measure_cols else numeric_cols
    candidate_cols = [c for c in candidate_cols if c in df.columns]

    # Filter to actually numeric columns with sufficient data
    features_used = []
    for col in candidate_cols:
        series = pd.to_numeric(df[col], errors='coerce')
        non_null_pct = series.notna().mean()
        if non_null_pct > 0.5 and series.nunique() > 2:
            features_used.append(col)

    if len(features_used) < 1:
        return {
            "predictions": [False] * len(df),
            "scores": [0.0] * len(df),
            "features_used": [],
            "anomaly_count": 0,
            "anomaly_indices": [],
            "error": "No suitable numerical features found for ML analysis.",
        }

    # Prepare feature matrix
    feature_df = df[features_used].apply(pd.to_numeric, errors='coerce')
    # Fill NaN with median for ML
    feature_df = feature_df.fillna(feature_df.median())

    # Check minimum sample size
    if len(feature_df) < 10:
        return {
            "predictions": [False] * len(df),
            "scores": [0.0] * len(df),
            "features_used": features_used,
            "anomaly_count": 0,
            "anomaly_indices": [],
            "error": "Too few records for ML anomaly detection (minimum: 10).",
        }

    # Adjust contamination for small datasets
    effective_contamination = min(contamination, 0.5)
    if len(feature_df) < 50:
        effective_contamination = min(effective_contamination, 0.2)

    try:
        n_est = 50 if len(feature_df) > 5000 else 100
        max_s = min(5000, len(feature_df))
        model = IsolationForest(
            contamination=effective_contamination,
            random_state=42,
            n_estimators=n_est,
            max_samples=max_s,
            n_jobs=-1,
        )
        if len(feature_df) > 20000:
            # Fit on sample, then predict
            sample_df = feature_df.sample(n=min(10000, len(feature_df)), random_state=42)
            model.fit(sample_df)
            preds = model.predict(feature_df)
            scores = model.decision_function(feature_df)
        else:
            preds = model.fit_predict(feature_df)
            scores = model.decision_function(feature_df)

        anomaly_scores = (-scores).tolist()  # Higher score = more anomalous
        flagging_threshold = -0.05
        is_anomaly = [s >= flagging_threshold for s in anomaly_scores]
        anomaly_indices = [int(i) for i, a in enumerate(is_anomaly) if a]

        return {
            "predictions": is_anomaly,
            "scores": anomaly_scores,
            "features_used": features_used,
            "anomaly_count": sum(is_anomaly),
            "anomaly_indices": anomaly_indices,
        }
    except Exception as e:
        return {
            "predictions": [False] * len(df),
            "scores": [0.0] * len(df),
            "features_used": features_used,
            "anomaly_count": 0,
            "anomaly_indices": [],
            "error": f"ML analysis failed: {str(e)}",
        }
