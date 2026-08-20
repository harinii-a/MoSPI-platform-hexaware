import React, { useState, useRef } from 'react';
import { Database, Upload, CheckCircle2, Layers, Trash2, ArrowRight, RefreshCw, Sparkles, FileText, History } from 'lucide-react';
import SchemaConfigPanel from './SchemaConfigPanel';
import { datasetApi } from '../api';

export default function DatasetsPage({ datasets, activeDatasetId, onSetActive, onRefresh, onUpload }) {
  const [selectedDatasetId, setSelectedDatasetId] = useState(activeDatasetId);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'schema'
  const [isHistoricalUpload, setIsHistoricalUpload] = useState(false);
  const [uploadingHist, setUploadingHist] = useState(false);

  const fileInputRef = useRef(null);
  const histInputRef = useRef(null);

  const [editingDatasetId, setEditingDatasetId] = useState(null);
  const [editDescriptionVal, setEditDescriptionVal] = useState('');

  const handleStartEdit = (id, currentDesc) => {
    setEditingDatasetId(id);
    setEditDescriptionVal(currentDesc || '');
  };

  const handleCancelEdit = () => {
    setEditingDatasetId(null);
    setEditDescriptionVal('');
  };

  const handleSaveEdit = async (id) => {
    try {
      await datasetApi.updateMetadata(id, { description: editDescriptionVal.trim() });
      setEditingDatasetId(null);
      setEditDescriptionVal('');
      onRefresh();
    } catch (err) {
      console.error('Failed to update description:', err);
    }
  };

  const handleSetDataset = (id) => {
    setSelectedDatasetId(id);
    onSetActive(id);
  };

  const handleHistoricalFile = async (e) => {
    if (!e.target.files || !e.target.files[0] || !selectedDatasetId) return;
    setUploadingHist(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await datasetApi.uploadHistorical(formData, selectedDatasetId);
      onRefresh();
      alert('Historical baseline dataset uploaded and linked!');
    } catch (err) {
      console.error('Historical upload failed:', err);
      alert('Failed to upload historical baseline.');
    } finally {
      setUploadingHist(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await datasetApi.delete(id);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900">Survey Datasets & Workspaces</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Manage active MoSPI survey datasets, review auto-profiled schemas, and attach historical baselines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs font-black text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'list'
              ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          All Datasets ({datasets.length})
        </button>

        {selectedDatasetId && (
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'schema'
                ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Schema & Role Mapping
          </button>
        )}
      </div>

      {activeSubTab === 'list' && (
        <div className="space-y-6">
          {/* Datasets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {datasets.map((d) => {
              const isActive = d.dataset_id === activeDatasetId;

              return (
                <div
                  key={d.dataset_id}
                  className={`bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch transition-all flex flex-col justify-between ${
                    isActive ? 'ring-4 ring-blue-400 bg-blue-50/20' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black border-2 border-slate-900 shadow-sketch-sm">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm truncate max-w-[150px] block leading-snug" title={d.filename}>
                            {d.filename}
                          </h4>
                          {editingDatasetId === d.dataset_id ? (
                            <div className="flex items-center gap-1.5 my-0.5">
                              <input
                                type="text"
                                value={editDescriptionVal}
                                onChange={(e) => setEditDescriptionVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(d.dataset_id);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                onBlur={() => handleSaveEdit(d.dataset_id)}
                                className="text-[10px] font-medium border-2 border-slate-900 rounded-md px-1.5 py-0.5 bg-slate-50 focus:outline-none max-w-[110px]"
                                autoFocus
                              />
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault(); // prevent blur before click
                                  handleSaveEdit(d.dataset_id);
                                }}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault(); // prevent blur before click
                                  handleCancelEdit();
                                }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                                title="Cancel"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleStartEdit(d.dataset_id, d.description)}
                              className="flex items-center gap-1.5 my-0.5 cursor-pointer group/desc"
                              title="Click to edit description"
                            >
                              <span 
                                className={`text-[10px] font-bold truncate max-w-[120px] block ${
                                  d.description ? 'text-slate-500' : 'text-slate-400 italic'
                                }`}
                              >
                                {d.description || "No description ✏️"}
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold block">
                            ID: {d.dataset_id}
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-900 shadow-sketch-sm">
                          Active
                        </span>
                      ) : d.is_historical ? (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-900">
                          Historical
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t-2 border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Records</span>
                        <span className="text-sm font-black text-slate-900">{d.total_records?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Variables</span>
                        <span className="text-sm font-black text-slate-900">{d.total_columns || 0}</span>
                      </div>
                    </div>

                    <p className="text-[10px] font-semibold text-slate-400">
                      Uploaded {new Date(d.uploaded_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-4 border-t-2 border-slate-100 mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!isActive && !d.is_historical && (
                        <button
                          onClick={() => handleSetDataset(d.dataset_id)}
                          className="text-[11px] font-black px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl border border-slate-900 shadow-sketch-sm cursor-pointer"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedDatasetId(d.dataset_id); setActiveSubTab('schema'); }}
                        className="text-[11px] font-black px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-900 shadow-sketch-sm cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(d.dataset_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historical Baseline Upload Section */}
          <div className="bg-indigo-50/70 rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center border-2 border-slate-900 shadow-sketch-sm">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Upload Historical Baseline Dataset</h4>
                <p className="text-xs font-bold text-slate-600">
                  Link a historical survey benchmark to the active dataset for automated trend and drift analysis
                </p>
              </div>
            </div>

            <div>
              <input
                type="file"
                ref={histInputRef}
                onChange={handleHistoricalFile}
                accept=".csv,.xlsx"
                className="hidden"
              />
              <button
                onClick={() => histInputRef.current?.click()}
                disabled={uploadingHist || !selectedDatasetId}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingHist ? 'Uploading Baseline...' : 'Attach Historical Baseline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'schema' && selectedDatasetId && (
        <SchemaConfigPanel datasetId={selectedDatasetId} onConfigSaved={onRefresh} />
      )}
    </div>
  );
}
