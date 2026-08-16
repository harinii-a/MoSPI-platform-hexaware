"""
Generic Data Validation Engine
Performs schema validation, completeness checks, uniqueness, range checks,
and configurable logical consistency checks — all driven by dataset config.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional


def run_integrity_checks(
    df: pd.DataFrame,
    config: dict,
    custom_rules: Optional[List[dict]] = None
) -> List[dict]:
    """
    Run generic integrity checks on a dataset.

    Args:
        df: The dataset DataFrame
        config: Dataset configuration with column mappings
        custom_rules: User-defined validation rules

    Returns:
        List of violation dicts: {record_index, column, rule_type, severity, description}
    """
    violations = []

    # ─── A. Schema / Completeness Validation ──────────────────────
    # Check configured identifier columns for missing values
    id_cols = [c for c in (config.get("identifier_cols") or []) if c in df.columns]
    record_id_col = config.get("record_id_col")

    for col in id_cols:
        missing_mask = df[col].isna()
        for idx in df[missing_mask].index:
            violations.append({
                "record_index": int(idx),
                "column": col,
                "rule_type": "MISSING_IDENTIFIER",
                "severity": "HIGH",
                "description": f"Missing required identifier: {col}",
            })

    # General missing value check on important columns
    measure_cols = [c for c in (config.get("measure_cols") or []) if c in df.columns]
    for col in measure_cols:
        missing_pct = df[col].isna().mean() * 100
        if missing_pct > 50:
            # Flag individual records with missing measures only if >50% column is missing
            missing_mask = df[col].isna()
            for idx in df[missing_mask].index[:100]:  # Cap at 100 per column
                violations.append({
                    "record_index": int(idx),
                    "column": col,
                    "rule_type": "MISSING_VALUE",
                    "severity": "MEDIUM",
                    "description": f"Missing value in measure column: {col}",
                })

    # ─── B. Uniqueness Checks ─────────────────────────────────────
    if record_id_col and record_id_col in df.columns:
        # Only test uniqueness if the column is actually intended as an ID (cardinality > 50% or >100 distinct)
        unique_cnt = df[record_id_col].nunique()
        if unique_cnt > 1 and (unique_cnt / max(len(df), 1) > 0.1 or unique_cnt > 50):
            dup_mask = df.duplicated(subset=[record_id_col], keep=False)
            for idx in df[dup_mask].index[:200]:  # Cap at 200 violations
                violations.append({
                    "record_index": int(idx),
                    "column": record_id_col,
                    "rule_type": "DUPLICATE_RECORD",
                    "severity": "HIGH",
                    "description": f"Duplicate {record_id_col}: {df.at[idx, record_id_col]}",
                })

    hh_col = config.get("household_id_col")
    person_col = config.get("person_id_col")
    if hh_col and person_col and hh_col in df.columns and person_col in df.columns:
        combo_dup = df.duplicated(subset=[hh_col, person_col], keep=False)
        for idx in df[combo_dup].index[:200]:
            violations.append({
                "record_index": int(idx),
                "column": f"{hh_col}+{person_col}",
                "rule_type": "DUPLICATE_PERSON",
                "severity": "HIGH",
                "description": f"Duplicate household-person combination",
            })

    # ─── C. Statistical Range Checks (IQR method) ────────────────
    numeric_cols = [c for c in (config.get("numeric_cols") or []) if c in df.columns]
    for col in numeric_cols:
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(series) < 10:
            continue

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue

        lower = q1 - 3 * iqr
        upper = q3 + 3 * iqr

        outlier_mask = (pd.to_numeric(df[col], errors='coerce') < lower) | \
                       (pd.to_numeric(df[col], errors='coerce') > upper)
        outlier_mask = outlier_mask.fillna(False)

        for idx in df[outlier_mask].index[:200]:  # Cap per column
            val = df.at[idx, col]
            violations.append({
                "record_index": int(idx),
                "column": col,
                "rule_type": "STATISTICAL_OUTLIER",
                "severity": "MEDIUM",
                "description": f"Extreme value in {col}: {val} (expected range: {lower:.1f} to {upper:.1f})",
            })

    # ─── D. Negative value checks on measures ────────────────────
    for col in measure_cols:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors='coerce')
        neg_mask = series < 0
        neg_mask = neg_mask.fillna(False)
        for idx in df[neg_mask].index[:100]:
            violations.append({
                "record_index": int(idx),
                "column": col,
                "rule_type": "NEGATIVE_VALUE",
                "severity": "HIGH",
                "description": f"Negative value in {col}: {df.at[idx, col]}",
            })

    # ─── E. Custom User-Defined Rules ─────────────────────────────
    if custom_rules:
        for rule in custom_rules:
            field = rule.get("field")
            operator = rule.get("operator")
            value = rule.get("value")
            severity = rule.get("severity", "MEDIUM")
            rule_name = rule.get("name", f"{field} {operator} {value}")

            if not field or field not in df.columns:
                continue

            try:
                series = pd.to_numeric(df[field], errors='coerce')
                value_num = float(value)

                if operator == "<":
                    mask = series < value_num
                elif operator == "<=":
                    mask = series <= value_num
                elif operator == ">":
                    mask = series > value_num
                elif operator == ">=":
                    mask = series >= value_num
                elif operator == "==":
                    mask = series == value_num
                elif operator == "!=":
                    mask = series != value_num
                else:
                    continue

                mask = mask.fillna(False)
                for idx in df[mask].index[:200]:
                    violations.append({
                        "record_index": int(idx),
                        "column": field,
                        "rule_type": "CUSTOM_RULE",
                        "severity": severity,
                        "description": f"Custom rule violated: {rule_name} (value: {df.at[idx, field]})",
                    })
            except (ValueError, TypeError):
                # Handle string-based rules
                if operator == "==" or operator == "equals":
                    mask = df[field].astype(str) == str(value)
                elif operator == "!=" or operator == "not_equals":
                    mask = df[field].astype(str) != str(value)
                elif operator == "contains":
                    mask = df[field].astype(str).str.contains(str(value), case=False, na=False)
                elif operator == "is_null":
                    mask = df[field].isna()
                else:
                    continue

                for idx in df[mask].index[:200]:
                    violations.append({
                        "record_index": int(idx),
                        "column": field,
                        "rule_type": "CUSTOM_RULE",
                        "severity": severity,
                        "description": f"Custom rule violated: {rule_name}",
                    })

    return violations
