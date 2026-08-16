import React from 'react';
import { UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function EnumeratorSection({ summary }) {
  const enumData = summary?.enumerator_analysis || {};
  const isAvailable = enumData.available;
  const alerts = enumData.alerts || [];
  const enumerators = enumData.enumerators || [];
  const enumColumn = enumData.enumerator_column || 'Enumerator';

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            Field Staff Quality & Variance Insights
          </h3>
          <p className="text-xs font-bold text-slate-500">
            Statistical deviation and anomaly detection for field interviewers ({enumColumn})
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-black bg-purple-100 text-purple-900 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
          <UserCheck className="w-4 h-4 text-purple-600" /> Quality Inspector
        </span>
      </div>

      {!isAvailable ? (
        <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-600">
            {enumData.message || 'Enumerator analysis unavailable because no enumerator identifier was detected.'}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            To enable staff quality scorecards, map an enumerator/investigator column in Dataset Configuration.
          </p>
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {alerts.map((item, idx) => (
              <div key={idx} className="bg-purple-50/70 border-2 border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-sketch-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white border-2 border-slate-900 flex items-center justify-center font-black text-sm shadow-sketch-sm">
                      {item.enumerator_id}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Staff Member #{item.enumerator_id}</h4>
                      <p className="text-[11px] font-bold text-slate-600">
                        Variable: <span className="font-black text-slate-900">{item.measure}</span>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-slate-900 shadow-sketch-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> {item.deviation_sigma}σ Deviation
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                  {item.message}
                </div>
              </div>
            ))}
          </div>

          {/* Enumerator Summary List */}
          <div className="mt-4 pt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Tracking {enumerators.length} active enumerators across {summary?.total_records?.toLocaleString()} records</span>
            <span className="text-purple-700 font-black">{alerts.length} statistically significant alerts detected</span>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-emerald-50 rounded-2xl text-center border-2 border-slate-900 shadow-sketch-sm">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-900">
            No abnormal staff reporting variance detected across active survey records.
          </p>
          <p className="text-xs text-slate-500 font-bold mt-1">
            All {enumerators.length} tracked enumerators are within 2 standard deviations of normal baseline distributions.
          </p>
        </div>
      )}
    </div>
  );
}
