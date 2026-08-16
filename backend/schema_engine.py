"""
Schema Discovery & Semantic Role Detection Engine
Automatically profiles dataset columns and infers semantic roles.
"""
import re
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional


# ─── Semantic Role Definitions ────────────────────────────────────
SEMANTIC_ROLES = {
    "RECORD_ID": {
        "keywords": ["record_id", "rec_id", "id", "srl", "serial", "row_id", "obs_id", "inf_srl", "unique_id"],
        "type_hint": "any",
        "unique_ratio_min": 0.8,
    },
    "FILE_CODE": {
        "keywords": ["file_id", "file_name", "batch_id", "dataset_code", "data_file"],
        "type_hint": "categorical",
    },
    "HOUSEHOLD_ID": {
        "keywords": ["household_id", "hh_id", "hhid", "hh_no", "household", "hh_srl", "fsu_hh"],
        "type_hint": "any",
    },
    "PERSON_ID": {
        "keywords": ["person_id", "per_id", "member_id", "person_srl", "member_srl", "ind_id"],
        "type_hint": "any",
    },
    "ENUMERATOR_ID": {
        "keywords": ["enumerator_id", "enumerator", "enum_code", "enum_id", "field_worker",
                      "investigator", "sro", "interviewer", "collector", "agent_id"],
        "type_hint": "any",
    },
    "SUPERVISOR_ID": {
        "keywords": ["supervisor_id", "supervisor", "sup_id", "sup_code", "team_leader"],
        "type_hint": "any",
    },
    "CLUSTER_ID": {
        "keywords": ["cluster", "cluster_id", "psu", "psu_id", "fsu", "mfsu", "sss",
                      "sampling_unit", "block", "segment", "ea_code"],
        "type_hint": "any",
    },
    "PSU_ID": {
        "keywords": ["psu_id", "psu", "primary_sampling_unit"],
        "type_hint": "any",
    },
    "STATE": {
        "keywords": ["st", "state", "state_code", "state_name", "province", "region"],
        "type_hint": "categorical",
    },
    "DISTRICT": {
        "keywords": ["dc", "district", "dist", "district_code", "district_name",
                      "county", "nss_reg"],
        "type_hint": "categorical",
    },
    "VILLAGE": {
        "keywords": ["village", "village_name", "town", "locality", "habitation"],
        "type_hint": "categorical",
    },
    "URBAN_RURAL": {
        "keywords": ["sec", "urban_rural", "sector", "rural_urban", "area_type", "urban", "rural"],
        "type_hint": "categorical",
        "cardinality_max": 5,
    },
    "AGE": {
        "keywords": ["age", "age_years", "age_yr"],
        "type_hint": "numeric",
        "value_range": (0, 120),
    },
    "GENDER": {
        "keywords": ["sex", "gender", "male_female", "m_f"],
        "type_hint": "categorical",
        "cardinality_max": 5,
    },
    "EMPLOYMENT": {
        "keywords": ["employment_status", "employment", "emp_status", "work_status",
                      "activity_status", "emp_code", "hhtype"],
        "type_hint": "categorical",
    },
    "EDUCATION": {
        "keywords": ["education", "edu", "edu_level", "education_level", "qualification",
                      "literacy", "edu_code"],
        "type_hint": "categorical",
    },
    "INCOME": {
        "keywords": ["inc_tot", "income", "earnings", "wage", "salary", "total_income",
                      "monthly_income", "annual_income", "hce_tot", "consumption",
                      "expenditure", "rent", "interest", "pension", "remit", "hce1", "hce2", "hce3", "hce4", "hce5"],
        "type_hint": "numeric",
    },
    "HOURS_WORKED": {
        "keywords": ["hours_worked", "hours", "total_hours", "work_hours", "hrs_worked",
                      "weekly_hours", "totalsd"],
        "type_hint": "numeric",
    },
    "DATE": {
        "keywords": ["date", "sur_date", "survey_date", "interview_date", "collection_date",
                      "visit_date", "smonth", "month", "qtr", "quarter", "year"],
        "type_hint": "date",
    },
    "WEIGHT": {
        "keywords": ["mult", "multiplier", "weight", "sample_weight", "wgt",
                      "sampling_weight", "nsc"],
        "type_hint": "numeric",
    },
    "RELIGION": {
        "keywords": ["relg", "religion", "rel_code"],
        "type_hint": "categorical",
        "cardinality_max": 20,
    },
    "SOCIAL_GROUP": {
        "keywords": ["sg", "social_group", "caste", "category", "sc_st"],
        "type_hint": "categorical",
        "cardinality_max": 10,
    },
    "HOUSEHOLD_SIZE": {
        "keywords": ["hh_size", "household_size", "family_size", "members"],
        "type_hint": "numeric",
        "value_range": (1, 50),
    },
    "RESPONSE_CODE": {
        "keywords": ["resp_code", "response_code", "response", "svc", "rea_sub"],
        "type_hint": "categorical",
    },
    "SCHEME": {
        "keywords": ["sch", "schedule", "scheme_code", "survey_code"],
        "type_hint": "categorical",
    },
    "VISIT": {
        "keywords": ["visit", "visit_no", "round", "panel"],
        "type_hint": "categorical",
    },
    "SECTION": {
        "keywords": ["sec", "section", "block_no"],
        "type_hint": "categorical",
    },
    "STRATUM": {
        "keywords": ["strm", "stratum", "bstrm", "sstrm", "grp", "zst"],
        "type_hint": "categorical",
    },
    "LAND_POSSESSION": {
        "keywords": ["lposs", "land", "land_possessed", "land_owned"],
        "type_hint": "categorical",
    },
}


