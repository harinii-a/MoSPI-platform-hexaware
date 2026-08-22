# MoSPI Survey Intelligence Platform

> An intelligent survey-data platform that combines automated validation, machine learning, risk scoring, and explainable insights to improve the quality and reliability of large-scale survey datasets.

## 📌 Overview

The **MoSPI Survey Intelligence Platform** is a full-stack data intelligence system designed to improve the **quality, reliability, and transparency of large-scale survey data processing**.

Traditional survey data validation often depends heavily on manual inspection and predefined checks, making it difficult to identify complex anomalies, inconsistent responses, suspicious records, and changes in data patterns. This platform addresses these challenges by combining **rule-based validation, statistical analysis, machine learning, risk scoring, and explainable AI** into a unified workflow.

The system allows survey datasets to be **uploaded, profiled, validated, analyzed, and monitored automatically**. It identifies potential data-quality issues and provides meaningful insights that help analysts focus on records and patterns that require further investigation.

Rather than simply determining whether a record is valid or invalid, the platform aims to answer:

- **Why is this record suspicious?**
- **What type of issue was detected?**
- **How significant is the associated risk?**
- **What action may be required?**

---

## 🎯 Key Objectives

- Improve the reliability and consistency of survey datasets
- Reduce the effort required for manual data validation
- Detect anomalies that may not be captured by simple validation rules
- Identify unusual patterns across datasets and enumerators
- Provide explainable risk scores for suspicious records
- Monitor dataset changes and detect data drift
- Generate structured reports for analysis and decision-making
- Provide a centralized platform for survey data quality management

---

## 🚀 Features

### 📂 Dataset Management

- Upload and manage survey datasets
- View available datasets
- Activate and configure datasets
- View dataset schemas and metadata
- Validate uploaded datasets

### 🔍 Automated Data Validation

- Detect missing values
- Identify invalid values and ranges
- Detect duplicate records
- Perform schema validation
- Run configurable integrity checks

### 📊 Dataset Analytics

- Generate statistical summaries
- Analyze data distributions
- Visualize dataset characteristics
- Explore record-level information

### 🤖 Machine Learning Anomaly Detection

- Detect potentially unusual records
- Identify anomalies that may not be captured by predefined rules
- Combine statistical and ML-based analysis

### 📈 Dataset Drift Detection

- Compare dataset characteristics
- Identify changes in distributions
- Detect potential shifts in survey data patterns

### 👥 Enumerator Analysis

- Analyze enumerator-level patterns
- Identify unusual enumerator behavior
- Support quality monitoring across survey collection

### ⚠️ Risk Scoring

- Calculate record-level risk
- Combine multiple detected issues
- Prioritize suspicious records for investigation

### 🧠 Explainable AI

- Provide reasons behind detected anomalies
- Explain risk factors
- Help analysts understand why a record was flagged

### 📄 Report Generation

Generate reports in:

- PDF
- CSV
- JSON

### 🔐 Authentication & Authorization

- User authentication
- Role-based access
- Permission management
- Protected API endpoints

### ⚙️ Configurable Rules

- Create validation rules
- Update existing rules
- Delete rules
- Apply dataset-specific validation logic

---

## 🔍 How It Works

The platform follows a multi-stage data intelligence pipeline:

```text
                    Survey Dataset
                          │
                          ▼
                 Dataset Profiling
                          │
                          ▼
             Schema & Integrity Validation
                          │
                          ▼
                Statistical Analysis
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     ML Anomaly Detection      Enumerator Analysis
              │                       │
              └───────────┬───────────┘
                          ▼
                  Drift Detection
                          │
                          ▼
                     Risk Engine
                          │
                          ▼
               Explainable Insights
                          │
                          ▼
              Reports & Visualization
```

Each stage contributes different information to the overall assessment, allowing the platform to combine **deterministic validation rules with data-driven intelligence**.

---

## 🤖 Intelligence Layer

### Rule-Based Validation

Predefined rules identify structural and logical inconsistencies such as missing values, invalid ranges, duplicate records, and other data integrity issues.

### Statistical Analysis

Statistical techniques help understand data distributions and identify unusual values and patterns that deviate from expected behavior.

### Machine Learning

Machine learning is used to identify potentially anomalous records that may not be detected through manually defined validation rules.

### Risk Engine

The risk engine combines detected issues and analysis results to generate a risk assessment, helping prioritize records that require further investigation.

### Explainable AI

The platform provides supporting reasons behind detected anomalies and risk scores, making the results easier for analysts to understand and verify.

### Dataset Drift Detection

The system analyzes changes in dataset characteristics and distributions to identify potential shifts in survey data patterns.

---

## 📊 Platform Capabilities

The platform provides a centralized interface for:

