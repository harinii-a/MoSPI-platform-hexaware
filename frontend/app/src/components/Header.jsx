import React from 'react';
import { Download, FileText, CheckCircle2, RefreshCw, Bell, Layers, Wifi, WifiOff } from 'lucide-react';
import { downloadReport } from '../api';

export default function Header({ activeDatasetId, datasets, onSetActiveDataset, hasData, onRunValidation, isValidating, currentUser, onToggleNotifications, unreadCount, wsConnected, summary }) {

  const activeDataset = datasets?.find(d => d.dataset_id === activeDatasetId);

  return (
    <header className="flex flex-col space-y-4 mb-8 bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-sketch">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Survey <span className="wavy-underline text-blue-600">Intelligence</span>
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 border-slate-900 shadow-sketch-sm ${wsConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {wsConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-600">
            {activeDataset
              ? `Active: ${activeDataset.filename} • ${(summary?.total_records || activeDataset.total_records || 0).toLocaleString()} records • ${activeDataset.total_columns || 0} columns`
              : 'Upload a dataset to begin analysis'
            }
          </p>
        </div>

        {/* Right Side */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dataset Selector */}
          {datasets && datasets.length > 0 && (
            <div className="relative flex items-center">
              <Layers className="w-4 h-4 text-blue-600 absolute left-3.5 pointer-events-none" />
              <select
                value={activeDatasetId || ''}
                onChange={(e) => onSetActiveDataset(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-blue-50 border-2 border-slate-900 text-xs font-black rounded-xl text-slate-900 focus:outline-none cursor-pointer shadow-sketch-sm max-w-[200px] truncate"
              >
                {datasets.filter(d => !d.is_historical).map((d) => (
                  <option key={d.dataset_id} value={d.dataset_id}>
                    {d.filename} ({d.total_records?.toLocaleString()} rec)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Validate Button */}
          <button
            onClick={onRunValidation}
            disabled={isValidating || !activeDatasetId}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Run Validation'}</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onToggleNotifications}
            className="relative flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-slate-900 transition-all cursor-pointer shadow-sketch-sm"
          >
            <Bell className="w-4.5 h-4.5 text-slate-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[10px] font-black w-5 h-5 flex items-center justify-center border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Export CSV */}
          <button
            onClick={() => activeDatasetId && downloadReport(activeDatasetId, 'csv')}
            disabled={!hasData}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => activeDatasetId && downloadReport(activeDatasetId, 'pdf')}
            disabled={!hasData}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>
    </header>
  );
}
