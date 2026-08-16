"""
MoSPI Survey Intelligence Platform — Main API
All endpoints are data-driven. No hardcoded PLFS-specific values.
"""
import sys
import os
import json
import asyncio
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Header as FastAPIHeader, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

from dataset_manager import dataset_store
from schema_engine import profile_dataset
from auth import user_store, create_access_token, get_current_user_from_token, require_permission, check_permission, ROLES
from rules import run_integrity_checks
from ml import detect_ml_anomalies
from drift import detect_drift
from enumerator import detect_enumerator_bias
from risk_engine import compute_record_risk
from report import create_pdf, create_csv_report, create_json_report
from dataset_analytics import compute_dataset_analytics

app = FastAPI(title="MoSPI Survey Intelligence Platform")

ANALYTICS_CACHE: Dict[str, dict] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────
# WebSocket Connection Manager
# ─────────────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# ─────────────────────────────────────────────────────────────────
# In-Memory Stores (Audit, Notifications, Rules, Reviews)
# ─────────────────────────────────────────────────────────────────
AUDIT_LOG: List[dict] = []
audit_counter = 0

NOTIFICATIONS: List[dict] = []
notification_counter = 0

RULES_STORE: List[dict] = []
rules_counter = 0

REVIEW_STORE: Dict[str, Dict[int, dict]] = {}  # dataset_id -> {record_index -> review}

# Cached validation results per dataset
VALIDATION_CACHE: Dict[str, dict] = {}


def add_audit_entry(user: str, role: str, action: str, target: str,
                    old_status, new_status, comment: str, dataset_id: str = None):
    global audit_counter
    audit_counter += 1
    entry = {
        "id": audit_counter,
        "timestamp": datetime.utcnow().isoformat(),
        "user": user,
        "role": role,
        "action": action,
        "target": target,
        "old_status": old_status,
        "new_status": new_status,
        "comment": comment,
        "dataset_id": dataset_id,
    }
    AUDIT_LOG.append(entry)
    return entry


def push_notification(ntype: str, icon: str, title: str, message: str, dataset_id: str = None):
    global notification_counter
    notification_counter += 1
    entry = {
        "id": notification_counter,
        "type": ntype,
        "icon": icon,
        "title": title,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "read": False,
        "dataset_id": dataset_id,
    }
    NOTIFICATIONS.insert(0, entry)
    return entry


def _get_user(authorization: Optional[str]) -> dict:
    """Helper to extract user from auth header."""
    return get_current_user_from_token(authorization, user_store)


# ─────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class ReviewAction(BaseModel):
    status: str
    comment: str
    reviewer: Optional[str] = None

class RuleCreate(BaseModel):
    field: str
    operator: str
    value: str
    severity: Optional[str] = "MEDIUM"
    name: Optional[str] = None
    dataset_id: Optional[str] = None

class RuleUpdate(BaseModel):
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[str] = None
    severity: Optional[str] = None
    name: Optional[str] = None

class ConfigUpdate(BaseModel):
    record_id_col: Optional[str] = None
    household_id_col: Optional[str] = None
    person_id_col: Optional[str] = None
    enumerator_col: Optional[str] = None
    cluster_col: Optional[str] = None
    state_col: Optional[str] = None
    district_col: Optional[str] = None
    geo_cols: Optional[List[str]] = None
    time_col: Optional[str] = None
    measure_cols: Optional[List[str]] = None
    risk_weights: Optional[Dict[str, int]] = None

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str
    department: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# ─────────────────────────────────────────────────────────────────
# 1. Authentication
# ─────────────────────────────────────────────────────────────────
@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    user = user_store.authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": req.username, "role": user["role"]})
    return {"token": token, "user": user}

@app.get("/api/v1/auth/me")
def get_current_user(authorization: Optional[str] = FastAPIHeader(None)):
    return _get_user(authorization)

@app.get("/api/v1/auth/roles")
def get_roles():
    return ROLES


