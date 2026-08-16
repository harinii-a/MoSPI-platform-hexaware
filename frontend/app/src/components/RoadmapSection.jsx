import React from 'react';
import { ShieldCheck, GitBranch, Server, Lock, Cpu, CheckCircle2 } from 'lucide-react';

export default function RoadmapSection() {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'Validation & Quality Engine',
      status: 'Active MVP',
      statusColor: 'bg-emerald-100 text-emerald-900 border-slate-900',
      isCurrent: true,
      items: [
        'Deterministic rule verification engine',
        'Smart AI outlier anomaly detection',
        'Statistical drift and trend tracking',
        'Real-time WebSockets streaming layer',
      ],
    },
    {
      phase: 'Phase 2',
      title: 'Field API Integration',
      status: 'Target Q3 2026',
      statusColor: 'bg-blue-100 text-blue-900 border-slate-900',
      isCurrent: false,
      items: [
        'Mobile app real-time data sync',
        'Secure API token authentication',
        'Automated batch sync on network link',
        'Encrypted payload transfer',
      ],
    },
    {
      phase: 'Phase 3',
      title: 'Supervisor Action Center',
      status: 'Target Q4 2026',
      statusColor: 'bg-amber-100 text-amber-900 border-slate-900',
      isCurrent: false,
      items: [
        'Supervisor workflow review portal',
        'Comment & re-enumeration escalation',
        'Staff quality scorecards',
        'Real-time supervisor push alerts',
      ],
    },
    {
      phase: 'Phase 4',
      title: 'Enterprise Security & Deployment',
      status: 'Target Q1 2027',
      statusColor: 'bg-purple-100 text-purple-900 border-slate-900',
      isCurrent: false,
      items: [
        'Container orchestration layer',
        'Enterprise database & cache layer',
        'Immutable security audit logs',
        'Interactive field staff onboarding',
      ],
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Security Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sketch-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Data Security & Confidentiality Framework</h3>
              <p className="text-xs font-bold text-slate-500">
                Compliance with Data Security & Confidentiality Guidelines
              </p>
            </div>
          </div>
          <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
            Compliant Design
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 shadow-sketch-sm">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs mb-1">
              <Lock className="w-4 h-4 text-blue-600" /> Local Processing
            </div>
            <p className="text-xs font-bold text-slate-600">Analyzed in-memory; no external cloud data exposure.</p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 shadow-sketch-sm">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs mb-1">
              <Server className="w-4 h-4 text-emerald-600" /> Session Buffering
            </div>
            <p className="text-xs font-bold text-slate-600">Transient session storage with zero persistent exposure.</p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 shadow-sketch-sm">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs mb-1">
              <Cpu className="w-4 h-4 text-purple-600" /> Offline Readiness
            </div>
            <p className="text-xs font-bold text-slate-600">Fully functional in air-gapped regional field offices.</p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 shadow-sketch-sm">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Role Security
            </div>
            <p className="text-xs font-bold text-slate-600">Granular supervisor role access & audit logging.</p>
          </div>
        </div>
      </div>

      {/* Integration Roadmap */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Enterprise System Roadmap</h3>
            <p className="text-xs font-bold text-slate-500">
              Architectural deployment progression from Phase 1 to Phase 4
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-indigo-100 text-indigo-900 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
            <GitBranch className="w-4 h-4 text-indigo-600" /> Roadmap Strategy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {phases.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 border-2 border-slate-900 flex flex-col justify-between shadow-sketch-sm ${
                item.isCurrent ? 'bg-amber-50' : 'bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black text-blue-600">{item.phase}</span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${item.statusColor}`}>
                    {item.status}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 text-sm mb-3">{item.title}</h4>

                <ul className="space-y-2 text-xs font-bold text-slate-700 mb-4">
                  {item.items.map((sub, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