```text
Dataset Management
        ↓
Data Validation
        ↓
Data Quality Analytics
        ↓
Anomaly Detection
        ↓
Enumerator Analysis
        ↓
Risk Assessment
        ↓
Explainable AI
        ↓
Drift Monitoring
        ↓
Report Generation
```

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Axios

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic

### Data & Machine Learning

- Pandas
- NumPy
- Scikit-learn
- SciPy
- Joblib

### Authentication

- Python-JOSE
- JWT-based authentication

### Reporting

- ReportLab

---

## 📁 Project Structure

```text
MoSPI-platform-hexaware/
│
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── dataset_manager.py
│   ├── dataset_analytics.py
│   ├── schema_engine.py
│   ├── risk_engine.py
│   ├── drift.py
│   ├── enumerator.py
│   ├── ml.py
│   ├── rules.py
│   ├── report.py
│   ├── verify_platform.py
│   └── requirements.txt
│
├── data/
│   ├── datasets/
│   ├── reports/
│   └── models/
│
├── frontend/
│   └── app/
│       ├── src/
│       │   ├── components/
│       │   ├── App.jsx
│       │   └── api.js
│       ├── public/
│       ├── package.json
│       ├── package-lock.json
│       └── vite.config.js
│
└── .gitignore
```

---

## ⚙️ Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/harinii-a/MoSPI-platform-hexaware.git
cd MoSPI-platform-hexaware
```

### 2. Setup the Backend

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the FastAPI server:

```bash
cd backend
uvicorn main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

### 3. Setup the Frontend

Open another terminal:

```bash
cd frontend/app
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the URL provided by Vite, usually:

```text
http://localhost:5173
```

---

## 🔄 Application Architecture

```text
                 ┌─────────────────────┐
                 │   React Frontend     │
                 │      + Vite          │
                 └──────────┬──────────┘
                            │
                       REST / WebSocket
                            │
                            ▼
                 ┌─────────────────────┐
                 │   FastAPI Backend    │
                 │      + Uvicorn       │
                 └──────────┬──────────┘
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
      Data Validation   ML Analysis     Risk Engine
            │               │                │
            └───────────────┼────────────────┘
                            ▼
                 ┌─────────────────────┐
                 │   Data & Reports    │
                 └─────────────────────┘
```

---

## 🔄 Data Processing Flow

```text
Raw Survey Dataset
        │
        ▼
     Upload
        │
        ▼
 Dataset Profiling
        │
        ▼
 Schema Validation
        │
        ▼
 Integrity Checks
        │
        ├───────────────┐
        ▼               ▼
 Statistical       ML Anomaly
  Analysis         Detection
        │               │
        └───────┬───────┘
                ▼
        Risk Calculation
                │
                ▼
       Explainable Results
                │
                ▼
      Visualization & Reports
```

---

## 🌐 Deployment

The application can be deployed as separate frontend and backend services.

### Frontend

```text
React + Vite
      ↓
   Vercel
```

### Backend

```text
FastAPI + Uvicorn
      ↓
 Cloud Hosting
```

The frontend communicates with the FastAPI backend through REST APIs and WebSockets.

---

## 💡 Why It Matters

For large-scale survey systems, data quality is critical because inaccurate, inconsistent, or suspicious data can affect downstream analysis and decision-making.

By combining **automation, statistical methods, machine learning, risk scoring, and explainability**, the platform helps transform raw survey datasets into **actionable and trustworthy data intelligence**.

The goal is not just to detect problems, but to help analysts **understand, prioritize, and investigate those problems efficiently**.

---

## 🎯 Use Cases

The platform can support:

- Survey data quality assessment
- Record-level anomaly identification
- Enumerator monitoring
- Dataset comparison
- Data integrity verification
- Risk-based investigation
- Automated reporting
- Survey dataset monitoring
- Data quality improvement workflows

---

## 🔮 Future Enhancements

Potential future improvements include:

- Persistent cloud storage for uploaded datasets
- Database-backed dataset management
- Advanced ML models for anomaly detection
- Real-time monitoring dashboards
- Automated alerts for high-risk records
- Advanced role and permission management
- Integration with external survey systems
- Scalable cloud-based data processing

---

## 🏆 Project Highlights

- Full-stack application
- REST API architecture
- Machine learning integration
- Automated data quality analysis
- Explainable risk assessment
- Dataset drift monitoring
- Interactive analytics dashboard
- Automated report generation
- Authentication and authorization

---

## 👩‍💻 Developed For

### Hexaware Hackathon

**MoSPI Survey Intelligence Platform**

Built using **React, FastAPI, Python, Data Analytics, and Machine Learning**.

---

## 📄 License

This project is developed as part of a hackathon project and is intended for educational and demonstration purposes.
