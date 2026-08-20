import React, { useState } from 'react';
import {
  Server,
  ShieldCheck,
  GitBranch,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';

export default function RoadmapSection() {
  const [expandedPhases, setExpandedPhases] = useState({});
  const [expandAll, setExpandAll] = useState(false);

  const toggleExpand = (idx) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleToggleAll = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    const updated = {};
    for (let i = 0; i <= 5; i++) {
      updated[i] = newExpandAll;
    }
    setExpandedPhases(updated);
  };

  const phases = [
    {
      num: 0,
      title: 'Current State',
      summary: 'Standalone validation sandbox running offline verification experiments.',
      details: [
        'Standalone platform, data pulled via custom queries/manual export from eSigma.',
        'No live coupling with eSigma.'
      ],
      colorClass: 'bg-slate-50 border-slate-400 text-slate-700 hover:bg-slate-100/70',
      badgeBg: 'bg-slate-200 text-slate-800 border-slate-400',
      activeColor: 'text-slate-600',
      status: 'Current sandbox'
    },
    {
      num: 1,
      title: 'Offline Batch Integration',
      summary: 'Staged database export pipelines executing read-only batch validation.',
      details: [
        "eSigma exports new records to a staging area on a schedule (e.g., nightly).",
        "Never touches eSigma's production database directly.",
        "A defined data contract (stable schema) between eSigma's export and our ingestion layer — protects us if eSigma's internal schema changes.",
        'Our platform pulls from staging and runs batch validation.',
        "Zero risk to eSigma's live operations."
      ],
      colorClass: 'bg-sky-50 border-sky-400 text-sky-900 hover:bg-sky-100/70',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-400',
      activeColor: 'text-sky-600',
      status: 'Read-only batch'
    },
    {
      num: 2,
      title: 'Near-Real-Time Integration',
      summary: 'Asynchronous messaging via Kafka for near-instant outlier feedback loops.',
      details: [
        'Event-driven: CAPI submission → eSigma writes to DB → publishes event (via Kafka) → our platform consumes and scores it asynchronously.',
        "Anti-corruption layer: a thin adapter service translates eSigma's format into our internal model, so our core logic never depends directly on eSigma's schema.",
        'Still read-only — we only consume, not write back.',
        'Lets us prove model accuracy in near-real-time with low risk.'
      ],
      colorClass: 'bg-blue-50/80 border-blue-400 text-blue-900 hover:bg-blue-100/70',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-400',
      activeColor: 'text-blue-600',
      status: 'Event-driven ingestion'
    },
    {
      num: 3,
      title: 'Bidirectional Integration',
      summary: 'Active REST write-back pushing scores directly into supervisor UI.',
      details: [
        'Our platform pushes flags/anomaly scores back into eSigma via a versioned API.',
        "Supervisors see flags directly inside eSigma's own UI.",
        'Least-privilege access: we can only write to a flags/metadata table, never touch raw survey data.',
        'Requires an API gateway with auth, rate-limiting, and audit logging.'
      ],
      colorClass: 'bg-indigo-50 border-indigo-400 text-indigo-900 hover:bg-indigo-100/70',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-400',
      activeColor: 'text-indigo-600',
      status: 'API write-back'
    },
    {
      num: 4,
      title: 'Embedded Validation',
      summary: 'Microservice library directly integrated into CAPI field application.',
      details: [
        'Validation logic packaged as a callable microservice/library.',
        "eSigma's CAPI flow invokes it directly at the point of data entry.",
        'Real-time ML-based soft checks run alongside existing static hard/soft checks.',
        'This is where our intelligent checks start augmenting/replacing the static rule-based ones.'
      ],
      colorClass: 'bg-teal-50 border-teal-400 text-teal-950 hover:bg-teal-100/70',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-400',
      activeColor: 'text-teal-600',
      status: 'Inline validation'
    },
    {
      num: 5,
      title: 'General-Purpose Platform',
      summary: 'Multi-tenant, registry-based deployment across ASI, PLFS, and NSS rounds.',
      details: [
        'Multi-tenant, config-driven architecture.',
        'Same engine, different check-sets/models per survey (PLFS, ASI, other NSS rounds) via a plugin/rule-registry pattern.',
        'New surveys onboard through configuration, not new code.',
        'Data-quality metadata optionally feeds into e-Sankhyiki alongside published statistics, for transparency on data reliability.'
      ],
      colorClass: 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100/70',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-500',
      activeColor: 'text-emerald-700',
      status: 'Multi-tenant engine'
    }
  ];

  return (
    <div className="space-y-8 mb-10">
      {/* Introduction Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-900 text-xl flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              eSigma Production Integration Roadmap
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Phased migration using a strangler-fig pattern to integrate advanced AI validations with eSigma while ensuring zero production disruption.
            </p>
          </div>
          <button
            onClick={handleToggleAll}
            className="self-start md:self-center px-4 py-2 text-xs font-black bg-blue-50 hover:bg-blue-100 text-blue-800 border-2 border-slate-900 rounded-xl shadow-sketch-sm hover:shadow-sketch transition-all cursor-pointer"
          >
            {expandAll ? 'Collapse All Details' : 'Expand All Details'}
          </button>
        </div>
      </div>

      {/* Horizontal / Grid Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
        {phases.map((item, idx) => {
          const isExpanded = !!expandedPhases[idx];
          return (
            <div
              key={idx}
              className={`rounded-3xl border-2 border-slate-900 p-5 flex flex-col justify-between transition-all shadow-sketch-sm hover:shadow-sketch ${item.colorClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-900 ${item.badgeBg}`}>
                    PHASE {item.num}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {item.status}
                  </span>
                </div>

                <h3 className="font-black text-slate-900 text-base mb-2 leading-tight">
                  {item.title}
                </h3>
                
                <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">
                  {item.summary}
                </p>

                {/* Collapsible Details */}
                {isExpanded && (
                  <ul className="space-y-2 border-t-2 border-slate-200 pt-3 text-xs font-semibold text-slate-700">
                    {item.details.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-1.5 leading-normal">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${item.activeColor} shrink-0 mt-0.5`} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={() => toggleExpand(idx)}
                className="w-full mt-4 flex items-center justify-center gap-1 py-1.5 text-[10px] font-black border-t border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? 'Collapse Details' : 'View Full Details'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sequential Progression Indicator (Scannable flow overview) */}
      <div className="hidden xl:flex items-center justify-between bg-slate-50 border-2 border-slate-900 rounded-3xl px-6 py-4 shadow-sketch-sm">
        {phases.map((item, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-2.5">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border-2 border-slate-900 bg-white text-slate-900 shadow-sketch-sm`}>
                {item.num}
              </span>
              <span className="text-[11px] font-black text-slate-800 max-w-[120px] leading-tight truncate">
                {item.title}
              </span>
            </div>
            {idx < 5 && <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Cross-Cutting Principles Panel */}
      <div className="bg-amber-50/70 rounded-3xl p-6 border-2 border-amber-500 shadow-sketch">
        <h3 className="font-black text-amber-950 text-base mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-700" />
          Integration Guardrails & Cross-Cutting Principles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Point 1 */}
          <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-sketch-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-900 font-black text-xs">
                <Server className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                Government Infrastructure Only
              </div>
              <p className="text-xs font-bold text-slate-600 leading-normal">
                Deployment stays within government infra (NIC/MeghRaj cloud) at every phase, never public internet, to satisfy confidentiality mandates from day one.
              </p>
            </div>
          </div>

          {/* Point 2 */}
          <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-sketch-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-900 font-black text-xs">
                <Eye className="w-4.5 h-4.5 text-teal-600 shrink-0" />
                Shadow Mode First
              </div>
              <p className="text-xs font-bold text-slate-600 leading-normal">
                Every phase runs in parallel/shadow mode before being trusted — flags are advisory-only and compared against existing checks in production before anything becomes blocking.
              </p>
            </div>
          </div>

          {/* Point 3 */}
          <div className="bg-white rounded-2xl p-4 border-2 border-slate-900 shadow-sketch-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-900 font-black text-xs">
                <RefreshCw className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                Cheap Rollback
              </div>
              <p className="text-xs font-bold text-slate-600 leading-normal">
                Nothing is destructive until Phase 3+, so integration can be paused at any phase and eSigma keeps working exactly as before.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
