"""
Generic Drift Detection Engine
Compares current dataset against historical baseline using configured columns.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from scipy.stats import zscore


def detect_drift(
    current_df: pd.DataFrame,
    historical_df: pd.DataFrame,
    config: dict,
) -> dict:
    """
    Detect statistical drift between current and historical datasets.

    Args:
        current_df: Current active dataset
        historical_df: Historical baseline dataset
        config: Dataset configuration with column mappings

    Returns:
        dict with drift results per group per measure
    """
    # Determine grouping column (geo or cluster)
    group_col = (
        config.get("district_col") or
        config.get("state_col") or
        config.get("cluster_col") or
        (config.get("geo_cols", [None])[0] if config.get("geo_cols") else None)
    )

    measure_cols = config.get("measure_cols", [])
    numeric_cols = config.get("numeric_cols", [])
    candidates = measure_cols if measure_cols else numeric_cols

    result = {
        "has_historical": True,
        "group_column": group_col,
        "comparisons": [],
    }

    if not candidates:
        result["message"] = "No numerical measures available for drift comparison."
        return result

    # Find common columns between current and historical
    common_cols = [c for c in candidates if c in current_df.columns and c in historical_df.columns]
    if not common_cols:
        result["message"] = "Historical comparison partially unavailable due to schema mismatch."
        result["mismatched_columns"] = [c for c in candidates if c not in historical_df.columns]
        return result

    if group_col and group_col in current_df.columns and group_col in historical_df.columns:
        # Grouped drift analysis
        for measure in common_cols[:10]:  # Limit to 10 measures
            try:
                current_grouped = current_df.groupby(group_col)[measure].apply(
                    lambda x: pd.to_numeric(x, errors='coerce').mean()
                )
                hist_grouped = historical_df.groupby(group_col)[measure].apply(
                    lambda x: pd.to_numeric(x, errors='coerce').mean()
                )

                combined = pd.concat([current_grouped, hist_grouped], axis=1)
                combined.columns = ['current', 'historical']
                combined = combined.dropna()

                if len(combined) == 0:
                    continue

                combined['diff'] = combined['current'] - combined['historical']
                combined['pct_change'] = ((combined['diff'] / combined['historical'].replace(0, np.nan)) * 100).round(2)

                for group_name, row in combined.iterrows():
                    result["comparisons"].append({
                        "group": str(group_name),
                        "measure": measure,
                        "current": round(float(row['current']), 2),
                        "historical": round(float(row['historical']), 2),
                        "diff": round(float(row['diff']), 2),
                        "pct_change": float(row['pct_change']) if pd.notna(row['pct_change']) else 0,
                    })
            except Exception as e:
                continue
    else:
        # Overall drift (no grouping)
        for measure in common_cols[:10]:
            try:
                cur_series = pd.to_numeric(current_df[measure], errors='coerce').dropna()
                hist_series = pd.to_numeric(historical_df[measure], errors='coerce').dropna()

                if len(cur_series) == 0 or len(hist_series) == 0:
                    continue

                cur_mean = float(cur_series.mean())
                hist_mean = float(hist_series.mean())
                diff = cur_mean - hist_mean
                pct = ((diff / hist_mean) * 100) if hist_mean != 0 else 0

                result["comparisons"].append({
                    "group": "Overall",
                    "measure": measure,
                    "current": round(cur_mean, 2),
                    "historical": round(hist_mean, 2),
                    "diff": round(diff, 2),
                    "pct_change": round(pct, 2),
                })
            except Exception:
                continue

    if not result["comparisons"]:
        result["message"] = "No comparable data found between current and historical datasets."

    return result
