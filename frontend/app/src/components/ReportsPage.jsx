import React, { useState, useEffect } from 'react';
import {
  FileText, Download, CheckCircle2, ShieldAlert, Cpu, UserCheck,
  Layers, FileSpreadsheet, FileCode, Sparkles, MapPin, Scale,
  DollarSign, AlertTriangle, ShieldCheck, Check
} from 'lucide-react';
import { downloadReport, datasetApi } from '../api';

export default function ReportsPage({ datasetId, summary }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!datasetId) return;
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        const res = await datasetApi.analytics(datasetId);
        if (isMounted) setAnalytics(res.data);
      } catch (err) {
        console.error('Error fetching analytics for report preview:', err);
      }
    };
    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [datasetId]);

  const handleDownload = async (format) => {
    if (!datasetId) return;
    setDownloading(true);
    setDownloadFormat(format);
    try {
      await downloadReport(datasetId, format);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
      setDownloadFormat(null);
    }
  };

  if (!summary) {
    return (
      <div className="bg-white rounded-3xl p-8 border-2 border-slate-900 shadow-sketch text-center">
        <p className="text-sm font-bold text-slate-500">
          Please select or upload an active dataset to view and generate reports.
        </p>
      </div>
    );
  }

  const meta = summary.dataset_meta || {};
  const totalRecords = summary.total_records || 0;
  const totalColumns = summary.total_columns || 0;
  const missingPct = summary.overall_missing_pct ?? 0;
  const integrityCount = summary.integrity_violation_count || 0;
  const mlCount = summary.ml_anomaly_count || 0;
  const highRiskCount = summary.high_risk_count || 0;
  const riskDist = summary.risk_distribution || {};

  const sectorComp = analytics?.sector_comparison || [];
  const stateAnalytics = analytics?.state_analytics || [];
  const rawProfiles = analytics?.numeric_profiles || {};
  const numericProfiles = Array.isArray(rawProfiles)
    ? rawProfiles
    : Object.entries(rawProfiles).map(([col, p]) => ({ column: col, ...p }));
  const weightedPop = analytics?.overview?.weighted_population;

  const records = summary.records || [];
  const flaggedRecords = records.filter(
    (r) => r.risk_level === 'High' || r.has_rule_violation || r.has_ml_anomaly
  );

  return (
    <div className="space-y-6 mb-8 max-w-5xl mx-auto">
      {/* ─── Top Export Action Bar ───────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900">National Survey Intelligence Audit Report</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Publication-grade statistical diagnostics, multi-factor anomaly evaluations, and formal audit certification
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm cursor-pointer disabled:opacity-50 transition-transform active:translate-y-0.5"
          >
            <FileText className="w-4 h-4" />
            <span>{downloading && downloadFormat === 'pdf' ? 'Compiling PDF...' : 'Official PDF Report'}</span>
          </button>

          <button
            onClick={() => handleDownload('csv')}
            disabled={downloading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm cursor-pointer disabled:opacity-50 transition-transform active:translate-y-0.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{downloading && downloadFormat === 'csv' ? 'Exporting CSV...' : 'CSV Microdata'}</span>
          </button>

          <button
            onClick={() => handleDownload('json')}
            disabled={downloading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-3.5 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm cursor-pointer disabled:opacity-50 transition-transform active:translate-y-0.5"
          >
            <FileCode className="w-4 h-4" />
            <span>{downloading && downloadFormat === 'json' ? 'Exporting JSON...' : 'JSON Summary'}</span>
          </button>
        </div>
      </div>

      {/* ─── Official On-Screen Document Preview (Styled matching PDF) ─ */}
      <div className="bg-white rounded-3xl p-8 border-2 border-slate-900 shadow-sketch space-y-8">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block mb-2">
                GOVERNMENT OF INDIA • MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                Survey Microdata Intelligence & Quality Audit Report
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Active Dataset: <span className="text-slate-900 font-black">{meta.filename || 'Survey Microdata'}</span> • Dataset ID: <span className="font-mono">{datasetId}</span>
              </p>
            </div>
            <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Audit Date</span>
              <span className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="text-[10px] font-bold text-emerald-600 block mt-0.5 font-mono">STATUS: COMPLETED</span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive KPI Scorecards */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
            <h3 className="text-sm font-black uppercase tracking-wider">Executive Summary & Quality Scorecards</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50 border-2 border-slate-900 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase block">Total Sample</span>
              <span className="text-xl font-black text-blue-700">{totalRecords.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-600 block mt-0.5">100% Evaluated</span>
            </div>

            <div className="p-3.5 bg-emerald-50 border-2 border-slate-900 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase block">Data Completeness</span>
              <span className="text-xl font-black text-emerald-700">{(100 - missingPct).toFixed(2)}%</span>
              <span className="text-[10px] font-bold text-slate-600 block mt-0.5">{missingPct.toFixed(2)}% missing rate</span>
            </div>

            <div className="p-3.5 bg-rose-50 border-2 border-slate-900 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase block">High-Risk Records</span>
              <span className="text-xl font-black text-rose-700">{highRiskCount.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-600 block mt-0.5">Priority review queue</span>
            </div>

            <div className="p-3.5 bg-amber-50 border-2 border-slate-900 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase block">ML Anomalies</span>
              <span className="text-xl font-black text-amber-700">{mlCount.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-600 block mt-0.5">Isolation Forest</span>
            </div>
          </div>

          {/* Narrative Summary Callout */}
          <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl text-xs font-semibold text-slate-700 leading-relaxed">
            <span className="font-black text-slate-900">Audit Synthesis: </span>
            The survey microdata dataset (<i>{meta.filename || 'Survey Microdata'}</i>) underwent comprehensive multi-tier data verification across {totalRecords.toLocaleString()} observations
            {weightedPop ? `, representing an extrapolated national household population of ${weightedPop.toLocaleString()}` : ''}.
            Overall data completeness is evaluated at <b>{(100 - missingPct).toFixed(2)}%</b> with <b>{integrityCount.toLocaleString()} deterministic rule issues</b> and <b>{mlCount.toLocaleString()} multivariate statistical outliers</b> flagged for supervisory reconciliation.
          </div>
        </section>

        {/* Section 2: Continuous Measures Distributions */}
        {numericProfiles.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">2</span>
              <h3 className="text-sm font-black uppercase tracking-wider">Microdata Statistical Profiling & Key Measures</h3>
            </div>

            <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-blue-900 text-white font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Variable</th>
                    <th className="py-2.5 px-3">Mean</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Min – Max</th>
                    <th className="py-2.5 px-3">IQR Range (Q1 - Q3)</th>
                    <th className="py-2.5 px-3">Skew</th>
                    <th className="py-2.5 px-3">Outliers (1.5x IQR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {numericProfiles.slice(0, 8).map((st) => (
                    <tr key={st.column} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-black text-slate-900">{st.column}</td>
                      <td className="py-2.5 px-3 font-bold">{st.mean?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold">{st.median?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.min?.toLocaleString()} – {st.max?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.q1?.toLocaleString()} – {st.q3?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.skewness ?? '0.00'}</td>
                      <td className="py-2.5 px-3 text-rose-700 font-bold">
                        {st.outliers_count ? `${st.outliers_count.toLocaleString()} (${st.outliers_pct}%)` : '0 (0%)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 3: Sector Stratification */}
        {sectorComp.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black">3</span>
              <h3 className="text-sm font-black uppercase tracking-wider">Socioeconomic Stratification & Sectoral Comparison</h3>
            </div>

            <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-teal-800 text-white font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Sector Category</th>
                    <th className="py-2.5 px-3">Sample Records</th>
                    <th className="py-2.5 px-3">National Share</th>
                    <th className="py-2.5 px-3">Mean Expenditure (₹)</th>
                    <th className="py-2.5 px-3">Median Income (₹)</th>
                    <th className="py-2.5 px-3">Avg Household Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {sectorComp.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-black text-slate-900">{s.sector_name}</td>
                      <td className="py-2.5 px-3 font-bold">{s.records?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold">{s.percentage}%</td>
                      <td className="py-2.5 px-3 text-slate-700">₹{s.avg_expenditure?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-700">₹{s.median_income?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-700">{s.avg_hh_size} persons</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 4: Geographic State-Level Rollups */}
        {stateAnalytics.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-black">4</span>
              <h3 className="text-sm font-black uppercase tracking-wider">Geographic & Regional Distribution Highlights</h3>
            </div>

            <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">State / Region</th>
                    <th className="py-2.5 px-3">Sample Records</th>
                    <th className="py-2.5 px-3">National Share</th>
                    <th className="py-2.5 px-3">Mean Expenditure (₹)</th>
                    <th className="py-2.5 px-3">Avg Household Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {stateAnalytics.slice(0, 6).map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-black text-slate-900">State #{st.state_id}</td>
                      <td className="py-2.5 px-3 font-bold">{st.records?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold">{st.share_pct}%</td>
                      <td className="py-2.5 px-3 text-slate-700">₹{st.avg_expenditure?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.avg_hh_size} persons</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 5: Top Flagged Records */}
        {flaggedRecords.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">5</span>
              <h3 className="text-sm font-black uppercase tracking-wider">Priority Flagged Observations</h3>
            </div>

            <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-900 text-white font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Record #</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Rule Violations</th>
                    <th className="py-2.5 px-3">ML Anomaly</th>
                    <th className="py-2.5 px-3">Deviation Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {flaggedRecords.slice(0, 6).map((rec) => (
                    <tr key={rec._index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-black text-slate-900">#{rec._index}</td>
                      <td className="py-2.5 px-3 font-black text-rose-700">{rec.risk_score}/100</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          rec.risk_level === 'High' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {rec.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {rec.has_rule_violation ? (
                          <span className="text-rose-600 font-bold">FLAGGED</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">PASS</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {rec.has_ml_anomaly ? (
                          <span className="text-amber-600 font-bold">OUTLIER</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">NORMAL</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {rec.has_rule_violation && rec.has_ml_anomaly
                          ? 'Multi-feature outlier & range violation'
                          : rec.has_rule_violation
                          ? 'Deterministic rule boundary check trigger'
                          : 'Unsupervised multidimensional anomaly'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 6: Recommendations & Formal Sign-Off */}
        <section className="space-y-4 pt-4 border-t-2 border-slate-900">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">6</span>
            <h3 className="text-sm font-black uppercase tracking-wider">Supervisory Directives & Certification</h3>
          </div>

          <div className="space-y-2 text-xs font-semibold text-slate-700">
            {highRiskCount > 0 && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                • <b>Priority Action:</b> {highRiskCount} high-risk observations require formal supervisor review via the validation queue prior to national statistical aggregation.
              </div>
            )}
            {integrityCount > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                • <b>Data Reconciliation:</b> {integrityCount} deterministic integrity discrepancies should be investigated for keying or boundary errors.
              </div>
            )}
            {mlCount > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                • <b>Statistical Audits:</b> {mlCount} multivariate Isolation Forest anomalies require analytical spot-checking for abnormal expenditure-to-income ratios.
              </div>
            )}
          </div>

          {/* Formal Certification Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200">
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs space-y-1">
              <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider text-blue-800">
                Certified by Data Supervisor
              </span>
              <div className="pt-4 border-b border-slate-300 mb-2" />
              <p className="font-black text-slate-900">Dr. Rajesh Kumar</p>
              <p className="text-[11px] text-slate-500 font-bold">Lead Statistical Quality Officer</p>
              <p className="text-[10px] text-slate-400 font-semibold">Survey Validation Division, MoSPI</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs space-y-1">
              <span className="font-black text-slate-900 block text-[11px] uppercase tracking-wider text-slate-800">
                Endorsed by Director / Head of Operations
              </span>
              <div className="pt-4 border-b border-slate-300 mb-2" />
              <p className="font-black text-slate-900">Director General (Surveys)</p>
              <p className="text-[11px] text-slate-500 font-bold">National Statistical Office (NSO)</p>
              <p className="text-[10px] text-slate-400 font-semibold">Government of India</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
