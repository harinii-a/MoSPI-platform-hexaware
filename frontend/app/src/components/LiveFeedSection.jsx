import React, { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, Send, RefreshCw, Radio, Sparkles, UserCheck } from 'lucide-react';
import { datasetApi } from '../api';

export default function LiveFeedSection({ datasetId, summary }) {
  const [commentInputs, setCommentInputs] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const records = summary?.records || [];
  const displayColumns = summary?.display_columns || [];

  // Filter records needing attention / review
  const pendingRecords = records.filter(
    (r) => r.risk_level === 'High' || r.risk_level === 'Medium' || r.review_status !== 'APPROVED'
  ).slice(0, 30);

  const handleReviewAction = async (recordIndex, status) => {
    if (!datasetId) return;
    const comment = commentInputs[recordIndex] || `Supervisor marked as ${status}`;
    try {
      await datasetApi.review(datasetId, recordIndex, {
        status,
        comment,
      });
      // Update local state
      const target = records.find((r) => r._index === recordIndex);
      if (target) {
        target.review_status = status;
        target.review_comment = comment;
      }
      setLastUpdated(new Date().toLocaleTimeString());
      setCommentInputs({ ...commentInputs, [recordIndex]: '' });
    } catch (err) {
      console.error('Review submission error:', err);
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
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-sketch-sm">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h3 className="font-black text-xl text-white">Live Field Review & Triage Queue</h3>
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Real-time active verification feed for pending survey responses and supervisor triage
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-400 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-sketch-sm shrink-0">
            Active Stream • Last Action {lastUpdated}
          </span>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Supervisor Action Center</h3>
            <p className="text-xs font-bold text-slate-500">Review pending responses, add notes, and approve or request correction</p>
          </div>
          <span className="text-xs font-black text-blue-800 bg-blue-100 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
            {pendingRecords.length} Items in Live Queue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
              <tr>
                <th className="py-3.5 px-4 rounded-l-xl">Record</th>
                {displayColumns.slice(0, 4).map((col) => (
                  <th key={col} className="py-3.5 px-4 whitespace-nowrap">{col}</th>
                ))}
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Supervisor Notes</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-bold">
              {pendingRecords.length > 0 ? (
                pendingRecords.map((item) => (
                  <tr key={item._index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                      #{item.record_id ?? item._index}
                    </td>

                    {displayColumns.slice(0, 4).map((col) => (
                      <td key={col} className="py-4 px-4 text-slate-800 whitespace-nowrap max-w-[120px] truncate" title={String(item[col] ?? '')}>
                        {item[col] !== null && item[col] !== undefined ? String(item[col]) : '—'}
                      </td>
                    ))}

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        item.risk_level === 'High' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        item.risk_level === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {item.risk_score}/100 • {item.risk_level}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border ${getStatusBadge(item.review_status)}`}>
                        {item.review_status || 'NEW'}
                      </span>
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-col gap-1.5">
                        {item.review_comment && (
                          <span className="text-slate-800 text-[11px] italic font-semibold truncate">
                            "{item.review_comment}"
                          </span>
                        )}
                        <input
                          type="text"
                          placeholder="Add supervisor note..."
                          value={commentInputs[item._index] || ''}
                          onChange={(e) =>
                            setCommentInputs({ ...commentInputs, [item._index]: e.target.value })
                          }
                          className="bg-slate-100 border-2 border-slate-900 text-[11px] rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none"
                        />
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReviewAction(item._index, 'APPROVED')}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-2 border-slate-900 text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sketch-sm transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(item._index, 'NEEDS_CORRECTION')}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-slate-900 text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sketch-sm transition-all cursor-pointer"
                        >
                          Correction
                        </button>
                        <button
                          onClick={() => handleReviewAction(item._index, 'ESCALATED')}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-900 border-2 border-slate-900 text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sketch-sm transition-all cursor-pointer"
                        >
                          Escalate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayColumns.slice(0, 4).length + 5} className="py-8 text-center text-slate-500 font-bold">
                    No records currently pending supervisor triage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
