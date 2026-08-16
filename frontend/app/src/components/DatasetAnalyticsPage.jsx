import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  BarChart3, PieChart as PieIcon, MapPin, Database, Layers,
  TrendingUp, AlertCircle, CheckCircle2, Search, Filter,
  ArrowUpDown, Hash, DollarSign, Users, Activity, Sparkles, RefreshCw
} from 'lucide-react';
import { datasetApi } from '../api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#64748b'];

export default function DatasetAnalyticsPage({ activeDatasetId, activeDatasetMeta }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeSection, setActiveSection] = useState('distributions');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [selectedCatCol, setSelectedCatCol] = useState(null);
  const [columnSearch, setColumnSearch] = useState('');
  const [stateSortCol, setStateSortCol] = useState('records');
  const [stateSortAsc, setStateSortAsc] = useState(false);

  const fetchAnalytics = async () => {
    if (!activeDatasetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await datasetApi.analytics(activeDatasetId);
      setAnalytics(res.data);
      
      // Auto-select first numeric metric
      const numericKeys = Object.keys(res.data?.numeric_profiles || {});
      if (numericKeys.length > 0) {
        setSelectedMetric(numericKeys[0]);
      }
      
      // Auto-select first categorical variable
      const catKeys = Object.keys(res.data?.categorical_breakdowns || {});
      if (catKeys.length > 0) {
        setSelectedCatCol(catKeys[0]);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load dataset analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeDatasetId]);

  const overview = analytics?.overview || {};
  const numericProfiles = analytics?.numeric_profiles || {};
  const categoricalBreakdowns = analytics?.categorical_breakdowns || {};
  const stateAnalytics = analytics?.state_analytics || [];
  const sectorComparison = analytics?.sector_comparison || [];
  const incomeDeciles = analytics?.income_deciles || [];
  const columnProfiler = analytics?.column_profiler || [];

  // Current metric profile
  const currentMetricProfile = selectedMetric ? numericProfiles[selectedMetric] : null;

  // Filtered column profiler
  const filteredColumns = useMemo(() => {
    if (!columnSearch.trim()) return columnProfiler;
    const term = columnSearch.toLowerCase();
    return columnProfiler.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.semantic_role && c.semantic_role.toLowerCase().includes(term)) ||
        c.type.toLowerCase().includes(term)
    );
  }, [columnProfiler, columnSearch]);

  // Sorted state data
  const sortedStates = useMemo(() => {
    return [...stateAnalytics].sort((a, b) => {
      const valA = a[stateSortCol] ?? 0;
      const valB = b[stateSortCol] ?? 0;
      return stateSortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [stateAnalytics, stateSortCol, stateSortAsc]);

  const toggleStateSort = (col) => {
    if (stateSortCol === col) {
      setStateSortAsc(!stateSortAsc);
    } else {
      setStateSortCol(col);
      setStateSortAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-12 shadow-sketch text-center">
        <div className="inline-block animate-spin text-blue-600 mb-4">
          <RefreshCw className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Computing Comprehensive Dataset Analytics...</h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Profiling distributions, geographic rollups, and data quality across {activeDatasetMeta?.total_records?.toLocaleString() || 'all'} records
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-slate-900 rounded-2xl p-8 shadow-sketch text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-900">Unable to load Dataset Analytics</h3>
        <p className="text-xs text-slate-600 font-semibold mt-1">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs border-2 border-slate-900 shadow-sketch-sm hover:bg-blue-700 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Macro Cards ─────────────────────────────────── */}
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg border border-blue-300">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Dataset Intelligence & Statistical Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Deep statistical distributions, microdata profiles, stratification, and quality audit for{' '}
              <span className="font-extrabold text-blue-600">{activeDatasetMeta?.filename || 'Active Dataset'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-800 rounded-xl font-bold text-xs border-2 border-slate-900 hover:bg-slate-200 transition-all shadow-sketch-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Analytics
            </button>
          </div>
        </div>

        {/* Macro KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <div className="bg-blue-50/70 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Sample Size</span>
            </div>
            <p className="text-xl font-black text-slate-900">{overview.total_records?.toLocaleString() || 0}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Records in Survey</p>
          </div>

          <div className="bg-purple-50/70 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Variables</span>
            </div>
            <p className="text-xl font-black text-slate-900">{overview.total_columns || 0}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{overview.numeric_columns_count || 0} numeric, {overview.categorical_columns_count || 0} cat</p>
          </div>

          <div className="bg-emerald-50/70 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completeness</span>
            </div>
            <p className="text-xl font-black text-slate-900">{100 - (overview.overall_missing_pct || 0)}%</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{overview.overall_missing_pct || 0}% Missing Values</p>
          </div>

          <div className="bg-amber-50/70 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Duplicates</span>
            </div>
            <p className="text-xl font-black text-slate-900">{overview.duplicate_rows_count || 0}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{overview.duplicate_rows_pct || 0}% Duplicate Rows</p>
          </div>

          <div className="bg-indigo-50/70 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Population</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              {overview.weighted_population ? `${(overview.weighted_population / 1000000).toFixed(2)}M` : 'N/A'}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Weighted Extrapolated</p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 shadow-sketch-sm">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Memory</span>
            </div>
            <p className="text-xl font-black text-slate-900">{overview.file_size_mb || 0} MB</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">In-Memory Engine</p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t-2 border-slate-100">
          {[
            { id: 'distributions', label: 'Numerical Distributions & IQR', icon: BarChart3 },
            { id: 'demographics', label: 'Stratification & Demographics', icon: PieIcon },
            { id: 'geographic', label: 'State & Regional Rollups', icon: MapPin },
            { id: 'economic', label: 'Economic & Cross-Tabulations', icon: DollarSign },
            { id: 'dictionary', label: 'Data Dictionary & Quality Profiler', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-2 border-slate-900 shadow-sketch-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 1: NUMERICAL DISTRIBUTIONS & HISTOGRAMS ───────── */}
      {activeSection === 'distributions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metric Selector & Stats Card */}
          <div className="space-y-4">
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-sketch">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                Select Numerical Variable
              </label>
              <select
                value={selectedMetric || ''}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sketch-sm"
              >
                {Object.keys(numericProfiles).map((col) => (
                  <option key={col} value={col}>
                    {col} (Mean: {numericProfiles[col].mean?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {currentMetricProfile && (
              <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-sketch space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Statistical Parameters
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md border border-blue-300">
                    {currentMetricProfile.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">Mean</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {currentMetricProfile.mean?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">Median</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {currentMetricProfile.median?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">Std Deviation (σ)</span>
                    <span className="font-bold text-slate-800">
                      {currentMetricProfile.std?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">Skewness</span>
                    <span className="font-bold text-slate-800">
                      {currentMetricProfile.skewness}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">Min / Max</span>
                    <span className="font-bold text-slate-800">
                      {currentMetricProfile.min?.toLocaleString()} - {currentMetricProfile.max?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">IQR (Q1 - Q3)</span>
                    <span className="font-bold text-slate-800">
                      {currentMetricProfile.q1?.toLocaleString()} - {currentMetricProfile.q3?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border-2 border-slate-900 rounded-xl space-y-1.5 shadow-sketch-sm">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-900">Statistical Outliers (1.5x IQR):</span>
                    <span className="font-black text-rose-600">
                      {currentMetricProfile.outliers_count?.toLocaleString()} ({currentMetricProfile.outliers_pct}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-900">Zero Values (0.0):</span>
                    <span className="font-black text-slate-800">
                      {currentMetricProfile.zero_count?.toLocaleString()} ({currentMetricProfile.zero_pct}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-900">Missing Values:</span>
                    <span className="font-black text-slate-800">
                      {currentMetricProfile.missing_count?.toLocaleString()} ({currentMetricProfile.missing_pct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Histogram Chart */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Frequency Distribution Histogram
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    10-Bin frequency density for variable <span className="font-bold text-blue-600">{selectedMetric}</span>
                  </p>
                </div>
              </div>

              {currentMetricProfile?.histogram && currentMetricProfile.histogram.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentMetricProfile.histogram} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="bin_label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(val, name, item) => [`${val.toLocaleString()} records (${item.payload.percentage}%)`, 'Frequency']}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '2px solid #0f172a', fontWeight: 'bold', fontSize: '11px' }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} stroke="#0f172a" strokeWidth={1.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-bold">
                  No histogram distribution data available for this variable.
                </div>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500 mr-2 self-center">Other Measures:</span>
              {Object.keys(numericProfiles).slice(0, 8).map((col) => (
                <button
                  key={col}
                  onClick={() => setSelectedMetric(col)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedMetric === col
                      ? 'bg-blue-600 text-white border-slate-900 shadow-sketch-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: DEMOGRAPHICS & STRATIFICATION ─────────────── */}
      {activeSection === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rural vs Urban Sector Card */}
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch">
              <h3 className="font-black text-slate-900 text-base mb-1 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-600" />
                Sector Stratification (Rural vs Urban)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mb-4">
                Survey distribution across Rural and Urban sectors
              </p>

              {sectorComparison.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorComparison}
                          dataKey="records"
                          nameKey="sector_name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke="#0f172a"
                          strokeWidth={1.5}
                        >
                          {sectorComparison.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#2563eb'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val, name, item) => [`${val.toLocaleString()} records (${item.payload.percentage}%)`, name]}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '2px solid #0f172a', fontWeight: 'bold', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5">
                    {sectorComparison.map((sec, idx) => (
                      <div key={sec.sec} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-black mb-1">
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                            {sec.sector_name}
                          </span>
                          <span>{sec.percentage}%</span>
                        </div>
                        <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 mt-2">
                          <div>Records: <span className="font-bold text-slate-900">{sec.records.toLocaleString()}</span></div>
                          {sec.avg_income && <div>Avg Inc: <span className="font-bold text-slate-900">₹{sec.avg_income.toLocaleString()}</span></div>}
                          {sec.avg_expenditure && <div>Avg Exp: <span className="font-bold text-slate-900">₹{sec.avg_expenditure.toLocaleString()}</span></div>}
                          {sec.avg_hh_size && <div>HH Size: <span className="font-bold text-slate-900">{sec.avg_hh_size}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-bold text-center py-10">
                  No sector classification column detected in this dataset.
                </p>
              )}
            </div>

            {/* Categorical Variable Inspector */}
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-900 text-base">
                  Categorical Breakdown Inspector
                </h3>
                <select
                  value={selectedCatCol || ''}
                  onChange={(e) => setSelectedCatCol(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-900 shadow-sketch-sm"
                >
                  {Object.keys(categoricalBreakdowns).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {selectedCatCol && categoricalBreakdowns[selectedCatCol] ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {categoricalBreakdowns[selectedCatCol].categories.map((cat, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{cat.label}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">Raw Code: {cat.value}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-blue-600 block">{cat.count.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-500">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-bold text-center py-10">
                  No categorical breakdowns available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 3: GEOGRAPHIC & STATE ROLLUPS ────────────────── */}
      {activeSection === 'geographic' && (
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch space-y-6">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              State & Regional Sample Distributions
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Aggregated survey statistics grouped by State / Region
            </p>
          </div>

          {/* Top States Bar Chart */}
          {stateAnalytics.length > 0 && (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateAnalytics.slice(0, 15)} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="state_id" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [val.toLocaleString(), 'Records']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '2px solid #0f172a', fontWeight: 'bold', fontSize: '11px' }}
                  />
                  <Bar dataKey="records" fill="#2563eb" radius={[6, 6, 0, 0]} stroke="#0f172a" strokeWidth={1.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* State Table */}
          <div className="overflow-x-auto border-2 border-slate-900 rounded-xl shadow-sketch-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b-2 border-slate-900 font-black text-slate-900 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">State / Unit ID</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleStateSort('records')}
                  >
                    <span className="flex items-center gap-1">
                      Sample Records <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Share %</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleStateSort('avg_income')}
                  >
                    <span className="flex items-center gap-1">
                      Avg Income <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleStateSort('avg_expenditure')}
                  >
                    <span className="flex items-center gap-1">
                      Avg Expenditure <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Avg HH Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {sortedStates.slice(0, 50).map((st, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-black text-slate-900">State #{st.state_id}</td>
                    <td className="py-2.5 px-4 font-bold">{st.records?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-bold text-blue-600">{st.share_pct}%</td>
                    <td className="py-2.5 px-4">{st.avg_income ? `₹${st.avg_income.toLocaleString()}` : '-'}</td>
                    <td className="py-2.5 px-4">{st.avg_expenditure ? `₹${st.avg_expenditure.toLocaleString()}` : '-'}</td>
                    <td className="py-2.5 px-4">{st.avg_hh_size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SECTION 4: ECONOMIC & CROSS-TABULATIONS ─────────────── */}
      {activeSection === 'economic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Quintiles Card */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch">
            <h3 className="font-black text-slate-900 text-base mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Income Quintiles vs. Consumption Expenditure
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Cross-tabulation of income brackets against consumption and household size
            </p>

            {incomeDeciles.length > 0 ? (
              <div className="space-y-3">
                {incomeDeciles.map((dec, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-blue-800">{dec.decile}</span>
                      <span className="text-slate-500">{dec.records?.toLocaleString()} Households</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Income Range</span>
                        <span className="font-bold text-slate-900">₹{dec.min_income?.toLocaleString()} - ₹{dec.max_income?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Avg Expenditure</span>
                        <span className="font-bold text-emerald-700">₹{dec.avg_expenditure?.toLocaleString() || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Avg HH Size</span>
                        <span className="font-bold text-slate-900">{dec.avg_hh_size || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold text-center py-10">
                Income quintiles data not available.
              </p>
            )}
          </div>

          {/* Rural vs Urban Economic Comparison */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch">
            <h3 className="font-black text-slate-900 text-base mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Rural vs Urban Economic Disparity
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              Comparison of key financial metrics across sectors
            </p>

            {sectorComparison.length >= 2 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 border-2 border-slate-900 rounded-xl shadow-sketch-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">
                      🌾 Rural Sector
                    </span>
                    <p className="text-xl font-black text-slate-900">₹{sectorComparison[0].avg_income?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      Avg Expenditure: ₹{sectorComparison[0].avg_expenditure?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Avg HH Size: {sectorComparison[0].avg_hh_size}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border-2 border-slate-900 rounded-xl shadow-sketch-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block mb-1">
                      🏙️ Urban Sector
                    </span>
                    <p className="text-xl font-black text-slate-900">₹{sectorComparison[1].avg_income?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      Avg Expenditure: ₹{sectorComparison[1].avg_expenditure?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Avg HH Size: {sectorComparison[1].avg_hh_size}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 leading-relaxed">
                  💡 <span className="font-bold text-slate-900">Economic Finding:</span> Urban household income is{' '}
                  <span className="font-extrabold text-blue-700">
                    {sectorComparison[0].avg_income && sectorComparison[1].avg_income
                      ? `${(sectorComparison[1].avg_income / sectorComparison[0].avg_income).toFixed(1)}x`
                      : 'higher'}
                  </span>{' '}
                  compared to rural households, while urban consumption expenditure is{' '}
                  <span className="font-extrabold text-emerald-700">
                    {sectorComparison[0].avg_expenditure && sectorComparison[1].avg_expenditure
                      ? `${(sectorComparison[1].avg_expenditure / sectorComparison[0].avg_expenditure).toFixed(1)}x`
                      : 'higher'}
                  </span>.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold text-center py-10">
                Insufficient sector disparity data.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 5: DATA DICTIONARY & QUALITY PROFILER ─────────── */}
      {activeSection === 'dictionary' && (
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-sketch space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Data Dictionary & Completeness Scorecard
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Inspection of all {columnProfiler.length} variables with inferred semantic roles and null audits
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search variables..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border-2 border-slate-900 rounded-xl shadow-sketch-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b-2 border-slate-900 font-black text-slate-900 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Column Name</th>
                  <th className="py-3 px-4">Data Type</th>
                  <th className="py-3 px-4">Inferred Semantic Role</th>
                  <th className="py-3 px-4">Non-Null Count</th>
                  <th className="py-3 px-4">Missing %</th>
                  <th className="py-3 px-4">Unique Values</th>
                  <th className="py-3 px-4">Quality Status</th>
                  <th className="py-3 px-4">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {filteredColumns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-black text-slate-900 font-mono text-xs">{col.name}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-300">
                        {col.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-blue-700">{col.semantic_role}</td>
                    <td className="py-2.5 px-4 font-mono">{col.non_null_count?.toLocaleString()}</td>
                    <td className="py-2.5 px-4">
                      <span className={`font-bold ${col.missing_percentage > 10 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {col.missing_percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">{col.unique_count?.toLocaleString()}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                          col.quality_status === 'EXCELLENT'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : col.quality_status === 'GOOD'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {col.quality_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                      {col.sample_values?.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
