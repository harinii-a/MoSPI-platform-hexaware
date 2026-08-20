import React, { useRef, useState } from 'react';
import {
  LayoutDashboard, PieChart, Database, AlertTriangle, Cpu,
  Brain, Network, FileText, BookOpen, Award, GitBranch,
  ClipboardList, Settings, Upload, Layers, Wifi, WifiOff,
  Bell, LogOut, Shield, RefreshCw, ChevronDown
} from 'lucide-react';
import { downloadReport } from '../api';

export default function TopNavbar({
  activeTab,
  setActiveTab,
  activeDatasetId,
  datasets,
  onSetActiveDataset,
  onFileUpload,
  isUploading,
  currentUser,
  onLogout,
  onToggleNotifications,
  unreadCount,
  wsConnected,
  summary,
  onRunValidation,
  isValidating
}) {
  const fileInputRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (id) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const navGroups = [
    {
      type: 'link',
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      type: 'dropdown',
      id: 'analytics-group',
      label: 'Dataset Analytics',
      icon: PieChart,
      primaryId: 'analytics',
      items: [
        { id: 'analytics', label: 'Dataset Analytics', icon: PieChart },
        { id: 'overview', label: 'Dataset Overview', icon: BookOpen }
      ]
    },
    {
      type: 'dropdown',
      id: 'validation-group',
      label: 'Validation',
      icon: AlertTriangle,
      primaryId: 'validation',
      items: [
        { id: 'validation', label: 'Validation', icon: AlertTriangle },
        { id: 'anomalies', label: 'Anomalies', icon: Cpu },
        { id: 'clusters', label: 'Clusters', icon: Network },
        { id: 'explainai', label: 'Explainable AI', icon: Brain }
      ]
    },
    {
      type: 'link',
      id: 'datasets',
      label: 'Datasets',
      icon: Database
    },
    {
      type: 'dropdown',
      id: 'reports-group',
      label: 'Reports',
      icon: FileText,
      primaryId: 'reports',
      align: 'right',
      items: [
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'audit', label: 'Audit Logs', icon: ClipboardList }
      ]
    },
    {
      type: 'dropdown',
      id: 'system-group',
      label: 'System',
      icon: Layers,
      primaryId: 'rules',
      align: 'right',
      items: [
        { id: 'rules', label: 'Rules', icon: BookOpen },
        { id: 'evaluation', label: 'Evaluation', icon: Award },
        { id: 'roadmap', label: 'Roadmap', icon: GitBranch }
      ]
    },
    {
      type: 'link',
      id: 'settings',
      label: 'Settings',
      icon: Settings
    }
  ];

  const isGroupActive = (group) => {
    if (group.type === 'link') {
      return activeTab === group.id;
    }
    return group.items.some(item => item.id === activeTab);
  };


  const activeDataset = datasets?.find((d) => d.dataset_id === activeDatasetId);

  return (
    <header className="w-full bg-white border-b-2 border-slate-900 shadow-sketch select-none sticky top-0 z-30">
      {/* ─── Top Tier: Brand, Active Dataset, Actions, User ───────── */}
      <div className="max-w-[1700px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-sketch-sm">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-slate-900 text-base tracking-tight leading-none">
                MoSPI Survey Intelligence
              </h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                wsConnected ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {wsConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {wsConnected ? 'Live v2.0' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              Government of India • Ministry of Statistics & Programme Implementation
            </p>
          </div>
        </div>

        {/* Right: Dataset Selector, Validation, Upload, Notifications, User */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Active Dataset Dropdown */}
          {datasets && datasets.length > 0 && (() => {
            const uniqueDatasets = [];
            const seenIds = new Set();
            for (const d of datasets) {
              if (d && !seenIds.has(d.dataset_id)) {
                seenIds.add(d.dataset_id);
                uniqueDatasets.push(d);
              }
            }
            return (
              <div className="flex flex-col items-start gap-1">
                <div className="relative flex items-center">
                  <Layers className="w-3.5 h-3.5 text-blue-600 absolute left-3 pointer-events-none" />
                  <select
                    value={activeDatasetId || ''}
                    onChange={(e) => onSetActiveDataset(e.target.value)}
                    className="pl-8 pr-7 py-2 bg-blue-50 hover:bg-blue-100/70 border-2 border-slate-900 text-xs font-black rounded-xl text-slate-900 focus:outline-none cursor-pointer shadow-sketch-sm max-w-[210px] truncate transition-colors"
                    title="Switch Active Survey Dataset"
                  >
                    {uniqueDatasets.filter((d) => !d.is_historical).map((d) => {
                      const isActive = d.dataset_id === activeDatasetId;
                      return (
                        <option key={d.dataset_id} value={d.dataset_id}>
                          {isActive ? '✓ ' : ''}{d.filename} ({(d.total_records || 0).toLocaleString()} rec)
                        </option>
                      );
                    })}
                  </select>
                </div>
                {activeDataset?.description && (
                  <span className="text-[10px] font-semibold text-slate-500 max-w-[210px] truncate leading-none px-1" title={activeDataset.description}>
                    {activeDataset.description}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Quick Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-transform active:translate-y-0.5 cursor-pointer disabled:opacity-60"
            title="Upload New Survey CSV / XLSX"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
          </button>

          {/* Run Validation Action */}
          {onRunValidation && activeDatasetId && (
            <button
              onClick={onRunValidation}
              disabled={isValidating}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-transform active:translate-y-0.5 cursor-pointer disabled:opacity-60"
              title="Execute Validation Pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isValidating ? 'Running...' : 'Validate'}</span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={onToggleNotifications}
            className="relative flex items-center justify-center w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-slate-900 transition-colors cursor-pointer shadow-sketch-sm"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
            <div className="text-right hidden md:block">
              <span className="text-xs font-black text-slate-900 block leading-tight">
                {currentUser?.name || 'Dr. Rajesh Kumar'}
              </span>
              <span className="text-[10px] font-black text-purple-700 uppercase">
                {currentUser?.role || 'ADMIN'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center justify-center w-9 h-9 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border-2 border-slate-900 transition-colors cursor-pointer shadow-sketch-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Bottom Tier: Horizontal Navigation Tabs Bar ─────────── */}
      <nav className="max-w-[1200px] mx-auto px-6 overflow-visible w-full">
        <div className="flex items-center justify-between py-2.5 w-full">
          {navGroups.map((group) => {
            if (group.type === 'link') {
              const Icon = group.icon;
              const isActive = activeTab === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveTab(group.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm translate-y-[-1px]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{group.label}</span>
                </button>
              );
            }

            const Icon = group.icon;
            const isActive = isGroupActive(group);
            const isDropdownOpen = activeDropdown === group.id;

            return (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(group.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => {
                    setActiveTab(group.primaryId);
                    setActiveDropdown(null);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm translate-y-[-1px]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180 text-white' : (isActive ? 'text-white' : 'text-slate-400')}`} />
                </button>

                {isDropdownOpen && (
                  <div className={`absolute ${group.align === 'right' ? 'right-0' : 'left-0'} top-full pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150`}>
                    <div className="bg-white border-2 border-slate-900 rounded-xl p-1.5 shadow-sketch min-w-[180px]">
                      {group.items.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setActiveTab(subItem.id);
                              setActiveDropdown(null);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-black text-left transition-all cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-50 text-blue-800'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

    </header>
  );
}
