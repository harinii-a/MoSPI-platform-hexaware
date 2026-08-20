import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Cpu, UserX, Search, X, ShieldCheck, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { datasetApi } from '../api';

export default function FlaggedRecordsTable({ summary, datasetId, onlyMlAnomalies = false }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [reviewingIndex, setReviewingIndex] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [openPopoverIndex, setOpenPopoverIndex] = useState(null);

  const [autoApprove, setAutoApprove] = useState(() => {
    return localStorage.getItem('auto_approve_clean') === 'true';
  });
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (openPopoverIndex !== null) {
        const isClickInsidePopover = e.target.closest('.findings-popover');
        const isClickInsideButton = e.target.closest('.findings-popover-btn');
        if (!isClickInsidePopover && !isClickInsideButton) {
          setOpenPopoverIndex(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openPopoverIndex]);

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

  React.useEffect(() => {
    const runAutoApproveOnLoad = async () => {
      const isChecked = localStorage.getItem('auto_approve_clean') === 'true';
      if (isChecked && datasetId && records.length > 0) {
        const hasCleanNew = records.some((rec) => {
          const recViolations = violationMap[rec._index] || [];
          const isClean = !rec.has_rule_violation && !rec.has_ml_anomaly && !rec.has_enum_bias && recViolations.length === 0;
          return isClean && (rec.review_status === 'NEW' || !rec.review_status);
        });

        if (hasCleanNew) {
          try {
            const res = await datasetApi.autoApproveClean(datasetId);
            const count = res.data.approved_count;
            if (count > 0) {
              setToastMessage(`${count} clean records auto-approved`);
              records.forEach((rec) => {
                const recViolations = violationMap[rec._index] || [];
                const isClean = !rec.has_rule_violation && !rec.has_ml_anomaly && !rec.has_enum_bias && recViolations.length === 0;
                if (isClean && (rec.review_status === 'NEW' || !rec.review_status)) {
                  rec.review_status = 'APPROVED';
                  rec.review_comment = 'Auto-approved clean record';
                }
              });
              setPage(p => p); // trigger re-render
            }
          } catch (err) {
            console.error('Auto-approve on load failed:', err);
          }
        }
      }
    };
    runAutoApproveOnLoad();
  }, [datasetId, records, violationMap]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (onlyMlAnomalies && !rec.has_ml_anomaly) return false;
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
  }, [records, filterSeverity, searchTerm, onlyMlAnomalies]);

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

  const handleToggleAutoApprove = async (e) => {
    const checked = e.target.checked;
    setAutoApprove(checked);
    localStorage.setItem('auto_approve_clean', checked ? 'true' : 'false');

    if (checked && datasetId) {
      setIsProcessing(true);
      try {
        const res = await datasetApi.autoApproveClean(datasetId);
        const count = res.data.approved_count;
        if (count > 0) {
          setToastMessage(`${count} clean records auto-approved`);
          records.forEach((rec) => {
            const recViolations = violationMap[rec._index] || [];
            const isClean = !rec.has_rule_violation && !rec.has_ml_anomaly && !rec.has_enum_bias && recViolations.length === 0;
            if (isClean && (rec.review_status === 'NEW' || !rec.review_status)) {
              rec.review_status = 'APPROVED';
              rec.review_comment = 'Auto-approved clean record';
            }
          });
          setPage(p => p);
        } else {
          setToastMessage('No new clean records to auto-approve');
        }
      } catch (err) {
        console.error('Auto-approval failed:', err);
      } finally {
        setIsProcessing(false);
      }
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
      {toastMessage && (
        <div className="mb-6 flex items-center justify-between bg-emerald-100 border-2 border-slate-900 text-emerald-900 px-4 py-3 rounded-2xl shadow-sketch-sm font-black text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage('')}
            className="p-1 rounded-md hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            {onlyMlAnomalies ? (
              <Cpu className="w-5 h-5 text-amber-500 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            )}
            {onlyMlAnomalies ? 'ML Outlier Verification Queue' : 'Field Data Verification Inspector'}
          </h3>
          <p className="text-xs font-bold text-slate-500">
            {onlyMlAnomalies
              ? 'Supervised review queue for records flagged by Isolation Forest anomaly engine'
              : 'Real-time record inspection, dynamic schema validation, and supervisor review'}
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

          {/* Auto-approve Clean Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border-2 border-slate-900 px-3.5 py-1.5 rounded-xl shadow-sketch-sm text-xs font-black text-slate-800 hover:bg-slate-100 transition-all select-none">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={handleToggleAutoApprove}
              disabled={isProcessing}
              className="rounded text-blue-600 border-2 border-slate-900 focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            <span>Auto-approve clean</span>
          </label>

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
              {onlyMlAnomalies && <th className="py-3.5 px-3">ML Anomaly Score</th>}
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
                const rowFindings = [
                  ...recViolations.map(v => ({
                    type: v.rule_type,
                    reason: v.description,
                    colorClass: 'text-rose-600'
                  })),
                  ...(rec.has_ml_anomaly ? [{
                    type: 'Outlier',
                    reason: 'Multivariate outlier flagged by Isolation Forest ML anomaly check',
                    colorClass: 'text-amber-600'
                  }] : []),
                  ...(rec.has_enum_bias ? [{
                    type: 'Staff Skew',
                    reason: 'Interviewer exhibits significant reporting variance (enumerator bias)',
                    colorClass: 'text-purple-600'
                  }] : [])
                ];

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
                        <div className="flex flex-wrap items-center gap-1.5">
                          {recViolations.slice(0, 2).map((v, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-slate-900 px-2 py-0.5 rounded-md text-[9px] font-black truncate max-w-[150px]"
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

                          {/* Consolidated Popover Details Trigger */}
                          {rowFindings.length > 0 && (
                            <div className="relative inline-block shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPopoverIndex(openPopoverIndex === rec._index ? null : rec._index);
                                }}
                                className="findings-popover-btn p-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-900 shadow-sketch-sm hover:shadow-sketch transition-all cursor-pointer flex items-center justify-center text-slate-700 hover:text-slate-900"
                                title="View quality findings details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {openPopoverIndex === rec._index && (
                                <div className="findings-popover absolute z-50 left-0 mt-2 w-72 sm:w-80 bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sketch text-left font-bold text-slate-800">
                                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 mb-3">
                                    <span className="text-xs font-black text-slate-900 uppercase">Quality Findings Details</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenPopoverIndex(null);
                                      }}
                                      className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                    {rowFindings.map((finding, idx) => (
                                      <div key={idx} className="text-xs leading-normal">
                                        <span className={`font-black uppercase tracking-wider ${finding.colorClass}`}>
                                          {finding.type}
                                        </span>
                                        <span className="text-slate-400 font-bold mx-1">:</span>
                                        <span className="text-slate-600 font-semibold">{finding.reason}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ML Anomaly Score */}
                      {onlyMlAnomalies && (
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-slate-900 px-2 py-1 rounded-md text-[10px] font-black">
                            {rec.ml_anomaly_score !== undefined && rec.ml_anomaly_score !== null ? rec.ml_anomaly_score.toFixed(4) : '—'}
                          </span>
                        </td>
                      )}

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
                        <td colSpan={displayColumns.slice(0, 6).length + (onlyMlAnomalies ? 6 : 5)} className="p-4 border-2 border-dashed border-amber-300 rounded-xl">
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
