import React, { useState, useEffect, useCallback } from 'react';
import { datasetApi, auditApi, WS_URL } from './api';
import LoginPage from './components/LoginPage';
import TopNavbar from './components/TopNavbar';
import KpiCards from './components/KpiCards';
import ChartsSection from './components/ChartsSection';
import FlaggedRecordsTable from './components/FlaggedRecordsTable';
import DriftSection from './components/DriftSection';
import EnumeratorSection from './components/EnumeratorSection';
import ClusterAnalysisCard from './components/ClusterAnalysisCard';
import LiveFeedSection from './components/LiveFeedSection';
import AuditTrailSection from './components/AuditTrailSection';
import ExplainableAIPanel from './components/ExplainableAIPanel';
import NotificationPanel from './components/NotificationPanel';
import EvaluationSection from './components/EvaluationSection';
import DatasetsPage from './components/DatasetsPage';
import DatasetAnalyticsPage from './components/DatasetAnalyticsPage';
import DatasetOverviewPage from './components/DatasetOverviewPage';
import RulesPage from './components/RulesPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import UsersPage from './components/UsersPage';
import HsdTrainingSection from './components/HsdTrainingSection';
import RoadmapSection from './components/RoadmapSection';

function App() {
  // Auth state (persisted to localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('mospi_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('mospi_token'));

  // Active dataset (persisted to localStorage)
  const [activeDatasetId, setActiveDatasetId] = useState(() => localStorage.getItem('mospi_active_dataset'));
  const [datasets, setDatasets] = useState([]);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  // Dynamic Summary State (from active dataset)
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch datasets list
  const fetchDatasets = useCallback(async () => {
    try {
      const res = await datasetApi.list();
      setDatasets(res.data);
      // Auto-set active if none selected
      if (!activeDatasetId && res.data.length > 0) {
        const active = res.data.find(d => d.is_active) || res.data[0];
        handleSetActiveDataset(active.dataset_id);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    }
  }, [activeDatasetId]);

  // Fetch summary for active dataset
  const fetchSummary = useCallback(async () => {
    if (!activeDatasetId) return;
    setLoading(true);
    try {
      const res = await datasetApi.summary(activeDatasetId);
      setResult(res.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [activeDatasetId]);

  // Load data on login and dataset change
  useEffect(() => {
    if (!currentUser) return;
    fetchDatasets();
  }, [currentUser, fetchDatasets]);

  useEffect(() => {
    if (!currentUser || !activeDatasetId) return;
    fetchSummary();
  }, [currentUser, activeDatasetId, fetchSummary]);

  // WebSocket Connection
  useEffect(() => {
    if (!currentUser) return;

    let ws;
    let reconnectTimer;

    const connectWS = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DATASET_UPLOADED' || data.type === 'VALIDATION_COMPLETED') {
            fetchDatasets();
            if (data.dataset_id === activeDatasetId) {
              fetchSummary();
            }
          }
          if (data.type === 'RECORD_REVIEWED' && data.dataset_id === activeDatasetId) {
            fetchSummary();
          }
          if (data.notifications) {
            setUnreadCount(data.notifications.filter((n) => !n.read).length);
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [currentUser, activeDatasetId, fetchDatasets, fetchSummary]);

  // Poll unread notification count
  useEffect(() => {
    if (!currentUser) return;
    const fetchCount = async () => {
      try {
        const res = await auditApi.notifications(activeDatasetId);
        setUnreadCount(res.data.filter((n) => !n.read).length);
      } catch (_) {}
    };
    fetchCount();
    const id = setInterval(fetchCount, 10000);
    return () => clearInterval(id);
  }, [currentUser, activeDatasetId]);

  const handleLogin = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('mospi_user', JSON.stringify(user));
    localStorage.setItem('mospi_token', token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setResult(null);
    setActiveTab('dashboard');
    localStorage.removeItem('mospi_user');
    localStorage.removeItem('mospi_token');
    localStorage.removeItem('mospi_active_dataset');
  };

  const handleSetActiveDataset = async (datasetId) => {
    setActiveDatasetId(datasetId);
    localStorage.setItem('mospi_active_dataset', datasetId);
    try {
      await datasetApi.activate(datasetId);
    } catch (_) {}
    setResult(null);  // Clear stale data
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await datasetApi.upload(formData);
      const newId = res.data.dataset_id;
      await handleSetActiveDataset(newId);
      await fetchDatasets();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload dataset. Check file format (CSV/XLSX).');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunValidation = async () => {
    if (!activeDatasetId) return;
    setIsValidating(true);
    try {
      const res = await datasetApi.validate(activeDatasetId);
      setResult(res.data);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setTimeout(() => setIsValidating(false), 800);
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col bg-[#f4f6fa] min-h-screen text-slate-800 font-sans antialiased">
      <TopNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDatasetId={activeDatasetId}
        datasets={datasets}
        onSetActiveDataset={handleSetActiveDataset}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        unreadCount={unreadCount}
        wsConnected={wsConnected}
        summary={result}
        onRunValidation={handleRunValidation}
        isValidating={isValidating}
      />

      <main className="flex-1 max-w-[1700px] w-full mx-auto p-6 md:p-8 overflow-y-auto">

        {/* No Active Dataset */}
        {!activeDatasetId && activeTab === 'dashboard' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-blue-100 border-2 border-slate-900 flex items-center justify-center mb-4 shadow-sketch">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="font-black text-slate-900 text-xl mb-2">No Dataset Loaded</h3>
            <p className="text-sm font-bold text-slate-500 text-center max-w-md">
              Upload a MoSPI survey dataset (CSV or XLSX) to begin automatic schema detection,
              validation, anomaly analysis, and reporting.
            </p>
          </div>
        )}

        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && activeDatasetId && (
          <div className="space-y-6">
            {loading && !result ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="ml-3 font-bold text-slate-600">Analyzing dataset...</span>
              </div>
            ) : (
              <>
                <KpiCards summary={result} />
                <ChartsSection summary={result} />
                <ClusterAnalysisCard summary={result} datasetId={activeDatasetId} />
                <FlaggedRecordsTable summary={result} datasetId={activeDatasetId} />
                <EnumeratorSection summary={result} datasetId={activeDatasetId} />
                <DriftSection summary={result} />
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && activeDatasetId && (
          <DatasetAnalyticsPage
            activeDatasetId={activeDatasetId}
            activeDatasetMeta={datasets.find((d) => d.dataset_id === activeDatasetId) || result?.dataset_meta}
          />
        )}

        {activeTab === 'datasets' && (
          <DatasetsPage
            datasets={datasets}
            activeDatasetId={activeDatasetId}
            onSetActive={handleSetActiveDataset}
            onRefresh={fetchDatasets}
            onUpload={handleFileUpload}
          />
        )}

        {activeTab === 'livefeed' && (
          <LiveFeedSection datasetId={activeDatasetId} summary={result} />
        )}

        {activeTab === 'validation' && activeDatasetId && (
          <div className="space-y-6">
            <KpiCards summary={result} />
            <FlaggedRecordsTable summary={result} datasetId={activeDatasetId} />
          </div>
        )}

        {activeTab === 'anomalies' && activeDatasetId && (
          <div className="space-y-6">
            <KpiCards summary={result} />
            <ChartsSection summary={result} />
            <FlaggedRecordsTable summary={result} datasetId={activeDatasetId} />
          </div>
        )}

        {activeTab === 'explainai' && activeDatasetId && (
          <ExplainableAIPanel summary={result} datasetId={activeDatasetId} />
        )}

        {activeTab === 'clusters' && activeDatasetId && (
          <div className="space-y-6">
            <ClusterAnalysisCard summary={result} datasetId={activeDatasetId} />
          </div>
        )}

        {activeTab === 'enumerators' && activeDatasetId && (
          <div className="space-y-6">
            <EnumeratorSection summary={result} datasetId={activeDatasetId} />
          </div>
        )}

        {activeTab === 'drift' && activeDatasetId && (
          <div className="space-y-6">
            <DriftSection summary={result} />
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsPage datasetId={activeDatasetId} summary={result} />
        )}

        {activeTab === 'rules' && (
          <RulesPage datasetId={activeDatasetId} summary={result} />
        )}

        {activeTab === 'evaluation' && activeDatasetId && (
          <EvaluationSection datasetId={activeDatasetId} />
        )}

        {activeTab === 'training' && (
          <HsdTrainingSection />
        )}

        {activeTab === 'roadmap' && (
          <RoadmapSection />
        )}

        {activeTab === 'audit' && (
          <AuditTrailSection datasetId={activeDatasetId} />
        )}

        {activeTab === 'users' && (
          <UsersPage currentUser={currentUser} />
        )}

        {activeTab === 'overview' && (
          <DatasetOverviewPage
            activeDatasetId={activeDatasetId}
            activeDatasetMeta={datasets.find((d) => d.dataset_id === activeDatasetId) || result?.dataset_meta}
            summary={result}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage datasetId={activeDatasetId} />
        )}
      </main>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        datasetId={activeDatasetId}
      />
    </div>
  );
}

export default App;
