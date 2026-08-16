import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export default function DriftSection({ summary }) {
  const drift = summary?.drift;
  const comparisons = drift?.comparisons || [];
  const hasHistorical = drift?.has_historical && comparisons.length > 0;
  const message = drift?.message || 'Historical baseline comparison unavailable.';

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Survey Trend & Statistical Drift Analytics
          </h3>
          <p className="text-xs font-bold text-slate-500">
            Automated measure shift comparison against historical baseline dataset
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-black bg-indigo-100 text-indigo-900 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
          <TrendingUp className="w-4 h-4 text-indigo-600" /> Drift Engine
        </span>
      </div>

      {hasHistorical ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
          {comparisons.map((item, idx) => {
            const isNegative = item.diff < 0;
            return (
              <div key={idx} className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-sketch-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-base">{item.group}</span>
                    <span className="text-[10px] font-bold text-slate-500 block">Variable: {item.measure}</span>
                  </div>
                  <span className={`inline-flex items-center text-xs font-black px-2.5 py-1 rounded-lg border border-slate-900 ${
                    isNegative ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isNegative ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                    {item.pct_change > 0 ? `+${item.pct_change}%` : `${item.pct_change}%`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t-2 border-slate-900">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Current Mean</span>
                    <span className="text-base font-black text-slate-900">{item.current?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">Historical Mean</span>
                    <span className="text-base font-black text-slate-900">{item.historical?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center mt-4">
          <p className="text-sm font-bold text-slate-600">
            {message}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Upload a historical baseline dataset in the Datasets section to enable longitudinal drift and trend tracking.
          </p>
        </div>
      )}
    </div>
  );
}