def _infer_column_type(series: pd.Series) -> str:
    """Infer the logical type of a column."""
    if series.dtype in ("int64", "int32", "float64", "float32"):
        return "numeric"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    # Try to detect date strings
    if series.dtype == "object":
        sample = series.dropna().head(20)
        date_count = 0
        for val in sample:
            try:
                pd.to_datetime(str(val))
                date_count += 1
            except (ValueError, TypeError):
                pass
        if len(sample) > 0 and date_count / len(sample) > 0.7:
            return "datetime"
    # Check numeric-like strings
    if series.dtype == "object":
        try:
            pd.to_numeric(series.dropna().head(50))
            return "numeric"
        except (ValueError, TypeError):
            pass
    return "categorical"


def _keyword_match_score(col_name: str, keywords: list) -> float:
    """Score how well a column name matches semantic role keywords."""
    col_lower = col_name.lower().strip()
    col_clean = re.sub(r'[^a-z0-9]', '_', col_lower).strip('_')

    best_score = 0.0
    for kw in keywords:
        kw_lower = kw.lower()
        if col_clean == kw_lower:
            return 1.0  # Exact match
        if col_lower == kw_lower:
            return 1.0
        if kw_lower in col_clean or col_clean in kw_lower:
            score = len(kw_lower) / max(len(col_clean), 1)
            best_score = max(best_score, min(score, 0.85))
        # Partial word match
        col_parts = set(col_clean.split('_'))
        kw_parts = set(kw_lower.split('_'))
        if col_parts & kw_parts:
            overlap = len(col_parts & kw_parts) / max(len(col_parts | kw_parts), 1)
            best_score = max(best_score, overlap * 0.7)

    return best_score


def profile_column(series: pd.Series, col_name: str) -> dict:
    """Generate a profile for a single column."""
    total = len(series)
    missing = int(series.isna().sum())
    missing_pct = round(missing / total * 100, 2) if total > 0 else 0
    non_null = series.dropna()
    unique_count = int(non_null.nunique())
    cardinality = unique_count
    inferred_type = _infer_column_type(series)

    sample_values = non_null.head(5).tolist()
    # Convert numpy types to Python native
    sample_values = [
        int(v) if isinstance(v, (np.integer,)) else
        float(v) if isinstance(v, (np.floating,)) else
        str(v) for v in sample_values
    ]

    profile = {
        "name": col_name,
        "inferred_type": inferred_type,
        "nullable": missing > 0,
        "unique_count": unique_count,
        "missing_count": missing,
        "missing_percentage": missing_pct,
        "cardinality": cardinality,
        "sample_values": sample_values,
        "total_count": total,
    }

    # Add numeric stats
    if inferred_type == "numeric":
        try:
            nums = pd.to_numeric(series, errors='coerce').dropna()
            if len(nums) > 0:
                profile["min"] = float(nums.min())
                profile["max"] = float(nums.max())
                profile["mean"] = round(float(nums.mean()), 2)
                profile["median"] = round(float(nums.median()), 2)
                profile["std"] = round(float(nums.std()), 2)
        except Exception:
            pass

    return profile


