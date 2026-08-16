"""
Comprehensive Verification Script for MoSPI Survey Intelligence Platform
Tests all backend modules and end-to-end pipeline.
"""
import os
import sys
import io
import json
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from auth import user_store
from dataset_manager import dataset_store

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("MoSPI Survey Intelligence Platform Verification Suite")
    print("=" * 60)

    # 1. Health & Root
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("[PASS] 1. Root & Health Check OK:", res.json())

    # 2. Authentication Test
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["token"]
    user = login_res.json()["user"]
    assert user["role"] == "ADMIN", "Role should be ADMIN"
    headers = {"Authorization": token}
    print(f"[PASS] 2. Auth Login OK: User '{user['name']}' ({user['role']})")

    # 3. Create a Generic Multi-domain Survey Sample
    sample_data = {
        "record_id": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
        "state_name": ["Tamil Nadu"] * 6 + ["Kerala"] * 6,
        "district_code": ["Erode", "Erode", "Salem", "Salem", "Coimbatore", "Coimbatore", "Kochi", "Kochi", "Kollam", "Kollam", "Kannur", "Kannur"],
        "enumerator_id": ["E01", "E01", "E02", "E02", "E03", "E03", "E04", "E04", "E05", "E05", "E01", "E01"],
        "respondent_age": [28, 35, 14, 42, 50, 19, 31, 62, 45, 29, 38, 55],
        "emp_status": ["Employed", "Employed", "Employed", "Unemployed", "Employed", "Student", "Employed", "Retired", "Employed", "Employed", "Employed", "Employed"],
        "weekly_hours": [40, 48, 45, 0, 120, 0, 38, 0, 42, 50, 40, 44],
        "monthly_income": [25000, 32000, 8000, 0, 120000, 0, 28000, 15000, 30000, 31000, 29000, 35000],
    }
    sample_df = pd.DataFrame(sample_data)
    csv_bytes = sample_df.to_csv(index=False).encode('utf-8')

    # 4. Upload Generic Dataset
    files = {"file": ("generic_survey_2026.csv", io.BytesIO(csv_bytes), "text/csv")}
    upload_res = client.post("/api/v1/datasets/upload", files=files, headers=headers)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    dataset_id = upload_res.json()["dataset_id"]
    print(f"[PASS] 3. Dataset Upload OK: Dataset ID '{dataset_id}' ({upload_res.json()['metadata']['total_records']} records)")

    # 5. Schema Discovery Check
    schema_res = client.get(f"/api/v1/datasets/{dataset_id}/schema", headers=headers)
    assert schema_res.status_code == 200, "Schema retrieval failed"
    schema = schema_res.json()
    print(f"[PASS] 4. Schema Auto-Discovery OK: Detected {schema['total_columns']} columns. Roles:", schema['detected_roles'])

    # 6. Run Validation Pipeline
    val_res = client.post(f"/api/v1/datasets/{dataset_id}/validate", headers=headers)
    assert val_res.status_code == 200, f"Validation failed: {val_res.text}"
    summary = val_res.json()
    print(f"[PASS] 5. Validation Pipeline OK: Total records: {summary['total_records']}, Violations: {summary['integrity_violation_count']}, ML Anomalies: {summary['ml_anomaly_count']}")

    # 7. Explainable AI Inspection
    explain_res = client.get(f"/api/v1/datasets/{dataset_id}/records/0/explanation", headers=headers)
    assert explain_res.status_code == 200, f"Explain failed: {explain_res.text}"
    xai = explain_res.json()
    print(f"[PASS] 6. Explainable AI OK: Record #0 Risk Score: {xai['total_risk_score']}/100, Factors: {len(xai['factors'])}")

    # 8. Supervisor Review Action
    review_res = client.post(
        f"/api/v1/datasets/{dataset_id}/records/0/review",
        json={"status": "APPROVED", "comment": "Verified by Chief Field Officer"},
        headers=headers
    )
    assert review_res.status_code == 200, f"Review failed: {review_res.text}"
    print("[PASS] 7. Supervisor Review OK:", review_res.json())

    # 9. Custom Rule Creation & Execution
    rule_res = client.post(
        "/api/v1/rules",
        json={"field": "monthly_income", "operator": ">", "value": "100000", "severity": "HIGH", "name": "Income outlier limit", "dataset_id": dataset_id},
        headers=headers
    )
    assert rule_res.status_code == 200, "Rule creation failed"
    print("[PASS] 8. Custom Rule Creation OK:", rule_res.json()["name"])

    # 10. Generate PDF Report
    pdf_res = client.post(f"/api/v1/datasets/{dataset_id}/reports/generate?format=pdf", headers=headers)
    assert pdf_res.status_code == 200, f"PDF report failed: {pdf_res.text}"
    assert len(pdf_res.content) > 1000, "PDF content too small"
    print(f"[PASS] 9. PDF Report Generation OK ({len(pdf_res.content)} bytes)")

    # 11. Generate CSV Report
    csv_res = client.post(f"/api/v1/datasets/{dataset_id}/reports/generate?format=csv", headers=headers)
    assert csv_res.status_code == 200, f"CSV report failed: {csv_res.text}"
    print(f"[PASS] 10. CSV Report Generation OK ({len(csv_res.content)} bytes)")

    # 12. Audit Log Verification
    audit_res = client.get(f"/api/v1/audit-log?dataset_id={dataset_id}", headers=headers)
    assert audit_res.status_code == 200, "Audit log failed"
    print(f"[PASS] 11. Audit Log OK: {len(audit_res.json())} entries recorded")

    # 13. Evaluation Metrics Verification
    eval_res = client.get(f"/api/v1/datasets/{dataset_id}/evaluation", headers=headers)
    assert eval_res.status_code == 200, "Evaluation failed"
    print("[PASS] 12. Evaluation Engine OK:", eval_res.json())

    # 14. Dataset Analytics Verification
    analytics_res = client.get(f"/api/v1/datasets/{dataset_id}/analytics", headers=headers)
    assert analytics_res.status_code == 200, "Analytics failed"
    analytics_data = analytics_res.json()
    assert "overview" in analytics_data, "Missing overview in analytics"
    assert "numeric_profiles" in analytics_data, "Missing numeric_profiles in analytics"
    print(f"[PASS] 13. Dataset Analytics OK: {len(analytics_data['numeric_profiles'])} numeric variables profiled, overview verified")

    print("=" * 60)
    print("ALL 13 PLATFORM SUITE TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