# ─────────────────────────────────────────────────────────────────
# 2. Dataset Management
# ─────────────────────────────────────────────────────────────────
@app.post("/api/v1/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    authorization: Optional[str] = FastAPIHeader(None),
):
    user = _get_user(authorization)
    content = await file.read()

    try:
        result = dataset_store.upload_dataset(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    dataset_id = result["dataset_id"]
    meta = result["metadata"]

    add_audit_entry(
        user.get("name", "System"), user.get("role", "System"),
        "DATASET_UPLOADED", file.filename, None, "PROFILED",
        f"Uploaded dataset with {meta['total_records']} records and {meta['total_columns']} columns",
        dataset_id=dataset_id
    )
    push_notification(
        "info", "ingest", "New Dataset Uploaded",
        f"Uploaded {file.filename} ({meta['total_records']:,} records, {meta['total_columns']} columns)",
        dataset_id=dataset_id
    )

    await manager.broadcast({
        "type": "DATASET_UPLOADED",
        "dataset_id": dataset_id,
        "metadata": meta,
    })

    return result

@app.post("/api/v1/datasets/historical")
async def upload_historical(
    file: UploadFile = File(...),
    target_dataset_id: str = Query(...),
    authorization: Optional[str] = FastAPIHeader(None),
):
    user = _get_user(authorization)
    content = await file.read()

    try:
        result = dataset_store.upload_historical(content, file.filename, target_dataset_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    add_audit_entry(
        user.get("name", "System"), user.get("role", "System"),
        "HISTORICAL_UPLOADED", file.filename, None, "LINKED",
        f"Historical baseline uploaded for dataset {target_dataset_id}",
        dataset_id=target_dataset_id
    )

    return result

@app.get("/api/v1/datasets")
def list_datasets():
    return dataset_store.list_datasets()

@app.get("/api/v1/datasets/{dataset_id}")
def get_dataset_info(dataset_id: str):
    meta = dataset_store.get_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return meta

@app.get("/api/v1/datasets/{dataset_id}/schema")
def get_dataset_schema(dataset_id: str):
    schema = dataset_store.get_schema(dataset_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")
    return schema

@app.put("/api/v1/datasets/{dataset_id}/configuration")
def update_dataset_config(dataset_id: str, config_update: ConfigUpdate,
                          authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    updates = {k: v for k, v in config_update.dict().items() if v is not None}
    try:
        config = dataset_store.update_config(dataset_id, updates)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Invalidate cache
    if dataset_id in VALIDATION_CACHE:
        del VALIDATION_CACHE[dataset_id]
    if dataset_id in ANALYTICS_CACHE:
        del ANALYTICS_CACHE[dataset_id]

    add_audit_entry(
        user.get("name", "System"), user.get("role", "System"),
        "CONFIG_UPDATED", f"Dataset {dataset_id}", None, "CONFIGURED",
        f"Updated dataset configuration",
        dataset_id=dataset_id
    )

    return config

@app.get("/api/v1/datasets/{dataset_id}/configuration")
def get_dataset_config(dataset_id: str):
    config = dataset_store.get_config(dataset_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config

@app.post("/api/v1/datasets/{dataset_id}/activate")
def activate_dataset(dataset_id: str):
    try:
        meta = dataset_store.set_active(dataset_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Dataset activated", "metadata": meta}

@app.delete("/api/v1/datasets/{dataset_id}")
def delete_dataset(dataset_id: str, authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    dataset_store.delete_dataset(dataset_id)
    if dataset_id in VALIDATION_CACHE:
        del VALIDATION_CACHE[dataset_id]
    if dataset_id in ANALYTICS_CACHE:
        del ANALYTICS_CACHE[dataset_id]
    return {"message": "Dataset deleted"}


# ─────────────────────────────────────────────────────────────────
# 3. Validation & Analysis Pipeline
# ─────────────────────────────────────────────────────────────────
def compute_dataset_summary(dataset_id: str) -> dict:
    """
    Compute the full dynamic summary for a dataset.
    This is the CORE function — everything is derived from the data.
    """
    df = dataset_store.get_dataset(dataset_id)
    config = dataset_store.get_config(dataset_id)
    schema = dataset_store.get_schema(dataset_id)
    meta = dataset_store.get_metadata(dataset_id)

    if df is None or config is None:
        return {"error": "Dataset not found or not configured"}

    total_records = len(df)
    total_columns = len(df.columns)
    overall_missing = round(df.isna().mean().mean() * 100, 2)

    # Get custom rules for this dataset
    dataset_rules = [r for r in RULES_STORE if r.get("dataset_id") in (dataset_id, None)]

    # ─── Run Validation Engines ───────────────────────────────────
    # 1. Integrity checks
    violations = run_integrity_checks(df, config, dataset_rules)
    violation_by_record = {}
    for v in violations:
        idx = v["record_index"]
        if idx not in violation_by_record:
            violation_by_record[idx] = []
        violation_by_record[idx].append(v)

    # 2. ML anomaly detection
    ml_result = detect_ml_anomalies(df, config)

    # 3. Enumerator analysis
    enum_result = detect_enumerator_bias(df, config)
    enum_biased_ids = set()
    enum_col = config.get("enumerator_col")
    if enum_result.get("available") and enum_col:
        for alert in enum_result.get("alerts", []):
            enum_biased_ids.add(str(alert["enumerator_id"]))

    # 4. Cluster analysis (vectorized for instant response)
    cluster_col = config.get("cluster_col") or config.get("district_col")
    clusters = []
    cluster_risk_map = {}
    if cluster_col and cluster_col in df.columns:
        try:
            is_v = df.index.isin(violation_by_record.keys())
            is_ml = np.array(ml_result.get("predictions", [False] * len(df)))
            is_flagged = is_v | is_ml
            
            temp_df = pd.DataFrame({
                "cluster": df[cluster_col],
                "is_v": is_v.astype(int),
                "is_ml": is_ml.astype(int),
                "is_flagged": is_flagged.astype(int)
            })
            
            c_agg = temp_df.groupby("cluster").agg(
                records=("is_flagged", "count"),
                flagged=("is_flagged", "sum"),
                violations=("is_v", "sum"),
                anomalies=("is_ml", "sum")
            ).reset_index()
            
            c_agg["rate"] = (c_agg["flagged"] / c_agg["records"].clip(lower=1)).round(3)
            c_agg["risk_score"] = (c_agg["rate"] * 100).clip(upper=100).astype(int)
            
            top_clusters = c_agg.sort_values(by="flagged", ascending=False).head(100)
            
            for _, crow in top_clusters.iterrows():
                g_name = crow["cluster"]
                r_score = int(crow["risk_score"])
                risk_lvl = "High Risk" if r_score >= 50 else ("Medium Risk" if r_score >= 20 else "Low Risk")
                drivers = []
                if crow["violations"] > 0:
                    drivers.append("Rule Integrity Violation")
                if crow["anomalies"] > 0:
                    drivers.append("ML Outlier")
                driver_text = " & ".join(drivers) if drivers else "Normal Variance"
                
                clusters.append({
                    "id": str(g_name),
                    "name": f"{g_name}",
                    "column": cluster_col,
                    "records": int(crow["records"]),
                    "flaggedCount": int(crow["flagged"]),
                    "anomalyRate": round(float(crow["rate"]) * 100, 1),
                    "riskLevel": risk_lvl,
                    "riskScore": r_score,
                    "primaryDriver": driver_text,
                })
                if r_score >= 50:
                    cluster_risk_map[str(g_name)] = True
        except Exception as e:
            print("Cluster analysis error:", e)

    # 5. Historical drift
    drift_result = {"has_historical": False, "message": "Historical baseline unavailable.", "comparisons": []}
    hist_id = config.get("historical_dataset_id")
    if hist_id:
        hist_df = dataset_store.get_dataset(hist_id)
        if hist_df is not None:
            drift_result = detect_drift(df, hist_df, config)

    # ─── Compute Per-Record Risk Scores ──────────────────────────
    weights = config.get("risk_weights", {"rule": 35, "ml": 35, "enumerator": 15, "cluster": 15})
    records_output = []
    
    ml_preds = ml_result.get("predictions", [])
    ml_scores = ml_result.get("scores", [])
    
    # Collect all flagged indices (rule violations + ML anomalies)
    flagged_indices_set = set(violation_by_record.keys())
    for i, is_anom in enumerate(ml_preds):
        if is_anom:
            flagged_indices_set.add(i)

    # Compute high, medium, low counts accurately
    high_count = 0
    med_count = 0
    for idx in flagged_indices_set:
        v_list = violation_by_record.get(idx, [])
        is_anom = idx < len(ml_preds) and ml_preds[idx]
        anom_sc = ml_scores[idx] if idx < len(ml_scores) else 0

        # Fast risk calculation
        r_score = 0
        if v_list:
            r_score += min(len(v_list) * 20, weights.get("rule", 35))
        if is_anom:
            r_score += weights.get("ml", 35)

        if r_score >= 70:
            high_count += 1
        elif r_score >= 30:
            med_count += 1

    low_count = max(0, total_records - high_count - med_count)

    # Determine display columns (first 10 meaningful columns)
    display_cols = []
    for col_info in (schema or {}).get("columns", []):
        if len(display_cols) >= 10:
            break
        if col_info["semantic_role"] != "OTHER" or col_info["name"] in (config.get("measure_cols") or []):
            display_cols.append(col_info["name"])
    if not display_cols:
        display_cols = list(df.columns[:10])

    record_id_col = config.get("record_id_col")

    # Select candidate indices for summary preview (flagged records first + representative sample, up to 300)
    candidate_indices = list(flagged_indices_set)[:250]
    if len(candidate_indices) < 50:
        sample_pool = [i for i in range(min(total_records, 100)) if i not in flagged_indices_set]
        candidate_indices.extend(sample_pool[:50 - len(candidate_indices)])

    for idx in candidate_indices:
        if idx >= total_records:
            continue
        row = df.iloc[idx]
        rec_violations = violation_by_record.get(idx, [])
        is_ml_anomaly = idx < len(ml_preds) and ml_preds[idx]
        ml_score = ml_scores[idx] if idx < len(ml_scores) else 0

        # Enumerator bias for this record
        has_enum_bias = False
        if enum_col and enum_col in df.columns:
            enum_val = str(row.get(enum_col, ""))
            has_enum_bias = enum_val in enum_biased_ids

        # Cluster deviation for this record
        has_cluster_dev = False
        if cluster_col and cluster_col in df.columns:
            cluster_val = str(row.get(cluster_col, ""))
            has_cluster_dev = cluster_risk_map.get(cluster_val, False)

        risk = compute_record_risk(
            record_index=int(idx),
            rule_violations=rec_violations,
            is_ml_anomaly=is_ml_anomaly,
            ml_anomaly_score=ml_score,
            enum_deviation=has_enum_bias,
            cluster_deviation=has_cluster_dev,
            weights=weights,
        )

        rec_dict = {"_index": int(idx)}
        if record_id_col and record_id_col in df.columns:
            rec_dict["record_id"] = _safe_val(row.get(record_id_col))
        else:
            rec_dict["record_id"] = int(idx)

        for col in display_cols:
            if col in df.columns:
                rec_dict[col] = _safe_val(row.get(col))

        rec_dict.update({
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "has_rule_violation": risk["has_rule_violation"],
            "has_ml_anomaly": risk["has_ml_anomaly"],
            "has_enum_bias": risk["has_enum_bias"],
            "violation_count": len(rec_violations),
        })

        if dataset_id in REVIEW_STORE and int(idx) in REVIEW_STORE[dataset_id]:
            review = REVIEW_STORE[dataset_id][int(idx)]
            rec_dict["review_status"] = review.get("status", "NEW")
            rec_dict["review_comment"] = review.get("comment", "")
        else:
            rec_dict["review_status"] = "NEW"

        records_output.append(rec_dict)

    # Sort records_output by risk score descending
    records_output.sort(key=lambda r: r.get("risk_score", 0), reverse=True)

    # ─── Build Dynamic Charts ────────────────────────────────────
    charts = {}

    # Risk Distribution Pie
    charts["pieData"] = [
        {"name": "Low Risk (0-30)", "value": low_count, "color": "#10b981"},
        {"name": "Medium Risk (31-70)", "value": med_count, "color": "#f59e0b"},
        {"name": "High Risk (71-100)", "value": high_count, "color": "#ef4444"},
    ]

    # Geographic / Cluster bar chart
    if cluster_col and cluster_col in df.columns:
        bar_data = []
        for cl in clusters:
            bar_data.append({
                "group": cl["name"],
                "violations": cl["flaggedCount"],
                "records": cl["records"],
            })
        charts["barData"] = bar_data
        charts["barGroupKey"] = "group"
        charts["barLabel"] = f"Flags by {cluster_col}"

    # Numerical distribution charts
    measure_cols = config.get("measure_cols", [])
    num_chart_cols = [c for c in measure_cols if c in df.columns][:4]
    if num_chart_cols:
        line_data = []
        for i, (_, row) in enumerate(df.head(50).iterrows()):
            point = {"index": i}
            for col in num_chart_cols:
                val = pd.to_numeric(row.get(col), errors='coerce')
                point[col] = round(float(val), 2) if pd.notna(val) else 0
            line_data.append(point)
        charts["lineData"] = line_data
        charts["lineKeys"] = num_chart_cols

    # Categorical distribution charts
    cat_cols = config.get("categorical_cols", [])
    geo_cols = config.get("geo_cols", [])
    cat_chart_col = None
    for candidate in geo_cols + cat_cols:
        if candidate in df.columns and df[candidate].nunique() <= 30:
            cat_chart_col = candidate
            break
    if cat_chart_col:
        dist_data = df[cat_chart_col].value_counts().head(15)
        charts["catDistribution"] = [
            {"name": str(k), "count": int(v)} for k, v in dist_data.items()
        ]
        charts["catDistLabel"] = cat_chart_col

    # ─── Compute Statistics ──────────────────────────────────────
    statistics = {}
    for col in num_chart_cols[:10]:
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(series) > 0:
            statistics[col] = {
                "mean": round(float(series.mean()), 2),
                "median": round(float(series.median()), 2),
                "std": round(float(series.std()), 2),
                "min": round(float(series.min()), 2),
                "max": round(float(series.max()), 2),
                "q1": round(float(series.quantile(0.25)), 2),
                "q3": round(float(series.quantile(0.75)), 2),
            }

    # ─── Build Summary ───────────────────────────────────────────
    summary = {
        "dataset_id": dataset_id,
        "dataset_meta": meta,
        "total_records": total_records,
        "total_columns": total_columns,
        "overall_missing_pct": overall_missing,
        "integrity_violation_count": len(violations),
        "ml_anomaly_count": ml_result.get("anomaly_count", 0),
        "ml_info": {
            "features_used": ml_result.get("features_used", []),
            "error": ml_result.get("error"),
        },
        "high_risk_count": high_count,
        "risk_distribution": {"low": low_count, "medium": med_count, "high": high_count},
        "records": records_output,
        "display_columns": display_cols,
        "clusters": clusters,
        "cluster_column": cluster_col,
        "has_clusters": len(clusters) > 0,
        "enumerator_analysis": enum_result,
        "drift": drift_result,
        "charts": charts,
        "statistics": statistics,
        "violations": violations[:500],  # Cap for API response size
        "schema_summary": {
            "identifiers": (schema or {}).get("identifiers", []),
            "dimensions": (schema or {}).get("dimensions", []),
            "measures": (schema or {}).get("measures", []),
            "temporal": (schema or {}).get("temporal", []),
            "geographic": (schema or {}).get("geographic", []),
        },
    }

    # Cache it
    VALIDATION_CACHE[dataset_id] = summary
    return summary


def _safe_val(val):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return round(float(val), 4)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    return str(val) if not isinstance(val, (int, float, bool, str)) else val


@app.post("/api/v1/datasets/{dataset_id}/validate")
async def validate_dataset(dataset_id: str,
                           authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    df = dataset_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Invalidate cache
    if dataset_id in VALIDATION_CACHE:
        del VALIDATION_CACHE[dataset_id]

    summary = compute_dataset_summary(dataset_id)

    add_audit_entry(
        user.get("name", "System"), user.get("role", "System"),
        "VALIDATION_COMPLETED", f"Dataset {dataset_id}", None, "VALIDATED",
        f"Validated {summary['total_records']} records: {summary['integrity_violation_count']} violations, "
        f"{summary['ml_anomaly_count']} ML anomalies",
        dataset_id=dataset_id
    )
    push_notification(
        "success", "batch", "Validation Complete",
        f"Dataset validated: {summary['total_records']:,} records, "
        f"{summary['integrity_violation_count']} violations, "
        f"{summary['ml_anomaly_count']} ML anomalies",
        dataset_id=dataset_id
    )

    await manager.broadcast({
        "type": "VALIDATION_COMPLETED",
        "dataset_id": dataset_id,
        "total_records": summary["total_records"],
        "violations": summary["integrity_violation_count"],
        "anomalies": summary["ml_anomaly_count"],
    })

    return summary

@app.get("/api/v1/datasets/{dataset_id}/summary")
def get_dataset_summary(dataset_id: str):
    if dataset_id in VALIDATION_CACHE:
        return VALIDATION_CACHE[dataset_id]
    df = dataset_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return compute_dataset_summary(dataset_id)

@app.get("/api/v1/datasets/{dataset_id}/analytics")
def get_dataset_analytics(dataset_id: str):
    """
    Get comprehensive statistical profiling, variable distributions,
    geographic rollups, and data quality metrics for the dataset.
    """
    if dataset_id in ANALYTICS_CACHE:
        return ANALYTICS_CACHE[dataset_id]
    
    df = dataset_store.get_dataset(dataset_id)
    config = dataset_store.get_config(dataset_id)
    schema = dataset_store.get_schema(dataset_id)
    if df is None or config is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    analytics = compute_dataset_analytics(df, config, schema)
    ANALYTICS_CACHE[dataset_id] = analytics
    return analytics

@app.get("/api/v1/datasets/{dataset_id}/records")
def get_dataset_records(dataset_id: str,
                        page: int = Query(1, ge=1),
                        page_size: int = Query(50, ge=1, le=500),
                        severity: Optional[str] = Query("ALL"),
                        search: Optional[str] = Query(None)):
    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        df = dataset_store.get_dataset(dataset_id)
        if df is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        summary = compute_dataset_summary(dataset_id)

    records = summary.get("records", [])
    
    # Filter
    if severity and severity != "ALL":
        if severity == "FLAGGED":
            records = [r for r in records if r.get("has_rule_violation") or r.get("has_ml_anomaly") or r.get("has_enum_bias")]
        else:
            records = [r for r in records if r.get("risk_level", "").upper() == severity.upper()]
            
    if search:
        s_lower = search.lower()
        records = [r for r in records if any(s_lower in str(v).lower() for v in r.values() if v is not None)]

    start = (page - 1) * page_size
    end = start + page_size

    return {
        "total": len(records),
        "page": page,
        "page_size": page_size,
        "records": records[start:end],
        "display_columns": summary.get("display_columns", []),
    }

@app.get("/api/v1/datasets/{dataset_id}/clusters")
def get_dataset_clusters(dataset_id: str):
    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        df = dataset_store.get_dataset(dataset_id)
        if df is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        summary = compute_dataset_summary(dataset_id)

    if not summary.get("has_clusters"):
        return {"available": False, "message": "No cluster dimension detected in this dataset.", "clusters": []}
    return {"available": True, "clusters": summary.get("clusters", []), "column": summary.get("cluster_column")}

@app.get("/api/v1/datasets/{dataset_id}/enumerators")
def get_dataset_enumerators(dataset_id: str):
    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        df = dataset_store.get_dataset(dataset_id)
        if df is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        summary = compute_dataset_summary(dataset_id)
    return summary.get("enumerator_analysis", {
        "available": False,
        "message": "Enumerator analysis unavailable."
    })


# ─────────────────────────────────────────────────────────────────
# 4. Explainable AI
# ─────────────────────────────────────────────────────────────────
@app.get("/api/v1/datasets/{dataset_id}/records/{record_index}/explanation")
def explain_record(dataset_id: str, record_index: int):
    df = dataset_store.get_dataset(dataset_id)
    config = dataset_store.get_config(dataset_id)
    if df is None or config is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if record_index < 0 or record_index >= len(df):
        raise HTTPException(status_code=404, detail="Record not found")

    row = df.iloc[record_index]

    # Run checks for this specific record's context
    violations = run_integrity_checks(df, config, [r for r in RULES_STORE if r.get("dataset_id") in (dataset_id, None)])
    rec_violations = [v for v in violations if v["record_index"] == record_index]

    ml_result = detect_ml_anomalies(df, config)
    is_ml = record_index < len(ml_result["predictions"]) and ml_result["predictions"][record_index]
    ml_score = ml_result["scores"][record_index] if record_index < len(ml_result["scores"]) else 0

    # ML feature values
    ml_features = {}
    for feat in ml_result.get("features_used", []):
        if feat in df.columns:
            val = row.get(feat)
            ml_features[feat] = _safe_val(val)

    # Enumerator bias
    enum_col = config.get("enumerator_col")
    has_enum = False
    enum_detail = "No enumerator column configured"
    if enum_col and enum_col in df.columns:
        enum_result = detect_enumerator_bias(df, config)
        enum_val = str(row.get(enum_col, ""))
        biased_ids = {str(a["enumerator_id"]) for a in enum_result.get("alerts", [])}
        has_enum = enum_val in biased_ids
        if has_enum:
            matching_alerts = [a for a in enum_result.get("alerts", []) if str(a["enumerator_id"]) == enum_val]
            if matching_alerts:
                enum_detail = matching_alerts[0].get("message", "Enumerator deviation detected")
        else:
            enum_detail = f"Enumerator {enum_val} within normal variance"

    weights = config.get("risk_weights", {"rule": 35, "ml": 35, "enumerator": 15, "cluster": 15})
    risk = compute_record_risk(
        record_index=record_index,
        rule_violations=rec_violations,
        is_ml_anomaly=is_ml,
        ml_anomaly_score=ml_score,
        enum_deviation=has_enum,
        cluster_deviation=False,
        weights=weights,
        extra_context={"ml_features": ml_features, "enum_detail": enum_detail},
    )

    # Add record data
    record_data = {}
    for col in df.columns:
        record_data[col] = _safe_val(row.get(col))

    return {
        "record_index": record_index,
        "record_data": record_data,
        "total_risk_score": risk["risk_score"],
        "max_possible": 100,
        "risk_level": risk["risk_level"],
        "factors": risk["contributors"],
        "violations": rec_violations,
    }


# ─────────────────────────────────────────────────────────────────
# 5. Supervisor Review
# ─────────────────────────────────────────────────────────────────
@app.post("/api/v1/datasets/{dataset_id}/records/{record_index}/review")
async def review_record(dataset_id: str, record_index: int, action: ReviewAction,
                        authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    df = dataset_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset_id not in REVIEW_STORE:
        REVIEW_STORE[dataset_id] = {}

    old_status = REVIEW_STORE[dataset_id].get(record_index, {}).get("status", "NEW")

    REVIEW_STORE[dataset_id][record_index] = {
        "status": action.status,
        "comment": action.comment,
        "reviewer": action.reviewer or user.get("name", "Supervisor"),
        "reviewed_at": datetime.utcnow().isoformat(),
    }

    # Update cache if exists
    if dataset_id in VALIDATION_CACHE:
        for rec in VALIDATION_CACHE[dataset_id].get("records", []):
            if rec.get("_index") == record_index:
                rec["review_status"] = action.status
                rec["review_comment"] = action.comment
                break

    reviewer_name = action.reviewer or user.get("name", "Supervisor")
    add_audit_entry(
        reviewer_name, user.get("role", "Supervisor"),
        "RECORD_REVIEWED", f"Record #{record_index}",
        old_status, action.status, action.comment,
        dataset_id=dataset_id
    )

    if action.status == "ESCALATED":
        push_notification(
            "critical", "alert", f"Record #{record_index} Escalated",
            f"Escalated by {reviewer_name}: {action.comment}",
            dataset_id=dataset_id
        )

    await manager.broadcast({
        "type": "RECORD_REVIEWED",
        "dataset_id": dataset_id,
        "record_index": record_index,
        "status": action.status,
    })

    return {"message": "Review saved", "status": action.status}


# ─────────────────────────────────────────────────────────────────
# 6. Rules CRUD
# ─────────────────────────────────────────────────────────────────
@app.post("/api/v1/rules")
def create_rule(rule: RuleCreate, authorization: Optional[str] = FastAPIHeader(None)):
    global rules_counter
    user = _get_user(authorization)
    rules_counter += 1
    rule_dict = {
        "id": rules_counter,
        "field": rule.field,
        "operator": rule.operator,
        "value": rule.value,
        "severity": rule.severity or "MEDIUM",
        "name": rule.name or f"{rule.field} {rule.operator} {rule.value}",
        "dataset_id": rule.dataset_id,
        "created_by": user.get("name", "System"),
        "created_at": datetime.utcnow().isoformat(),
    }
    RULES_STORE.append(rule_dict)
    return rule_dict

@app.get("/api/v1/rules")
def list_rules(dataset_id: Optional[str] = Query(None)):
    if dataset_id:
        return [r for r in RULES_STORE if r.get("dataset_id") in (dataset_id, None)]
    return RULES_STORE

@app.put("/api/v1/rules/{rule_id}")
def update_rule(rule_id: int, updates: RuleUpdate):
    for rule in RULES_STORE:
        if rule["id"] == rule_id:
            for k, v in updates.dict().items():
                if v is not None:
                    rule[k] = v
            return rule
    raise HTTPException(status_code=404, detail="Rule not found")

@app.delete("/api/v1/rules/{rule_id}")
def delete_rule(rule_id: int):
    global RULES_STORE
    RULES_STORE = [r for r in RULES_STORE if r["id"] != rule_id]
    return {"message": "Rule deleted"}


# ─────────────────────────────────────────────────────────────────
# 7. Reports
# ─────────────────────────────────────────────────────────────────
@app.post("/api/v1/datasets/{dataset_id}/reports/generate")
async def generate_report(
    dataset_id: str,
    format: str = Query("pdf"),
    authorization: Optional[str] = FastAPIHeader(None),
):
    user = _get_user(authorization)
    df = dataset_store.get_dataset(dataset_id)
    meta = dataset_store.get_metadata(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        summary = compute_dataset_summary(dataset_id)

    report_dir = os.path.join(DATA_DIR, "reports")
    os.makedirs(report_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "pdf":
        analytics = ANALYTICS_CACHE.get(dataset_id)
        if not analytics:
            try:
                config = dataset_store.get_config(dataset_id)
                schema = dataset_store.get_schema(dataset_id)
                analytics = compute_dataset_analytics(df, config, schema)
                ANALYTICS_CACHE[dataset_id] = analytics
            except Exception:
                analytics = None
        path = os.path.join(report_dir, f"report_{dataset_id}_{timestamp}.pdf")
        create_pdf(path, summary, meta, analytics)
        media_type = "application/pdf"
        filename = f"survey_report_{timestamp}.pdf"
    elif format == "csv":
        path = os.path.join(report_dir, f"report_{dataset_id}_{timestamp}.csv")
        create_csv_report(path, summary.get("records", []))
        media_type = "text/csv"
        filename = f"survey_records_{timestamp}.csv"
    elif format == "json":
        path = os.path.join(report_dir, f"report_{dataset_id}_{timestamp}.json")
        create_json_report(path, summary)
        media_type = "application/json"
        filename = f"survey_report_{timestamp}.json"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    add_audit_entry(
        user.get("name", "System"), user.get("role", "System"),
        "REPORT_GENERATED", f"Dataset {dataset_id}",
        None, "COMPLETED", f"Generated {format.upper()} report",
        dataset_id=dataset_id
    )

    return FileResponse(path, media_type=media_type, filename=filename)


# ─────────────────────────────────────────────────────────────────
# 8. Audit & Notifications
# ─────────────────────────────────────────────────────────────────
@app.get("/api/v1/audit-log")
def get_audit_log(dataset_id: Optional[str] = Query(None)):
    if dataset_id:
        filtered = [e for e in AUDIT_LOG if e.get("dataset_id") == dataset_id or e.get("dataset_id") is None]
        return list(reversed(filtered))
    return list(reversed(AUDIT_LOG))

@app.get("/api/v1/notifications")
def get_notifications(dataset_id: Optional[str] = Query(None)):
    if dataset_id:
        return [n for n in NOTIFICATIONS if n.get("dataset_id") in (dataset_id, None)]
    return NOTIFICATIONS

@app.post("/api/v1/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int):
    for n in NOTIFICATIONS:
        if n["id"] == notif_id:
            n["read"] = True
            return {"message": "Marked as read"}
    return {"message": "Not found"}


# ─────────────────────────────────────────────────────────────────
# 9. User Management
# ─────────────────────────────────────────────────────────────────
@app.get("/api/v1/users")
def list_users(authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    return user_store.list_users()

@app.post("/api/v1/users")
def create_user(new_user: UserCreate, authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    try:
        created = user_store.create_user(
            new_user.username, new_user.password,
            new_user.name, new_user.role, new_user.department
        )
        return created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/v1/users/{username}")
def update_user(username: str, updates: UserUpdate,
                authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    try:
        updated = user_store.update_user(username, {k: v for k, v in updates.dict().items() if v is not None})
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/v1/users/{username}")
def delete_user_endpoint(username: str, authorization: Optional[str] = FastAPIHeader(None)):
    user = _get_user(authorization)
    user_store.delete_user(username)
    return {"message": f"User {username} deleted"}


# ─────────────────────────────────────────────────────────────────
# 10. Evaluation (Ground-Truth Aware)
# ─────────────────────────────────────────────────────────────────
@app.get("/api/v1/datasets/{dataset_id}/evaluation")
def get_evaluation(dataset_id: str):
    # Check if ground truth labels exist
    df = dataset_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Look for ground truth columns
    gt_cols = [c for c in df.columns if c.lower() in
               ("is_anomaly", "anomaly", "ground_truth", "gt_label", "label", "is_fraud", "is_error")]

    if not gt_cols:
        return {
            "has_ground_truth": False,
            "message": "Ground-truth labels unavailable. Unsupervised validation metrics are "
                       "reported using anomaly distribution and stability measures.",
            "unsupervised_metrics": _get_unsupervised_metrics(dataset_id),
        }

    # If ground truth exists, compute supervised metrics
    gt_col = gt_cols[0]
    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        summary = compute_dataset_summary(dataset_id)

    gt_labels = pd.to_numeric(df[gt_col], errors='coerce').fillna(0).astype(int).tolist()
    pred_labels = [1 if r.get("has_ml_anomaly") or r.get("has_rule_violation") else 0
                   for r in summary.get("records", [])]

    # Compute metrics
    tp = sum(1 for g, p in zip(gt_labels, pred_labels) if g == 1 and p == 1)
    fp = sum(1 for g, p in zip(gt_labels, pred_labels) if g == 0 and p == 1)
    fn = sum(1 for g, p in zip(gt_labels, pred_labels) if g == 1 and p == 0)
    tn = sum(1 for g, p in zip(gt_labels, pred_labels) if g == 0 and p == 0)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = (tp + tn) / len(gt_labels) if len(gt_labels) > 0 else 0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

    return {
        "has_ground_truth": True,
        "ground_truth_column": gt_col,
        "total_evaluated": len(gt_labels),
        "known_anomalies": sum(gt_labels),
        "precision": f"{precision*100:.1f}%",
        "recall": f"{recall*100:.1f}%",
        "f1_score": f"{f1*100:.1f}%",
        "accuracy": f"{accuracy*100:.1f}%",
        "false_positive_rate": f"{fpr*100:.1f}%",
    }

def _get_unsupervised_metrics(dataset_id: str) -> dict:
    summary = VALIDATION_CACHE.get(dataset_id)
    if not summary:
        return {}
    total = summary.get("total_records", 0)
    ml_count = summary.get("ml_anomaly_count", 0)
    rule_count = summary.get("integrity_violation_count", 0)
    return {
        "total_records": total,
        "ml_anomaly_rate": f"{(ml_count/total*100):.1f}%" if total > 0 else "0%",
        "rule_violation_rate": f"{(rule_count/total*100):.1f}%" if total > 0 else "0%",
        "risk_distribution": summary.get("risk_distribution", {}),
    }


# ─────────────────────────────────────────────────────────────────
# 11. WebSocket
# ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        init_data = {
            "type": "INIT_STATE",
            "active_dataset_id": dataset_store.get_active_id(),
            "datasets": dataset_store.list_datasets(),
            "notifications": NOTIFICATIONS[:20],
        }
        await websocket.send_json(init_data)

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({
                    "type": "PONG",
                    "timestamp": datetime.utcnow().isoformat()
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────────
# 12. Legacy Compatibility & Root
# ─────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "MoSPI Survey Intelligence Platform Running", "version": "2.0"}

# Legacy upload endpoint for backward compat
@app.post("/upload")
async def legacy_upload(file: UploadFile = File(...)):
    content = await file.read()
    result = dataset_store.upload_dataset(content, file.filename)
    dataset_id = result["dataset_id"]
    summary = compute_dataset_summary(dataset_id)
    return summary

@app.post("/validate")
async def legacy_validate(file: UploadFile = File(...)):
    content = await file.read()
    result = dataset_store.upload_dataset(content, file.filename)
    dataset_id = result["dataset_id"]
    summary = compute_dataset_summary(dataset_id)
    return summary

# Legacy summary (uses active dataset)
@app.get("/api/v1/summary")
def legacy_summary():
    active_id = dataset_store.get_active_id()
    if not active_id:
        return {"error": "No active dataset", "total_records": 0}
    return compute_dataset_summary(active_id)
