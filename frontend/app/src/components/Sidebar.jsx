import React, { useRef } from 'react';
import { LayoutDashboard, AlertTriangle, Cpu, TrendingUp, UserCheck, Upload, Network, Radio, ClipboardList, Brain, Award, LogOut, PieChart, Database, BookOpen, FileText, Settings, Users, ShieldCheck, GraduationCap, GitBranch } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onFileUpload, isUploading, currentUser, onLogout }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const role = currentUser?.role || 'VIEWER';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: '*' },
    { id: 'analytics', label: 'Dataset Analytics', icon: PieChart, roles: '*' },
    { id: 'datasets', label: 'Datasets', icon: Database, roles: '*' },
    { id: 'validation', label: 'Validation', icon: AlertTriangle, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'anomalies', label: 'Anomalies', icon: Cpu, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'explainai', label: 'Explainable AI', icon: Brain, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'clusters', label: 'Clusters', icon: Network, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'rules', label: 'Rules', icon: BookOpen, roles: ['ADMIN', 'DATA_SUPERVISOR'] },
    { id: 'evaluation', label: 'Evaluation', icon: Award, roles: ['ADMIN', 'DATA_SUPERVISOR', 'ANALYST'] },
    { id: 'roadmap', label: 'Roadmap', icon: GitBranch, roles: '*' },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList, roles: ['ADMIN', 'DATA_SUPERVISOR', 'FIELD_SUPERVISOR'] },
    { id: 'overview', label: 'Dataset Overview', icon: BookOpen, roles: '*' },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'DATA_SUPERVISOR'] },
  ];

  const visibleItems = navItems.filter(item =>
    item.roles === '*' || item.roles.includes(role)
  );

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DATA_SUPERVISOR': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FIELD_SUPERVISOR': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ANALYST': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <aside className="w-64 bg-white border-r-2 border-slate-900 min-h-screen flex flex-col justify-between p-5 select-none shadow-sketch z-10">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-white font-extrabold text-lg shadow-sketch-sm">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-slate-900" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-base leading-tight tracking-tight flex items-center gap-1">
              MoSPI <span className="text-blue-600 font-extrabold">Survey</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold">Intelligence Platform</p>
          </div>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="bg-amber-50/70 border-2 border-slate-900 rounded-xl p-3 mb-5 shadow-sketch-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-900 truncate max-w-[130px]">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-slate-500">{currentUser.department}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${getRoleBadge(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'} ${item.isLive && !isActive ? 'text-emerald-600 animate-pulse' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 border-t-2 border-slate-900 space-y-2.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl border-2 border-slate-900 hover:bg-emerald-600 transition-all duration-150 shadow-sketch-sm cursor-pointer disabled:opacity-50 text-xs"
        >
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Uploading...' : '+ Upload Dataset'}</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-rose-600 font-bold text-xs py-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
