"""
Dataset Analytics Engine — Deep statistical profiling, distributions, cross-tabulations,
geographic aggregations, and data quality metrics for MoSPI survey datasets.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional


# Standard MoSPI Code Mappings for friendly display
MOSPI_CODE_LABELS = {
    "sec": {1: "Rural", 2: "Urban", "1": "Rural", "2": "Urban"},
    "relg": {
        1: "Hinduism", 2: "Islam", 3: "Christianity", 4: "Sikhism",
        5: "Jainism", 6: "Buddhism", 7: "Zoroastrianism", 9: "Others",
        "1": "Hinduism", "2": "Islam", "3": "Christianity", "4": "Sikhism",
        "5": "Jainism", "6": "Buddhism", "7": "Zoroastrianism", "9": "Others"
    },
    "sg": {
        1: "Scheduled Tribe (ST)", 2: "Scheduled Caste (SC)",
        3: "Other Backward Classes (OBC)", 9: "Others",
        "1": "Scheduled Tribe (ST)", "2": "Scheduled Caste (SC)",
        "3": "Other Backward Classes (OBC)", "9": "Others"
    },
    "visit": {
        "V1": "Visit 1", "V2": "Visit 2", "V3": "Visit 3", "V4": "Visit 4",
        1: "Visit 1", 2: "Visit 2", 3: "Visit 3", 4: "Visit 4"
    },
    "qtr": {
        "Q1": "Quarter 1 (Jan-Mar)", "Q2": "Quarter 2 (Apr-Jun)",
        "Q3": "Quarter 3 (Jul-Sep)", "Q4": "Quarter 4 (Oct-Dec)"
    }
}


def compute_dataset_analytics(df: pd.DataFrame, config: dict, schema: Optional[dict] = None) -> dict:
    """
    Compute comprehensive dataset analytics for any uploaded dataset.
    Returns complete macro metrics, distributions, histograms, geographic rollups, and quality scores.
    """
    total_records = len(df)
    total_columns = len(df.columns)
    
    if total_records == 0:
        return {"error": "Dataset is empty"}

    # ─────────────────────────────────────────────────────────────
    # 1. Executive Macro Overview
    # ─────────────────────────────────────────────────────────────
    total_cells = total_records * total_columns
    missing_cells = int(df.isna().sum().sum())
    overall_missing_pct = round(missing_cells / total_cells * 100, 2) if total_cells > 0 else 0
    
    # Duplicate rows count
    dup_rows = int(df.duplicated().sum())
    dup_rows_pct = round(dup_rows / total_records * 100, 2)
    
    # Memory and File Size approximation
    memory_mb = round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)
    
    # Weighted population estimate if multiplier column exists
    weight_col = config.get("weight_col") or ("mult" if "mult" in df.columns else None)
    weighted_population = None
    if weight_col and weight_col in df.columns:
        try:
            w_series = pd.to_numeric(df[weight_col], errors='coerce').dropna()
            # Multiplier in MoSPI is typically / 100 or raw weight
            w_sum = float(w_series.sum())
            if w_sum > 100000000: # if over 100 million, might be /100 or /1000
                weighted_population = round(w_sum / 100, 0)
            else:
                weighted_population = round(w_sum, 0)
        except Exception:
            weighted_population = None

    # ─────────────────────────────────────────────────────────────
    # 2. Numeric Variables Profiling & Histograms
    # ─────────────────────────────────────────────────────────────
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    measure_cols = config.get("measure_cols", [])
    
    # Prioritize measures and key variables
    primary_numerics = [c for c in measure_cols if c in df.columns]
    for c in ["inc_tot", "hce_tot", "hh_size", "rent", "interest", "pension", "remit", "hours_worked", "age", "income", "monthly_income", "hce1", "hce2", "hce3", "hce4", "hce5"]:
        if c in df.columns and c not in primary_numerics:
            primary_numerics.append(c)
    # Append any remaining numeric columns up to 25
    for c in numeric_cols:
        if c not in primary_numerics and len(primary_numerics) < 25:
            primary_numerics.append(c)

    numeric_profiles = {}
    for col in primary_numerics:
        s = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(s) == 0:
            continue
        
        q1 = float(s.quantile(0.25))
        q3 = float(s.quantile(0.75))
        iqr = q3 - q1
        outliers = int(((s < (q1 - 1.5 * iqr)) | (s > (q3 + 1.5 * iqr))).sum())
        zero_cnt = int((s == 0).sum())
        missing_cnt = int(df[col].isna().sum())
        
        # 10-bin histogram
        hist_data = []
        try:
            counts, bin_edges = np.histogram(s, bins=min(10, max(3, s.nunique())))
            for i in range(len(counts)):
                b_start = round(float(bin_edges[i]), 1)
                b_end = round(float(bin_edges[i+1]), 1)
                hist_data.append({
                    "bin_label": f"{int(b_start):,}-{int(b_end):,}" if b_end > 100 else f"{b_start}-{b_end}",
                    "bin_start": b_start,
                    "bin_end": b_end,
                    "count": int(counts[i]),
                    "percentage": round(int(counts[i]) / len(s) * 100, 2)
                })
        except Exception:
            hist_data = []

        numeric_profiles[col] = {
            "name": col,
            "mean": round(float(s.mean()), 2),
            "median": round(float(s.median()), 2),
            "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
            "min": round(float(s.min()), 2),
            "max": round(float(s.max()), 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "skewness": round(float(s.skew()), 2) if len(s) > 2 else 0.0,
            "outliers_count": outliers,
            "outliers_pct": round(outliers / len(s) * 100, 2),
            "zero_count": zero_cnt,
            "zero_pct": round(zero_cnt / len(df) * 100, 2),
            "missing_count": missing_cnt,
            "missing_pct": round(missing_cnt / len(df) * 100, 2),
            "histogram": hist_data
        }

    # ─────────────────────────────────────────────────────────────
    # 3. Categorical & Demographic Breakdowns
    # ─────────────────────────────────────────────────────────────
    cat_candidates = ["sec", "qtr", "visit", "relg", "sg", "hhtype", "month", "smonth", "resp_code", "panel"]
    # Add any schema categorical columns
    for c in config.get("categorical_cols", []):
        if c in df.columns and c not in cat_candidates:
            cat_candidates.append(c)

    categorical_breakdowns = {}
    for col in cat_candidates:
        if col not in df.columns:
            continue
        nunique = df[col].nunique()
        if nunique > 40:
            continue
            
        vc = df[col].value_counts(dropna=False).head(12)
        code_map = MOSPI_CODE_LABELS.get(col, {})
        categories = []
        for val, cnt in vc.items():
            if pd.isna(val):
                lbl = "Missing / NA"
            else:
                lbl = code_map.get(val, code_map.get(str(val), str(val)))
            categories.append({
                "value": str(val) if pd.notna(val) else "NA",
                "label": lbl,
                "count": int(cnt),
                "percentage": round(int(cnt) / total_records * 100, 2)
            })
        categorical_breakdowns[col] = {
            "name": col,
            "unique_count": nunique,
            "categories": categories
        }

    # ─────────────────────────────────────────────────────────────
    # 4. Geographic State & District Analysis
    # ─────────────────────────────────────────────────────────────
    state_col = config.get("state_col") or ("st" if "st" in df.columns else None)
    primary_inc = "inc_tot" if "inc_tot" in df.columns else (measure_cols[0] if measure_cols else None)
    primary_exp = "hce_tot" if "hce_tot" in df.columns else (measure_cols[1] if len(measure_cols) > 1 else None)
    
    state_analytics = []
    if state_col and state_col in df.columns:
        agg_dict = {"records": (state_col, "count")}
        if primary_inc and primary_inc in df.columns:
            agg_dict["avg_income"] = (primary_inc, "mean")
            agg_dict["median_income"] = (primary_inc, "median")
        if primary_exp and primary_exp in df.columns:
            agg_dict["avg_expenditure"] = (primary_exp, "mean")
        if "hh_size" in df.columns:
            agg_dict["avg_hh_size"] = ("hh_size", "mean")

        try:
            st_df = df.groupby(state_col).agg(**agg_dict).reset_index()
            st_df["share_pct"] = round(st_df["records"] / total_records * 100, 2)
            for col_k in ["avg_income", "median_income", "avg_expenditure", "avg_hh_size"]:
                if col_k in st_df.columns:
                    st_df[col_k] = st_df[col_k].round(2)
            state_analytics = st_df.sort_values(by="records", ascending=False).to_dict(orient="records")
            # Format state names if integers
            for row in state_analytics:
                row["state_id"] = str(row[state_col])
        except Exception as e:
            print("State agg error:", e)

    # ─────────────────────────────────────────────────────────────
    # 5. Economic & Cross-Tabulations (Rural vs Urban, Income Deciles)
    # ─────────────────────────────────────────────────────────────
    sector_comparison = []
    sec_col = "sec" if "sec" in df.columns else (config.get("urban_rural_col"))
    if sec_col and sec_col in df.columns:
        try:
            sec_agg = {}
            sec_agg["records"] = (sec_col, "count")
            if primary_inc and primary_inc in df.columns:
                sec_agg["avg_income"] = (primary_inc, "mean")
                sec_agg["median_income"] = (primary_inc, "median")
            if primary_exp and primary_exp in df.columns:
                sec_agg["avg_expenditure"] = (primary_exp, "mean")
            if "hh_size" in df.columns:
                sec_agg["avg_hh_size"] = ("hh_size", "mean")
                
            sec_df = df.groupby(sec_col).agg(**sec_agg).reset_index()
            for r in sec_df.to_dict(orient="records"):
                s_val = r[sec_col]
                label = MOSPI_CODE_LABELS.get("sec", {}).get(s_val, f"Sector {s_val}")
                r["sector_name"] = label
                r["percentage"] = round(r["records"] / total_records * 100, 2)
                for k in ["avg_income", "median_income", "avg_expenditure", "avg_hh_size"]:
                    if k in r:
                        r[k] = round(float(r[k]), 2)
                sector_comparison.append(r)
        except Exception:
            pass

    # Income Deciles Breakdown
    income_deciles = []
    if primary_inc and primary_inc in df.columns:
        try:
            valid_inc = df[df[primary_inc].notna()].copy()
            if len(valid_inc) > 50:
                valid_inc["decile"] = pd.qcut(valid_inc[primary_inc], q=5, labels=["D1 (Lowest 20%)", "D2 (20-40%)", "D3 (40-60%)", "D4 (60-80%)", "D5 (Top 20%)"], duplicates='drop')
                dec_agg = {"records": (primary_inc, "count"), "min_income": (primary_inc, "min"), "max_income": (primary_inc, "max"), "avg_income": (primary_inc, "mean")}
                if primary_exp and primary_exp in valid_inc.columns:
                    dec_agg["avg_expenditure"] = (primary_exp, "mean")
                if "hh_size" in valid_inc.columns:
                    dec_agg["avg_hh_size"] = ("hh_size", "mean")
                
                dec_df = valid_inc.groupby("decile").agg(**dec_agg).reset_index()
                for r in dec_df.to_dict(orient="records"):
                    for k in ["min_income", "max_income", "avg_income", "avg_expenditure", "avg_hh_size"]:
                        if k in r and pd.notna(r[k]):
                            r[k] = round(float(r[k]), 2)
                    income_deciles.append(r)
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────
    # 6. Column-by-Column Data Profiler Table
    # ─────────────────────────────────────────────────────────────
    column_profiler = []
    col_roles_map = {}
    if schema and "columns" in schema:
        for c in schema["columns"]:
            col_roles_map[c["name"]] = c.get("semantic_role", "OTHER")

    for col in df.columns:
        s = df[col]
        n_missing = int(s.isna().sum())
        n_unique = int(s.nunique())
        m_pct = round(n_missing / total_records * 100, 2)
        
        # Quality assessment
        if m_pct == 0 and n_unique > 1:
            q_status = "EXCELLENT"
        elif m_pct < 10:
            q_status = "GOOD"
        elif m_pct < 30:
            q_status = "FAIR"
        else:
            q_status = "ATTENTION"
            
        dtype_str = "numeric" if pd.api.types.is_numeric_dtype(s) else ("datetime" if pd.api.types.is_datetime64_any_dtype(s) else "categorical")
        samples = [str(x) for x in s.dropna().head(4).tolist()]
        
        column_profiler.append({
            "name": col,
            "type": dtype_str,
            "semantic_role": col_roles_map.get(col, "MEASURE" if dtype_str == "numeric" else "DIMENSION"),
            "total_count": total_records,
            "non_null_count": total_records - n_missing,
            "missing_count": n_missing,
            "missing_percentage": m_pct,
            "unique_count": n_unique,
            "quality_status": q_status,
            "sample_values": samples,
        })

    return {
        "overview": {
            "total_records": total_records,
            "total_columns": total_columns,
            "file_size_mb": memory_mb,
            "overall_missing_pct": overall_missing_pct,
            "missing_cells_count": missing_cells,
            "duplicate_rows_count": dup_rows,
            "duplicate_rows_pct": dup_rows_pct,
            "weighted_population": weighted_population,
            "numeric_columns_count": len(numeric_cols),
            "categorical_columns_count": total_columns - len(numeric_cols),
        },
        "numeric_profiles": numeric_profiles,
        "categorical_breakdowns": categorical_breakdowns,
        "state_analytics": state_analytics,
        "sector_comparison": sector_comparison,
        "income_deciles": income_deciles,
        "column_profiler": column_profiler,
    }
