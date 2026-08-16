"""
Generic Enumerator Analysis Engine
Detects enumerator bias using configured column mappings.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional


def detect_enumerator_bias(
    df: pd.DataFrame,
    config: dict,
) -> dict:
    """
    Analyze enumerator performance using configured columns.

    Args:
        df: Dataset DataFrame
        config: Dataset configuration with column mappings

    Returns:
        dict with enumerator analysis results and alerts
    """
    enum_col = config.get("enumerator_col")

    if not enum_col or enum_col not in df.columns:
        return {
            "available": False,
            "message": "Enumerator analysis unavailable because no enumerator identifier was detected.",
            "enumerators": [],
            "alerts": [],
        }

    measure_cols = config.get("measure_cols", [])
    numeric_cols = config.get("numeric_cols", [])
    analysis_cols = [c for c in (measure_cols if measure_cols else numeric_cols) if c in df.columns]

    if not analysis_cols:
        return {
            "available": True,
            "message": "No numerical measures available for enumerator analysis.",
            "enumerators": [],
            "alerts": [],
        }

    # Precompute overall mean and std ONCE for all columns
    overall_stats = {}
    valid_cols = []
    for col in analysis_cols[:8]:
        s = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(s) >= 5 and s.std() > 0:
            overall_stats[col] = {
                "mean": float(s.mean()),
                "std": float(s.std())
            }
            valid_cols.append(col)

    if not valid_cols:
        return {
            "available": True,
            "message": "No variable numerical measures available for enumerator analysis.",
            "enumerators": [],
            "alerts": [],
        }

    enumerators = []
    alerts = []
    total_records = len(df)

    # Groupby enumerator with valid columns
    enum_counts = df[enum_col].value_counts()
    
    # Filter to enumerators with at least 5 records to be statistically relevant
    relevant_enums = enum_counts[enum_counts >= 3].head(100).index

    for enum_id in relevant_enums:
        group = df[df[enum_col] == enum_id]
        rec_cnt = len(group)
        enum_info = {
            "enumerator_id": str(enum_id),
            "record_count": rec_cnt,
            "record_pct": round(rec_cnt / total_records * 100, 2),
            "missing_rate": round(group[valid_cols].isna().mean().mean() * 100, 2),
            "measures": {},
        }

        for col in valid_cols:
            series = pd.to_numeric(group[col], errors='coerce').dropna()
            if len(series) < 3:
                continue

            enum_mean = float(series.mean())
            overall_mean = overall_stats[col]["mean"]
            overall_std = overall_stats[col]["std"]

            z_score = (enum_mean - overall_mean) / overall_std

            enum_info["measures"][col] = {
                "mean": round(enum_mean, 2),
                "overall_mean": round(overall_mean, 2),
                "std": round(float(series.std()), 2) if len(series) > 1 else 0.0,
                "z_score": round(z_score, 2),
            }

            # Generate alert if deviation > 2 standard deviations
            if abs(z_score) > 2.0:
                alerts.append({
                    "enumerator_id": str(enum_id),
                    "measure": col,
                    "mean_value": round(enum_mean, 2),
                    "overall_mean": round(overall_mean, 2),
                    "z_score": round(z_score, 2),
                    "deviation_sigma": round(abs(z_score), 1),
                    "direction": "above" if z_score > 0 else "below",
                    "message": (
                        f"Enumerator {enum_id} has mean {col} of {enum_mean:,.2f}, "
                        f"which is {abs(z_score):.1f}σ "
                        f"{'above' if z_score > 0 else 'below'} dataset baseline ({overall_mean:,.2f})."
                    ),
                })

        enumerators.append(enum_info)

    # Sort alerts by highest deviation
    alerts.sort(key=lambda a: a["deviation_sigma"], reverse=True)

    return {
        "available": True,
        "enumerator_column": enum_col,
        "total_enumerators": int(df[enum_col].nunique()),
        "analyzed_count": len(enumerators),
        "alert_count": len(alerts),
        "enumerators": enumerators[:50],  # Return top 50
        "alerts": alerts[:25],  # Return top 25 alerts
    }
