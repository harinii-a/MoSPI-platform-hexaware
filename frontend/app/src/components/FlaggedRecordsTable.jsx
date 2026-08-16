import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Cpu, UserX, Search, Filter, Check, X, ArrowUpRight, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { datasetApi } from '../api';

export default function FlaggedRecordsTable({ summary, datasetId }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [reviewingIndex, setReviewingIndex] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const records = summary?.records || [];
  const displayColumns = summary?.display_columns || [];
  const violations = summary?.violations || [];

  // Map violations by record index
  const violationMap = useMemo(() => {
    const map = {};
    violations.forEach((v) => {
      const idx = v.record_index;
      if (!map[idx]) map[idx] = [];
      map[idx].push(v);
    });
    return map;
  }, [violations]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (filterSeverity === 'HIGH' && rec.risk_level !== 'High') return false;
      if (filterSeverity === 'MEDIUM' && rec.risk_level !== 'Medium') return false;
      if (filterSeverity === 'LOW' && rec.risk_level !== 'Low') return false;
      if (filterSeverity === 'FLAGGED' && !rec.has_rule_violation && !rec.has_ml_anomaly && !rec.has_enum_bias) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesField = Object.values(rec).some(
          (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        );
        return matchesField;
      }
      return true;
    });
  }, [records, filterSeverity, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleReview = async (recordIndex, status) => {
    if (!datasetId) return;
    try {
      await datasetApi.review(datasetId, recordIndex, {
        status,
        comment: reviewComment || `Marked as ${status}`,
      });
      // Update local record state
      rec_record_update(recordIndex, status, reviewComment);
      setReviewingIndex(null);
      setReviewComment('');
    } catch (err) {
      console.error('Review failed:', err);
    }
  };

  const rec_record_update = (recordIndex, status, comment) => {
    const target = records.find((r) => r._index === recordIndex);
    if (target) {
      target.review_status = status;
      target.review_comment = comment;
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'High':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'NEEDS_CORRECTION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Field Data Verification Inspector
          </h3>
          <p className="text-xs font-bold text-slate-500">
            Real-time record inspection, dynamic schema validation, and supervisor review
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search records..."
              className="pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-900 text-xs font-bold rounded-xl text-slate-900 focus:outline-none shadow-sketch-sm w-44 lg:w-56"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border-2 border-slate-900 shadow-sketch-sm">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'FLAGGED'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setFilterSeverity(lvl); setPage(1); }}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterSeverity === lvl
                    ? 'bg-blue-600 text-white shadow-sketch-sm'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <span className="text-xs font-black text-slate-900 bg-amber-100 px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm">
            {filteredRecords.length} of {records.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
            <tr>
              <th className="py-3.5 px-3 rounded-l-xl">Record ID</th>
              {displayColumns.slice(0, 6).map((col) => (
                <th key={col} className="py-3.5 px-3 whitespace-nowrap">
                  {col}
                </th>
              ))}
              <th className="py-3.5 px-3">Quality Findings</th>
              <th className="py-3.5 px-3">Risk Score</th>
              <th className="py-3.5 px-3">Review Status</th>
              <th className="py-3.5 px-3 rounded-r-xl">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 font-bold">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec) => {
                const recViolations = violationMap[rec._index] || [];
                const score = rec.risk_score ?? 0;
                const isReviewing = reviewingIndex === rec._index;

                return (
                  <React.Fragment key={rec._index}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-black text-slate-900 whitespace-nowrap">
                        #{rec.record_id ?? rec._index}
                      </td>

                      {displayColumns.slice(0, 6).map((col) => (
                        <td key={col} className="py-3.5 px-3 text-slate-800 whitespace-nowrap max-w-[120px] truncate" title={String(rec[col] ?? '')}>
                          {rec[col] !== null && rec[col] !== undefined ? String(rec[col]) : <span className="text-slate-300">—</span>}
                        </td>
                      ))}

                      {/* Findings Badges */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {recViolations.slice(0, 2).map((v, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-slate-900 px-2 py-0.5 rounded-md text-[9px] font-black truncate max-w-[150px]"
                              title={v.description}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              {v.rule_type}
                            </span>
                          ))}
                          {recViolations.length > 2 && (
                            <span className="text-[9px] font-black text-rose-600">+{recViolations.length - 2} more</span>
                          )}
                          {rec.has_ml_anomaly && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-slate-900 px-2 py-0.5 rounded-md text-[9px] font-black">
                              <Cpu className="w-2.5 h-2.5 text-amber-600" /> Outlier
                            </span>
                          )}
                          {rec.has_enum_bias && (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-slate-900 px-2 py-0.5 rounded-md text-[9px] font-black">
                              <UserX className="w-2.5 h-2.5 text-purple-600" /> Staff Skew
                            </span>
                          )}
                          {!rec.has_rule_violation && !rec.has_ml_anomaly && !rec.has_enum_bias && recViolations.length === 0 && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-slate-900 px-2 py-0.5 rounded-md text-[9px] font-black">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Clean
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border ${getRiskBadge(rec.risk_level)}`}>
                          {score}/100 • {rec.risk_level}
                        </span>
                      </td>

                      {/* Review Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border ${getStatusBadge(rec.review_status)}`}>
                          {rec.review_status || 'NEW'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => setReviewingIndex(isReviewing ? null : rec._index)}
                          className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-800 hover:text-blue-900 border border-slate-900 shadow-sketch-sm transition-all cursor-pointer"
                        >
                          {isReviewing ? 'Close' : 'Review'}
                        </button>
                      </td>
                    </tr>

                    {/* Inline Review Drawer */}
                    {isReviewing && (
                      <tr className="bg-amber-50/50">
                        <td colSpan={displayColumns.slice(0, 6).length + 5} className="p-4 border-2 border-dashed border-amber-300 rounded-xl">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1 w-full">
                              <label className="block text-[11px] font-black text-slate-800 mb-1">
                                Supervisor Notes / Action Details:
                              </label>
                              <input
                                type="text"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Enter verification comment or field instruction..."
                                className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-2 sm:mt-5">
                              <button
                                onClick={() => handleReview(rec._index, 'APPROVED')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] border border-slate-900 shadow-sketch-sm cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(rec._index, 'NEEDS_CORRECTION')}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-[10px] border border-slate-900 shadow-sketch-sm cursor-pointer"
                              >
                                Needs Correction
                              </button>
                              <button
                                onClick={() => handleReview(rec._index, 'ESCALATED')}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] border border-slate-900 shadow-sketch-sm cursor-pointer"
                              >
                                Escalate
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={displayColumns.slice(0, 6).length + 5} className="py-8 text-center text-slate-500 font-bold">
                  No records matching current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t-2 border-slate-100">
          <span className="text-xs font-bold text-slate-500">
            Page {page} of {totalPages} ({filteredRecords.length} records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-900 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900 px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-900 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
