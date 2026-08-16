import React from 'react';
import { FileCheck, ShieldAlert, Cpu, UserCheck, Activity, AlertCircle } from 'lucide-react';

export default function KpiCards({ summary }) {
  if (!summary) return null;

  const totalRecords = summary.total_records || 0;
  const totalColumns = summary.total_columns || 0;
  const integrityFlags = summary.integrity_violation_count || 0;
  const mlAnomalies = summary.ml_anomaly_count || 0;
  const highRiskCount = summary.high_risk_count || 0;
  const clusterCount = summary.clusters?.length || 0;
  const missingPct = summary.overall_missing_pct || 0;

  const enumData = summary.enumerator_analysis || {};
  const enumeratorAlerts = enumData.alert_count || 0;
  const totalEnumerators = enumData.total_enumerators || 0;

  // Clean data rate
  const cleanRate = totalRecords > 0
    ? Math.max(0, Math.round(((totalRecords - highRiskCount) / totalRecords) * 100))
    : 100;

  const cards = [
    {
      score: totalRecords.toLocaleString(),
      scoreBg: 'bg-blue-600 text-white',
      title: 'Survey Records Loaded',
      metric1Label: 'Variables',
      metric1Value: `${totalColumns}`,
      metric1Unit: 'cols',
      metric2Label: 'Missing Rate',
      metric2Value: `${missingPct.toFixed(1)}%`,
      metric2Unit: 'avg',
      icon: FileCheck,
      badgeText: 'Active Dataset',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      score: integrityFlags.toLocaleString(),
      scoreBg: integrityFlags > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white',
      title: 'Rule Integrity Flags',
      metric1Label: 'High Risk Rec.',
      metric1Value: `${highRiskCount}`,
      metric1Unit: 'records',
      metric2Label: 'Clean Rate',
      metric2Value: `${cleanRate}%`,
      metric2Unit: 'health',
      icon: ShieldAlert,
      badgeText: integrityFlags > 0 ? `${integrityFlags} Violations` : 'All Clean',
      badgeColor: integrityFlags > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      score: mlAnomalies.toLocaleString(),
      scoreBg: mlAnomalies > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white',
      title: 'ML Anomaly Alerts',
      metric1Label: 'Feature Count',
      metric1Value: `${summary.ml_info?.features_used?.length || 0}`,
      metric1Unit: 'features',
      metric2Label: 'Outlier Rate',
      metric2Value: `${totalRecords > 0 ? ((mlAnomalies / totalRecords) * 100).toFixed(1) : 0}%`,
      metric2Unit: 'rate',
      icon: Cpu,
      badgeText: 'Isolation Forest',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      score: enumData.available ? enumeratorAlerts.toLocaleString() : (clusterCount > 0 ? clusterCount.toLocaleString() : '0'),
      scoreBg: enumData.available ? (enumeratorAlerts > 0 ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white') : 'bg-slate-700 text-white',
      title: enumData.available ? 'Staff Quality Inspector' : (clusterCount > 0 ? 'Cluster Coverage' : 'Quality Evaluation'),
      metric1Label: enumData.available ? 'Active Staff' : 'Clusters',
      metric1Value: `${enumData.available ? totalEnumerators : clusterCount}`,
      metric1Unit: enumData.available ? 'staff' : 'units',
      metric2Label: enumData.available ? 'Deviations (>2σ)' : 'High Risk Clusters',
      metric2Value: `${enumData.available ? enumeratorAlerts : (summary.clusters?.filter(c => c.riskLevel === 'High Risk')?.length || 0)}`,
      metric2Unit: 'flags',
      icon: UserCheck,
      badgeText: enumData.available ? 'Enumerator Tracking' : (clusterCount > 0 ? 'Geographic' : 'Automated'),
      badgeColor: enumData.available ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-sketch-sm hover:shadow-sketch transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`px-3 py-1.5 rounded-xl ${card.scoreBg} border-2 border-slate-900 flex items-center justify-center font-black text-sm shadow-sketch-sm`}>
                  {card.score}
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-900 ${card.badgeColor}`}>
                  {card.badgeText}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-snug mb-4">
                {card.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-slate-100">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-0.5">{card.metric1Label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">{card.metric1Value}</span>
                  <span className="text-[10px] font-bold text-slate-500">{card.metric1Unit}</span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-0.5">{card.metric2Label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">{card.metric2Value}</span>
                  <span className="text-[10px] font-bold text-slate-500">{card.metric2Unit}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
