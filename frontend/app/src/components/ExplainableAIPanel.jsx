import React, { useState } from 'react';
import { Brain, ShieldAlert, Cpu, UserX, ChevronDown, ChevronUp, Loader2, Sparkles, MapPin } from 'lucide-react';
import { datasetApi } from '../api';

export default function ExplainableAIPanel({ summary, datasetId }) {
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [loading, setLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAttention, setFilterAttention] = useState('ALL');

  const records = summary?.records || [];

  const filteredRecords = records.filter((rec) => {
    // 1. Filter by Record ID
    const recIdStr = String(rec.record_id ?? rec._index ?? '');
    const matchesSearch = recIdStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filter by Attention Level (matches 'High', 'Medium', or anything else/not high/medium as low)
    let matchesAttention = true;
    if (filterAttention === 'HIGH') matchesAttention = rec.risk_level === 'High';
    else if (filterAttention === 'MEDIUM') matchesAttention = rec.risk_level === 'Medium';
    else if (filterAttention === 'LOW') matchesAttention = rec.risk_level !== 'High' && rec.risk_level !== 'Medium';
    
    return matchesSearch && matchesAttention;
  });

  const fetchExplanation = async (recordIndex) => {
    if (explanations[recordIndex]) {
      setExpandedRecord(expandedRecord === recordIndex ? null : recordIndex);
      return;
    }

    if (!datasetId) return;

    setLoading((prev) => ({ ...prev, [recordIndex]: true }));
    try {
      const res = await datasetApi.explain(datasetId, recordIndex);
      setExplanations((prev) => ({ ...prev, [recordIndex]: res.data }));
      setExpandedRecord(recordIndex);
    } catch (err) {
      console.error('Error fetching explanation:', err);
    } finally {
      setLoading((prev) => ({ ...prev, [recordIndex]: false }));
    }
  };

  const getBarColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'High':
        return 'bg-rose-100 text-rose-800 border-slate-900';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-slate-900';
      default:
        return 'bg-emerald-100 text-emerald-800 border-slate-900';
    }
  };

  const getFactorIcon = (factor) => {
    if (factor.includes('Rule')) return <ShieldAlert className="w-5 h-5 text-rose-600" />;
    if (factor.includes('Isolation') || factor.includes('ML')) return <Cpu className="w-5 h-5 text-amber-600" />;
    if (factor.includes('Cluster') || factor.includes('Geographic')) return <MapPin className="w-5 h-5 text-blue-600" />;
    return <UserX className="w-5 h-5 text-purple-600" />;
  };

  if (!records || records.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
        <p className="text-sm font-bold text-slate-500 text-center py-6">
          No records loaded to inspect.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-slate-900 flex items-center justify-center shadow-sketch-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Smart AI Explainability Inspector</h3>
            <p className="text-xs font-bold text-slate-500">Transparent multi-factor evidence decomposition for automated risk evaluation</p>
          </div>
        </div>
        <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> AI Engine Active
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Record ID..."
            className="w-full pl-3.5 pr-8 py-2 bg-slate-50 border-2 border-slate-900 text-xs font-bold rounded-xl text-slate-900 focus:outline-none shadow-sketch-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 font-bold text-xs cursor-pointer select-none"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Attention Filter Chips & Counter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border-2 border-slate-900 shadow-sketch-sm">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterAttention(lvl)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterAttention === lvl
                    ? 'bg-blue-600 text-white shadow-sketch-sm'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lvl === 'ALL' ? 'ALL' : `${lvl} ATTENTION`}
              </button>
            ))}
          </div>

          <span className="text-xs font-black text-slate-900 bg-amber-100 px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm">
            {filteredRecords.slice(0, 50).length} of {records.length} records
          </span>
        </div>
      </div>

      {/* Large Dataset Note Disclaimer */}
      {records.length >= 50 && (
        <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
          * Operating on the top high-risk records loaded for explainability. For full query searching across the entire dataset, please use the Verification Inspector tab.
        </p>
      )}

      <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
        {filteredRecords.length > 0 ? (
          filteredRecords.slice(0, 50).map((rec) => {
            const idx = rec._index;
            const explanation = explanations[idx];
            const isExpanded = expandedRecord === idx;
            const isLoading = loading[idx];

            return (
              <div key={idx} className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-sketch-sm bg-white">
                {/* Clickable Header */}
                <button
                  onClick={() => fetchExplanation(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-black text-slate-900 text-base">Record #{rec.record_id ?? idx}</span>
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${getRiskColor(rec.risk_level)}`}>
                      {rec.risk_level} Attention
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {rec.risk_score}<span className="text-xs text-slate-500 font-bold">/100</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-900" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-900" />
                    )}
                  </div>
                </button>

                {/* Expanded Explanation */}
                {isExpanded && explanation && (
                  <div className="px-5 pb-5 bg-amber-50/30 border-t-2 border-slate-900">
                    <div className="space-y-4 mt-4">
                      {explanation.factors.map((factor, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-slate-900 shadow-sketch-sm">
                          <div className="mt-0.5 shrink-0">{getFactorIcon(factor.factor)}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-900">{factor.factor}</span>
                              <span className="text-xs font-black text-slate-900">
                                +{factor.score}<span className="text-slate-500 font-bold">/{factor.max}</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-900 overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(factor.severity)}`}
                                style={{ width: `${(factor.score / factor.max) * 100}%` }}
                              />
                            </div>
                            <p className="text-[11px] font-bold text-slate-600">{factor.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Bar */}
                    <div className="mt-5 pt-4 border-t-2 border-slate-900 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Overall Health & Risk Score</span>
                      <span className={`text-xs font-black px-3.5 py-1 rounded-full border-2 ${getRiskColor(explanation.risk_level)}`}>
                        {explanation.total_risk_score}/100 Rating
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <p className="text-xs font-bold text-slate-500">No matching records</p>
          </div>
        )}
      </div>
    </div>
  );
}
