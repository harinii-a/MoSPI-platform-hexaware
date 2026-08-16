"""
Dataset Manager — Handles dataset upload, storage, listing, and active dataset.
Uses in-memory storage with file persistence.
"""
import os
import json
import uuid
import shutil
from datetime import datetime
from typing import Optional, Dict, List, Any

import pandas as pd

from schema_engine import profile_dataset


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data"))
DATASETS_DIR = os.path.join(DATA_DIR, "datasets")
REGISTRY_PATH = os.path.join(DATASETS_DIR, "registry.json")

os.makedirs(DATASETS_DIR, exist_ok=True)


class DatasetStore:
    """Manages all uploaded datasets, their metadata, and active selection."""

    def __init__(self):
        self.datasets: Dict[str, dict] = {}
        self.dataframes: Dict[str, pd.DataFrame] = {}
        self.schemas: Dict[str, dict] = {}
        self.configs: Dict[str, dict] = {}
        self.active_dataset_id: Optional[str] = None
        self._load_registry()

    def _load_registry(self):
        """Load dataset registry from disk."""
        if os.path.exists(REGISTRY_PATH):
            try:
                with open(REGISTRY_PATH, 'r') as f:
                    registry = json.load(f)
                self.datasets = registry.get("datasets", {})
                self.active_dataset_id = registry.get("active_dataset_id")
                # Load dataframes for registered datasets
                for did, meta in list(self.datasets.items()):
                    csv_path = os.path.join(DATASETS_DIR, did, "data.csv")
                    if os.path.exists(csv_path):
                        try:
                            self.dataframes[did] = pd.read_csv(csv_path)
                            # Load schema
                            schema_path = os.path.join(DATASETS_DIR, did, "schema.json")
                            if os.path.exists(schema_path):
                                with open(schema_path, 'r') as f:
                                    self.schemas[did] = json.load(f)
                            # Load config
                            config_path = os.path.join(DATASETS_DIR, did, "config.json")
                            if os.path.exists(config_path):
                                with open(config_path, 'r') as f:
                                    self.configs[did] = json.load(f)
                        except Exception as e:
                            print(f"Warning: Could not load dataset {did}: {e}")
                            del self.datasets[did]
            except Exception as e:
                print(f"Warning: Could not load registry: {e}")

    def _save_registry(self):
        """Save dataset registry to disk."""
        os.makedirs(DATASETS_DIR, exist_ok=True)
        registry = {
            "datasets": self.datasets,
            "active_dataset_id": self.active_dataset_id,
        }
        with open(REGISTRY_PATH, 'w') as f:
            json.dump(registry, f, indent=2, default=str)

    def upload_dataset(self, file_content: bytes, filename: str) -> dict:
        """Upload and process a new dataset."""
        dataset_id = str(uuid.uuid4())[:8]
        dataset_dir = os.path.join(DATASETS_DIR, dataset_id)
        os.makedirs(dataset_dir, exist_ok=True)

        # Detect format and read
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".xlsx":
            import io
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        elif ext == ".csv":
            import io
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            raise ValueError(f"Unsupported file format: {ext}. Use CSV or XLSX.")

        if df.empty:
            raise ValueError("Uploaded dataset is empty.")

        # Save CSV copy
        csv_path = os.path.join(dataset_dir, "data.csv")
        df.to_csv(csv_path, index=False)

        # Profile dataset
        schema = profile_dataset(df)

        # Save schema
        schema_path = os.path.join(dataset_dir, "schema.json")
        with open(schema_path, 'w') as f:
            json.dump(schema, f, indent=2, default=str)

        # Generate auto-config from schema
        config = self._auto_config(schema)
        config_path = os.path.join(dataset_dir, "config.json")
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        # Create metadata
        meta = {
            "dataset_id": dataset_id,
            "filename": filename,
            "format": ext.lstrip('.'),
            "total_records": len(df),
            "total_columns": len(df.columns),
            "uploaded_at": datetime.utcnow().isoformat(),
            "status": "PROFILED",
            "is_historical": False,
        }

        # Store in memory
        self.datasets[dataset_id] = meta
        self.dataframes[dataset_id] = df
        self.schemas[dataset_id] = schema
        self.configs[dataset_id] = config

        # Set as active if first dataset
        if self.active_dataset_id is None:
            self.active_dataset_id = dataset_id

        self._save_registry()

        return {
            "dataset_id": dataset_id,
            "metadata": meta,
            "schema_summary": {
                "total_columns": schema["total_columns"],
                "total_records": schema["total_records"],
                "identifiers": schema["identifiers"],
                "dimensions": schema["dimensions"],
                "measures": schema["measures"],
                "temporal": schema["temporal"],
                "geographic": schema["geographic"],
            },
        }

    def upload_historical(self, file_content: bytes, filename: str, target_dataset_id: str) -> dict:
        """Upload a historical baseline dataset."""
        result = self.upload_dataset(file_content, filename)
        hist_id = result["dataset_id"]
        self.datasets[hist_id]["is_historical"] = True
        self.datasets[hist_id]["baseline_for"] = target_dataset_id

        # Link historical to target
        if target_dataset_id in self.configs:
            self.configs[target_dataset_id]["historical_dataset_id"] = hist_id
            config_path = os.path.join(DATASETS_DIR, target_dataset_id, "config.json")
            with open(config_path, 'w') as f:
                json.dump(self.configs[target_dataset_id], f, indent=2)

        self._save_registry()
        return result

    def _auto_config(self, schema: dict) -> dict:
        """Generate automatic configuration from detected schema."""
        roles = schema.get("detected_roles", {})
        config = {
            "record_id_col": roles.get("RECORD_ID", {}).get("column"),
            "household_id_col": roles.get("HOUSEHOLD_ID", {}).get("column"),
            "person_id_col": roles.get("PERSON_ID", {}).get("column"),
            "enumerator_col": roles.get("ENUMERATOR_ID", {}).get("column"),
            "supervisor_col": roles.get("SUPERVISOR_ID", {}).get("column"),
            "cluster_col": roles.get("CLUSTER_ID", {}).get("column"),
            "state_col": roles.get("STATE", {}).get("column"),
            "district_col": roles.get("DISTRICT", {}).get("column"),
            "geo_cols": schema.get("geographic", []),
            "time_col": roles.get("DATE", {}).get("column") or (schema["temporal"][0] if schema["temporal"] else None),
            "measure_cols": schema.get("measures", []),
            "numeric_cols": schema.get("numeric_columns", []),
            "categorical_cols": schema.get("categorical_columns", []),
            "identifier_cols": schema.get("identifiers", []),
            "weight_col": roles.get("WEIGHT", {}).get("column"),
            "historical_dataset_id": None,
            "risk_weights": {
                "rule": 35,
                "ml": 35,
                "enumerator": 15,
                "cluster": 15,
            },
        }
        return config

    def get_dataset(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Get DataFrame for a dataset."""
        return self.dataframes.get(dataset_id)

    def get_metadata(self, dataset_id: str) -> Optional[dict]:
        """Get metadata for a dataset."""
        return self.datasets.get(dataset_id)

    def get_schema(self, dataset_id: str) -> Optional[dict]:
        """Get schema for a dataset."""
        return self.schemas.get(dataset_id)

    def get_config(self, dataset_id: str) -> Optional[dict]:
        """Get configuration for a dataset."""
        return self.configs.get(dataset_id)

    def update_config(self, dataset_id: str, updates: dict) -> dict:
        """Update configuration for a dataset."""
        if dataset_id not in self.configs:
            self.configs[dataset_id] = {}
        self.configs[dataset_id].update(updates)
        config_path = os.path.join(DATASETS_DIR, dataset_id, "config.json")
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump(self.configs[dataset_id], f, indent=2)
        return self.configs[dataset_id]

    def list_datasets(self) -> List[dict]:
        """List all datasets with metadata."""
        result = []
        for did, meta in self.datasets.items():
            entry = {**meta}
            entry["is_active"] = (did == self.active_dataset_id)
            result.append(entry)
        return sorted(result, key=lambda x: x.get("uploaded_at", ""), reverse=True)

    def set_active(self, dataset_id: str) -> dict:
        """Set the active dataset for the workspace."""
        if dataset_id not in self.datasets:
            raise ValueError(f"Dataset {dataset_id} not found.")
        self.active_dataset_id = dataset_id
        self._save_registry()
        return self.datasets[dataset_id]

    def get_active_id(self) -> Optional[str]:
        """Get the active dataset ID."""
        return self.active_dataset_id

    def delete_dataset(self, dataset_id: str):
        """Delete a dataset."""
        if dataset_id in self.datasets:
            del self.datasets[dataset_id]
        if dataset_id in self.dataframes:
            del self.dataframes[dataset_id]
        if dataset_id in self.schemas:
            del self.schemas[dataset_id]
        if dataset_id in self.configs:
            del self.configs[dataset_id]
        if self.active_dataset_id == dataset_id:
            self.active_dataset_id = next(iter(self.datasets), None)
        # Remove files
        dataset_dir = os.path.join(DATASETS_DIR, dataset_id)
        if os.path.exists(dataset_dir):
            shutil.rmtree(dataset_dir)
        self._save_registry()


# Singleton instance
dataset_store = DatasetStore()
