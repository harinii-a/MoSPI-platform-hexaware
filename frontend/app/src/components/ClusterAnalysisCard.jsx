import React from 'react';
import { Network, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ClusterAnalysisCard({ summary, datasetId }) {
  if (!summary) return null;

  const clusters = summary.clusters || [];
  const clusterColumn = summary.cluster_column || 'Cluster';
  const hasClusters = summary.has_clusters && clusters.length > 0;

  const highRiskClusters = clusters.filter((c) => c.riskLevel === 'High Risk');

  if (!hasClusters) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              Regional & Cluster Quality Inspector
            </h3>
            <p className="text-xs font-bold text-slate-500">
              Aggregated geographic and primary sampling unit health assessment
            </p>
          </div>
        </div>
        <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-600">
            No cluster, district, or geographic dimension detected in the active dataset.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Cluster analytics will automatically activate when a state, district, PSU, or cluster variable is mapped.
          </p>
        </div>
      </div>
    );
  }

  const getBadgeStyle = (level) => {
    switch (level) {
      case 'High Risk':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Medium Risk':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              Regional Quality Inspector ({clusterColumn})
            </h3>
            {highRiskClusters.length > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full border-2 border-slate-900 shadow-sketch-sm">
                {highRiskClusters.length} High Priority Clusters
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Aggregate survey data quality grouped by detected dimension: <span className="font-black text-slate-700">{clusterColumn}</span>
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-black bg-blue-100 text-blue-800 px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm w-fit">
          <Network className="w-4 h-4 text-blue-600" /> {clusters.length} Sampling Units
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="bg-amber-50/40 border-2 border-slate-900 rounded-2xl p-5 flex flex-col justify-between hover:bg-amber-50 transition-all shadow-sketch-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center border-2 border-slate-900 shadow-sketch-sm">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-black text-slate-900 text-sm">{cluster.name}</span>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getBadgeStyle(cluster.riskLevel)}`}>
                  {cluster.riskLevel}
                </span>
              </div>

              <p className="text-xs text-slate-600 font-bold mb-4 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                Primary Status: <span className="text-slate-900 font-black">{cluster.primaryDriver}</span>
              </p>
            </div>

            <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">
                <strong className="text-slate-900 font-black">{cluster.flaggedCount}</strong> of {cluster.records} Flagged
                <span className="text-[10px] text-slate-400 font-semibold ml-1">({cluster.anomalyRate}%)</span>
              </span>
              <span className="font-black text-slate-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-900">
                {cluster.riskScore}/100
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
