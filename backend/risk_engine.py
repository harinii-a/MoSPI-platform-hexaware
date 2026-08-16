"""
Risk Engine — Generic configurable risk scoring.
Calculates risk from multiple evidence sources with configurable weights.
"""
from typing import List, Dict, Any, Optional


def compute_record_risk(
    record_index: int,
    rule_violations: List[dict],
    is_ml_anomaly: bool,
    ml_anomaly_score: float,
    enum_deviation: bool,
    cluster_deviation: bool,
    weights: Optional[dict] = None,
    extra_context: Optional[dict] = None,
) -> dict:
    """
    Compute risk score for a single record.

    Args:
        record_index: Index of the record in the dataset
        rule_violations: List of rule violation dicts for this record
        is_ml_anomaly: Whether ML flagged this record
        ml_anomaly_score: Raw anomaly score from ML model
        enum_deviation: Whether enumerator shows deviation
        cluster_deviation: Whether cluster shows deviation
        weights: Configurable weights dict {rule, ml, enumerator, cluster}
        extra_context: Additional context for explanation

    Returns:
        Risk assessment dict with score, level, contributors
    """
    if weights is None:
        weights = {"rule": 35, "ml": 35, "enumerator": 15, "cluster": 15}

    total_score = 0
    contributors = []

    # Rule integrity violations
    rule_max = weights.get("rule", 35)
    if rule_violations:
        rule_score = rule_max
        total_score += rule_score
        violation_details = "; ".join([v.get("description", "Rule violation") for v in rule_violations[:5]])
        contributors.append({
            "factor": "Rule Integrity Violation",
            "score": rule_score,
            "max": rule_max,
            "details": violation_details,
            "severity": "critical",
        })
    else:
        contributors.append({
            "factor": "Rule Integrity Violation",
            "score": 0,
            "max": rule_max,
            "details": "No violations detected",
            "severity": "safe",
        })

    # ML anomaly detection
    ml_max = weights.get("ml", 35)
    if is_ml_anomaly:
        ml_score = ml_max
        total_score += ml_score
        detail_str = f"Anomaly score: {ml_anomaly_score:.4f}" if ml_anomaly_score else "Flagged as multivariate outlier"
        if extra_context and "ml_features" in extra_context:
            feature_vals = ", ".join([f"{k}={v}" for k, v in extra_context["ml_features"].items()])
            detail_str += f" ({feature_vals})"
        contributors.append({
            "factor": "ML Anomaly Detection (Isolation Forest)",
            "score": ml_score,
            "max": ml_max,
            "details": detail_str,
            "severity": "critical",
        })
    else:
        contributors.append({
            "factor": "ML Anomaly Detection (Isolation Forest)",
            "score": 0,
            "max": ml_max,
            "details": "Within normal distribution",
            "severity": "safe",
        })

    # Enumerator deviation
    enum_max = weights.get("enumerator", 15)
    if enum_deviation:
        enum_score = enum_max
        total_score += enum_score
        enum_detail = "Enumerator shows statistically significant deviation from baseline"
        if extra_context and "enum_detail" in extra_context:
            enum_detail = extra_context["enum_detail"]
        contributors.append({
            "factor": "Enumerator Variance Bias",
            "score": enum_score,
            "max": enum_max,
            "details": enum_detail,
            "severity": "warning",
        })
    else:
        contributors.append({
            "factor": "Enumerator Variance Bias",
            "score": 0,
            "max": enum_max,
            "details": "Within normal variance",
            "severity": "safe",
        })

    # Cluster deviation
    cluster_max = weights.get("cluster", 15)
    if cluster_deviation:
        cluster_score = cluster_max
        total_score += cluster_score
        cluster_detail = "Cluster shows anomalous pattern"
        if extra_context and "cluster_detail" in extra_context:
            cluster_detail = extra_context["cluster_detail"]
        contributors.append({
            "factor": "Cluster/Geographic Deviation",
            "score": cluster_score,
            "max": cluster_max,
            "details": cluster_detail,
            "severity": "warning",
        })
    else:
        contributors.append({
            "factor": "Cluster/Geographic Deviation",
            "score": 0,
            "max": cluster_max,
            "details": "Cluster within normal parameters",
            "severity": "safe",
        })

    total_score = min(total_score, 100)

    if total_score >= 71:
        risk_level = "High"
    elif total_score >= 31:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "record_index": record_index,
        "risk_score": total_score,
        "risk_level": risk_level,
        "max_possible": 100,
        "contributors": contributors,
        "has_rule_violation": len(rule_violations) > 0,
        "has_ml_anomaly": is_ml_anomaly,
        "has_enum_bias": enum_deviation,
        "has_cluster_deviation": cluster_deviation,
    }
