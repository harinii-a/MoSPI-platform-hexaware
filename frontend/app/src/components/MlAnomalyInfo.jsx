import { Cpu, Brain, Layers, AlertCircle } from 'lucide-react';

export default function MlAnomalyInfo({ summary }) {
  if (!summary) return null;

  const mlAnomalyCount = summary.ml_anomaly_count || 0;
  const totalRecords = summary.total_records || 0;
  const mlInfo = summary.ml_info || {};
  const featuresUsed = mlInfo.features_used || [];
  const error = mlInfo.error;

  const outlierRate = totalRecords > 0 ? ((mlAnomalyCount / totalRecords) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-5">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-500 animate-pulse" />
            Unsupervised Machine Learning Outlier Analysis
          </h3>
          <p className="text-xs font-bold text-slate-500">
            Real-time multidimensional anomaly detection using an Isolation Forest algorithm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-100 text-amber-900 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
            <Brain className="w-4 h-4 text-amber-600" /> Isolation Forest
          </span>
        </div>
      </div>

      {error ? (
        <div className="p-5 bg-rose-50 border-2 border-slate-900 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-slate-900">ML Model Warning</h4>
            <p className="text-xs text-slate-600 font-bold mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outlier Count Card */}
          <div className="bg-amber-50/50 border-2 border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-sketch-sm">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Outliers Detected</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{mlAnomalyCount.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-500">records</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 mt-4 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Outlier Rate</span>
              <span className="font-black text-amber-600 bg-white px-2 py-0.5 rounded-lg border border-slate-300">{outlierRate}%</span>
            </div>
          </div>

          {/* Features Used Card */}
          <div className="bg-blue-50/50 border-2 border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-sketch-sm lg:col-span-2">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Active Model Input Dimensions ({featuresUsed.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {featuresUsed.length > 0 ? (
                  featuresUsed.map((feat) => (
                    <span key={feat} className="bg-white text-slate-800 border border-slate-300 text-[10px] font-black px-2.5 py-1 rounded-lg">
                      {feat}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 font-semibold italic">No numerical dimensions selected for scoring.</span>
                )}
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-normal mt-4">
              The model automatically isolates observations that exhibit anomalous multivariate coordinates across the active variables shown above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
