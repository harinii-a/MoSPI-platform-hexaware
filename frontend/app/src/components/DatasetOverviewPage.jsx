import React, { useState, useEffect } from 'react';
import {
  BookOpen, Info, Database, Compass, CheckCircle2, Sparkles,
  TrendingUp, ShieldAlert, Cpu, BarChart3, Layers, MapPin,
  Users, DollarSign, FileText, ArrowRight, Lightbulb, Target,
  FileSpreadsheet, HelpCircle, Award, Scale, PieChart, RefreshCw
} from 'lucide-react';
import { datasetApi } from '../api';

export default function DatasetOverviewPage({ activeDatasetId, activeDatasetMeta, summary }) {
  const [activeSection, setActiveSection] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (!activeDatasetId) return;
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await datasetApi.analytics(activeDatasetId);
        if (isMounted) {
          setAnalyticsData(res.data);
        }
      } catch (err) {
        console.error('Error loading dataset analytics for overview:', err);
      } finally {
        if (isMounted) setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  const meta = activeDatasetMeta || summary?.dataset_meta || {};
  const totalRecords = meta.total_records || summary?.total_records || 0;
  const totalColumns = meta.total_columns || summary?.total_columns || 0;
  const filename = meta.filename || 'Survey Microdata';
  const format = (meta.format || 'CSV').toUpperCase();
  const overallMissing = summary?.overall_missing_pct ?? 0;
  const displayCols = summary?.display_columns || [];
  const clusterCol = summary?.cluster_column || 'Geographic Unit';

  // Extract real backend analytics data
  const overview = analyticsData?.overview || {};
  const rawProfiles = analyticsData?.numeric_profiles || {};
  const numericProfiles = Array.isArray(rawProfiles)
    ? rawProfiles
    : Object.entries(rawProfiles).map(([col, profile]) => ({
        column: col,
        ...profile,
      }));

  const sectorComparison = analyticsData?.sector_comparison || [];
  const ruralSector = sectorComparison.find((s) => s.sector_name?.toLowerCase().includes('rural')) || sectorComparison[0];
  const urbanSector = sectorComparison.find((s) => s.sector_name?.toLowerCase().includes('urban')) || sectorComparison[1];
  const stateData = analyticsData?.state_analytics || [];
  const estimatedPop = overview.weighted_population;

  // Key continuous measures
  const primaryMeasure = numericProfiles.find(
    (p) =>
      p.column?.toLowerCase().includes('hce') ||
      p.column?.toLowerCase().includes('exp') ||
      p.column?.toLowerCase().includes('income') ||
      p.column?.toLowerCase().includes('inc')
  ) || numericProfiles[0];

  const secondaryMeasure = numericProfiles.find(
    (p) =>
      p.column !== primaryMeasure?.column &&
      (p.column?.toLowerCase().includes('inc') ||
        p.column?.toLowerCase().includes('size') ||
        p.column?.toLowerCase().includes('rent') ||
        p.column?.toLowerCase().includes('exp'))
  ) || numericProfiles[1];

  // Inferred survey type description
  const isHouseholdSurvey = displayCols.some(c => ['hh_size', 'hce_tot', 'inc_tot', 'hce1', 'sch'].includes(c.toLowerCase()));
  const isPLFS = displayCols.some(c => ['hours_worked', 'emp_status', 'employment_status'].includes(c.toLowerCase()));

  let surveyCategory = 'National Survey Microdata';
  let surveySubhead = 'Official socio-economic survey microdata dataset';
  if (isHouseholdSurvey) {
    surveyCategory = 'Household Consumer Expenditure & Socio-Economic Microdata (Schedule 10.4)';
    surveySubhead = 'Stratified multi-stage probability sample of household living standards, consumption expenditure, and demographic parameters.';
  } else if (isPLFS) {
    surveyCategory = 'Periodic Labour Force Survey (PLFS) Microdata';
    surveySubhead = 'Employment, unemployment, hours worked, and wage distribution survey microdata.';
  }

  const sections = [
    { id: 'all', label: 'Complete Briefing' },
    { id: 'what_kind', label: '1. What Kind of Dataset' },
    { id: 'what_tells', label: '2. What It Tells Us' },
    { id: 'why_use', label: '3. Why We Use This' },
    { id: 'what_get', label: '4. Platform Capabilities' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto mb-12">
      {/* ─── Top Executive Banner ─────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-3xl p-7 border-2 border-slate-900 shadow-sketch relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded-lg border border-blue-400 shadow-sketch-sm">
                Executive Briefing
              </span>
              <span className="px-3 py-1 bg-slate-800 text-emerald-400 text-[11px] font-bold rounded-lg border border-slate-700">
                Active: {filename}
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">
              Survey Dataset Intelligence & Contextual Overview
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold leading-relaxed">
              {surveySubhead}
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <div className="px-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-center shadow-sketch-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Sample Size</span>
              <span className="text-lg font-black text-white">{totalRecords.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-bold block">Survey Records</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-center shadow-sketch-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Variables</span>
              <span className="text-lg font-black text-blue-400">{totalColumns}</span>
              <span className="text-[10px] text-slate-400 font-bold block">Columns Profiled</span>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-800">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSection === sec.id
                  ? 'bg-blue-600 text-white border-2 border-white shadow-sketch-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── LIVE DATASET MACRO PILLS (From Backend) ──────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-sketch">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Database className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase text-slate-500">Classification</span>
          </div>
          <p className="text-xs font-black text-slate-900 truncate">{surveyCategory.split('(')[0]}</p>
          <span className="text-[10px] font-bold text-slate-500">Format: {format} Microdata</span>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-sketch">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase text-slate-500">Data Completeness</span>
          </div>
          <p className="text-xs font-black text-slate-900">{100 - overallMissing}% Valid Data</p>
          <span className="text-[10px] font-bold text-slate-500">{overallMissing}% missing cells</span>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-sketch">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase text-slate-500">Sampling Clusters</span>
          </div>
          <p className="text-xs font-black text-slate-900 truncate">{clusterCol}</p>
          <span className="text-[10px] font-bold text-slate-500">{summary?.clusters?.length || stateData.length || 'Multi'} Geographic Units</span>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-sketch">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase text-slate-500">Weighted Population</span>
          </div>
          <p className="text-xs font-black text-slate-900">
            {estimatedPop ? estimatedPop.toLocaleString() : `${totalRecords.toLocaleString()} (Sample)`}
          </p>
          <span className="text-[10px] font-bold text-slate-500">National Extrapolation</span>
        </div>
      </div>

      {/* ─── LIVE EMPIRICAL HIGHLIGHTS (Backend Analytics) ────────── */}
      {primaryMeasure && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-slate-900 rounded-3xl p-6 shadow-sketch">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sketch-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Empirical Microdata Statistical Summary (Calculated from Backend)</h4>
                <p className="text-[11px] font-bold text-slate-600">Direct statistical profiling of primary continuous survey measurements</p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-white text-blue-800 px-3 py-1 rounded-full border border-slate-900 shadow-sketch-sm w-fit">
              {numericProfiles.length} Continuous Measures Analyzed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Measure Card */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sketch-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Primary Measure</span>
              <span className="text-sm font-black text-blue-700 block truncate">{primaryMeasure.column}</span>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Mean Value:</span>
                  <span className="text-slate-900 font-black">{primaryMeasure.mean?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Median:</span>
                  <span className="text-slate-900 font-black">{primaryMeasure.median?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-600">
                  <span>IQR Range:</span>
                  <span className="text-slate-900 font-black">{primaryMeasure.q1?.toLocaleString()} - {primaryMeasure.q3?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Secondary Measure Card */}
            {secondaryMeasure && (
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sketch-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Secondary Measure</span>
                <span className="text-sm font-black text-purple-700 block truncate">{secondaryMeasure.column}</span>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>Mean Value:</span>
                    <span className="text-slate-900 font-black">{secondaryMeasure.mean?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>Median:</span>
                    <span className="text-slate-900 font-black">{secondaryMeasure.median?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>IQR Range:</span>
                    <span className="text-slate-900 font-black">{secondaryMeasure.q1?.toLocaleString()} - {secondaryMeasure.q3?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sector Stratification Card */}
            {(ruralSector || urbanSector) && (
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sketch-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sector Stratification</span>
                <span className="text-sm font-black text-emerald-700 block">Rural vs. Urban Split</span>
                <div className="mt-2 space-y-1 text-xs">
                  {ruralSector && (
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>{ruralSector.sector_name}:</span>
                      <span className="text-slate-900 font-black">{ruralSector.percentage}% ({ruralSector.records?.toLocaleString()})</span>
                    </div>
                  )}
                  {urbanSector && (
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>{urbanSector.sector_name}:</span>
                      <span className="text-slate-900 font-black">{urbanSector.percentage}% ({urbanSector.records?.toLocaleString()})</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality & Outlier Card */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sketch-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Statistical Outlier Rates</span>
              <span className="text-sm font-black text-rose-700 block">1.5x IQR Diagnostics</span>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Outliers Detected:</span>
                  <span className="text-rose-600 font-black">{primaryMeasure.outliers_count?.toLocaleString()} ({primaryMeasure.outliers_pct}%)</span>
                </div>
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Zero Value Entries:</span>
                  <span className="text-slate-900 font-black">{primaryMeasure.zero_count?.toLocaleString()} ({primaryMeasure.zero_pct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 1: WHAT KIND OF DATASET IS THIS? ──────────────── */}
      {(activeSection === 'all' || activeSection === 'what_kind') && (
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-7 shadow-sketch space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 border-2 border-slate-900 flex items-center justify-center shadow-sketch-sm">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">Section 1</span>
              <h3 className="text-lg font-black text-slate-900">What Kind of Dataset is This?</h3>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 font-medium">
            <p>
              This dataset is an <span className="font-extrabold text-slate-900">Official Survey Microdata file ({filename})</span> comprising{' '}
              <span className="font-extrabold text-blue-600">{totalRecords.toLocaleString()} individual records</span> and{' '}
              <span className="font-extrabold text-blue-600">{totalColumns} variables</span>. It represents a scientifically sampled, stratified multi-stage household survey conducted under the auspices of the Ministry of Statistics and Programme Implementation (MoSPI), Government of India.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" /> Multi-Stage Sampling Architecture
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-normal">
                  The dataset follows standard National Sample Survey (NSS) design:
                </p>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc font-semibold">
                  <li><span className="font-bold text-slate-900">First Stage Units (FSUs / MFSUs):</span> Census villages in rural areas and Urban Frame Survey (UFS) blocks in urban sectors.</li>
                  <li><span className="font-bold text-slate-900">Second Stage Stratification (SSUs):</span> Segmented household clusters categorized by economic affluence.</li>
                  <li><span className="font-bold text-slate-900">Sample Weights / Multipliers (<code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">mult</code>):</span> Inflation factors to extrapolate microdata to district, state, and all-India aggregates.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" /> Microdata Variable Categories
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-normal">
                  The {totalColumns} columns are dynamically classified into 4 core analytical tiers:
                </p>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc font-semibold">
                  <li><span className="font-bold text-slate-900">Geographic & Admin:</span> State (<code className="font-mono text-xs">st</code>), District (<code className="font-mono text-xs">dc</code>), Sector (<code className="font-mono text-xs">sec</code>: Rural/Urban), Sub-Regional Office (<code className="font-mono text-xs">sro</code>).</li>
                  <li><span className="font-bold text-slate-900">Demographic & Social:</span> Household Size (<code className="font-mono text-xs">hh_size</code>), Social Group (<code className="font-mono text-xs">sg</code>: ST/SC/OBC), Religion (<code className="font-mono text-xs">relg</code>), Household Type (<code className="font-mono text-xs">hhtype</code>).</li>
                  <li><span className="font-bold text-slate-900">Economic & Measures:</span> Monthly Income (<code className="font-mono text-xs">inc_tot</code>), Consumer Expenditure (<code className="font-mono text-xs">hce_tot</code>), Housing, Rent, Pensions.</li>
                  <li><span className="font-bold text-slate-900">Survey Operations:</span> Quarter (<code className="font-mono text-xs">qtr</code>), Month (<code className="font-mono text-xs">month</code>), Visit (<code className="font-mono text-xs">visit</code>), Response Code (<code className="font-mono text-xs">resp_code</code>).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: WHAT DOES THIS DATASET TELL US? ────────────── */}
      {(activeSection === 'all' || activeSection === 'what_tells') && (
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-7 shadow-sketch space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 border-2 border-slate-900 flex items-center justify-center shadow-sketch-sm">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Section 2</span>
              <h3 className="text-lg font-black text-slate-900">What Does This Dataset Tell Us?</h3>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 font-medium">
            <p>
              By evaluating the responses of {totalRecords.toLocaleString()} households across India, this dataset yields empirical answers to critical economic and demographic questions:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" /> 1. Household Consumption & Welfare
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Reveals the exact Monthly Per Capita Consumption Expenditure (MPCE), illuminating how households allocate budgets between food items, energy, housing, healthcare, transport, and durable goods.
                </p>
              </div>

              <div className="p-4 bg-blue-50/50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-black text-xs uppercase tracking-wider">
                  <Scale className="w-4 h-4" /> 2. Rural-Urban Economic Disparities
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Measures the economic gap between rural agrarian households and urban centers in terms of income realization, family size differences, and access to modern amenities and social safety nets.
                </p>
              </div>

              <div className="p-4 bg-purple-50/50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-2">
                <div className="flex items-center gap-2 text-purple-800 font-black text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4" /> 3. Vulnerability & Social Stratification
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Provides a disaggregated look at economic well-being across Social Groups (ST, SC, OBC) and religious communities, exposing poverty pockets, informal earnings, and dependency ratios.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 3: WHY DO WE USE THIS DATASET? ────────────────── */}
      {(activeSection === 'all' || activeSection === 'why_use') && (
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-7 shadow-sketch space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border-2 border-slate-900 flex items-center justify-center shadow-sketch-sm">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Section 3</span>
              <h3 className="text-lg font-black text-slate-900">Why Do We Use This Dataset?</h3>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 font-medium">
            <p>
              Survey microdata of this magnitude is the foundational benchmark for national policy making, economic governance, and statistical calibration across India:
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs">National Accounts & GDP Calibration (PFCE)</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    The Central Statistics Office (CSO) utilizes this data to compute Private Final Consumption Expenditure (PFCE), which constitutes over 55% of India's Gross Domestic Product (GDP).
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs">Consumer Price Index (CPI) Inflation Basket Re-weighting</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Household budget expenditure shares directly determine the weighting diagram of the CPI basket used by the Reserve Bank of India (RBI) for monetary policy and inflation targeting.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs">Poverty Estimation & Targeted Welfare Schemes</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Forms the empirical bedrock for official poverty head-count ratios, Multi-dimensional Poverty Index (MPI) reporting, and resource distribution under the National Food Security Act (NFSA), PM-Kisan, and Ayushman Bharat.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs">Academic & Global Development Research</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Cited globally by the World Bank, IMF, United Nations Development Programme (UNDP), and leading academic economists to analyze structural economic shifts, inequality (Gini coefficient), and household resilience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 4: WHAT CAN YOU GET FROM THIS PLATFORM? ───────── */}
      {(activeSection === 'all' || activeSection === 'what_get') && (
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-7 shadow-sketch space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 border-2 border-slate-900 flex items-center justify-center shadow-sketch-sm">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Section 4</span>
              <h3 className="text-lg font-black text-slate-900">What Can You Get from the MoSPI Intelligent Survey Platform?</h3>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 font-medium">
            <p>
              The MoSPI Survey Intelligence Platform turns raw, complex microdata into <span className="font-extrabold text-slate-900">actionable, verified, and audited intelligence</span> without requiring manual scripts or hardcoded configurations:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> 1. Automated Dynamic Profiling
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Upload any survey CSV/XLSX. The platform auto-discovers data types, nullity, sample values, and infers semantic roles (State, District, Income, Weights) with confidence scores and UI override capabilities.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> 2. Deep Statistical Distributions
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Generate instant 10-bin frequency histograms, IQR box-plot quartiles (Q1, Median, Q3), skewness, zero-value rates, and outlier counts across hundreds of thousands of records in milliseconds.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" /> 3. 4-Factor AI Risk Scoring (0–100)
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Combines deterministic integrity rules (completeness, uniqueness, IQR range), unsupervised Isolation Forest machine learning anomalies, and spatial cluster consistency into a normalized composite risk score.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> 4. Explainable AI (XAI) Decomposition
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  No black-box decisions. Every flagged household record provides an exact percentage breakdown explaining why it was flagged, which variables exceeded thresholds, and which rules were triggered.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> 5. Custom Rule Builder & Field Constraints
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Supervisors can create, test, and enforce custom logical assertions on any column (such as consumption-to-income limits or household size boundaries) dynamically bound to the active survey schema.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm space-y-1.5">
                <span className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> 6. Official PDF & Multi-Format Exports
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Instantly compile official ReportLab PDF validation reports, filtered CSV microdata extracts, and structured JSON payloads for downstream econometric modeling with zero hardcoded statistics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