def detect_semantic_role(col_name: str, profile: dict) -> tuple:
    """
    Detect the semantic role for a column.
    Returns (role, confidence).
    """
    best_role = "OTHER"
    best_confidence = 0.0

    total = profile.get("total_count", 1)
    unique = profile.get("unique_count", 0)
    ratio = unique / total if total > 0 else 0

    for role, config in SEMANTIC_ROLES.items():
        score = 0.0

        # Uniqueness constraint for RECORD_ID
        unique_ratio_min = config.get("unique_ratio_min")
        if unique_ratio_min:
            if total > 20 and ratio < 0.5:
                # Disqualify as unique ID if uniqueness is under 50%
                continue
            elif ratio >= unique_ratio_min:
                score += 0.2

        # Keyword matching (primary signal)
        kw_score = _keyword_match_score(col_name, config["keywords"])
        if kw_score == 0:
            continue
        score += kw_score * 0.7

        # Type compatibility
        type_hint = config.get("type_hint", "any")
        col_type = profile.get("inferred_type", "categorical")
        if type_hint == "any" or type_hint == col_type:
            score += 0.15
        elif type_hint == "numeric" and col_type == "categorical":
            score -= 0.1
        elif type_hint == "date" and col_type == "datetime":
            score += 0.15

        # Cardinality constraint
        max_card = config.get("cardinality_max")
        if max_card and profile.get("cardinality", 999) > max_card * 3:
            score -= 0.15

        # Value range for numeric
        value_range = config.get("value_range")
        if value_range and "min" in profile and "max" in profile:
            if profile["min"] >= value_range[0] and profile["max"] <= value_range[1]:
                score += 0.1

        if score > best_confidence and score > 0.2:
            best_confidence = score
            best_role = role

    # Clamp confidence
    best_confidence = round(min(max(best_confidence, 0), 1.0), 3)

    return best_role, best_confidence


def profile_dataset(df: pd.DataFrame) -> dict:
    """
    Generate a full dataset profile with semantic role detection.
    Returns schema with column profiles and detected roles.
    """
    columns = []
    detected_roles = {}

    for col in df.columns:
        profile = profile_column(df[col], col)
        role, confidence = detect_semantic_role(col, profile)
        profile["semantic_role"] = role
        profile["confidence"] = confidence
        columns.append(profile)

        if role != "OTHER":
            if role not in detected_roles or detected_roles[role]["confidence"] < confidence:
                detected_roles[role] = {"column": col, "confidence": confidence}

    # Classify columns
    identifier_cols = [c["name"] for c in columns if c["semantic_role"] in
                       ("RECORD_ID", "HOUSEHOLD_ID", "PERSON_ID")]
    dimension_cols = [c["name"] for c in columns if c["semantic_role"] in
                      ("STATE", "DISTRICT", "VILLAGE", "URBAN_RURAL", "CLUSTER_ID",
                       "ENUMERATOR_ID", "GENDER", "EMPLOYMENT", "EDUCATION",
                       "RELIGION", "SOCIAL_GROUP")]
    measure_cols = [c["name"] for c in columns if c["semantic_role"] in
                    ("INCOME", "HOURS_WORKED", "AGE", "HOUSEHOLD_SIZE", "WEIGHT")
                    and c["inferred_type"] == "numeric"]
    temporal_cols = [c["name"] for c in columns if c["semantic_role"] == "DATE"]
    geographic_cols = [c["name"] for c in columns if c["semantic_role"] in
                       ("STATE", "DISTRICT", "VILLAGE", "URBAN_RURAL")]
    numeric_cols = [c["name"] for c in columns if c["inferred_type"] == "numeric"]
    categorical_cols = [c["name"] for c in columns if c["inferred_type"] == "categorical"]

    return {
        "total_columns": len(df.columns),
        "total_records": len(df),
        "columns": columns,
        "detected_roles": {k: v for k, v in detected_roles.items()},
        "identifiers": identifier_cols,
        "dimensions": dimension_cols,
        "measures": measure_cols,
        "temporal": temporal_cols,
        "geographic": geographic_cols,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
    }
