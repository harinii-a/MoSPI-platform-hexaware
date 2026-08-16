import React, { useState } from 'react';
import { GraduationCap, CheckCircle, PlayCircle, ArrowRight } from 'lucide-react';

export default function HsdTrainingSection() {
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      id: 0,
      title: 'Module 1: Survey Microdata Quality Basics',
      duration: '15 min',
      description: 'Understanding dynamic verification rules, range boundaries, nullity constraints, and relational consistency.',
      steps: [
        'Identify mandatory survey identifiers (Record ID, State, District, Primary Sampling Unit).',
        'Recognize demographic and measure inconsistency flags across microdata variables.',
        'Verify continuous measurement ranges and detect statistical IQR boundaries.',
        'Inspect non-negative economic variables (Income, Expenditure, Consumption).',
      ],
      scenario: 'Scenario: Enumerator reports values violating logical demographic constraints. Action: Flag record in validation inspector, issue correction request to field staff.',
    },
    {
      id: 1,
      title: 'Module 2: Machine Learning & Outlier Diagnostics',
      duration: '20 min',
      description: 'How Isolation Forest algorithms detect subtle multidimensional outliers across numeric survey measures.',
      steps: [
        'Understand automated anomaly scoring and probability density estimators.',
        'Review Explainable AI multi-factor evidence decomposition (Deterministic Rules, Isolation Forest ML, Staff Skew, Cluster Deviations).',
        'Investigate multivariate outliers that pass basic univariate rule checks but deviate in combined multidimensional space.',
      ],
      scenario: 'Scenario: Record shows extreme multivariate consumption-to-income disparity. Action: Review AI decomposition, confirm outlier flag, escalate for field re-verification.',
    },
    {
      id: 2,
      title: 'Module 3: Supervisor Live Triage Workflow',
      duration: '25 min',
      description: 'Managing the live real-time review queue, adding notes, and executing formal status transitions.',
      steps: [
        'Monitor live stream queue (auto-refreshed in real-time via WebSockets).',
        'Apply supervisor action: APPROVE, NEEDS_CORRECTION, or ESCALATE.',
        'Enter mandatory supervisor audit notes for field transparency.',
        'Track compliance and review history in the dataset-scoped immutable audit log.',
      ],
      scenario: 'Scenario: High-risk record flagged by automated engines. Action: Enter investigation notes in queue, mark status as ESCALATED, notify Regional Survey Office.',
    },
    {
      id: 3,
      title: 'Module 4: Regional Sampling Unit & Staff Variance',
      duration: '20 min',
      description: 'Analyzing sampling unit clusters, enumerator variance (>2σ), and longitudinal trend drift.',
      steps: [
        'Compare current regional means against longitudinal baseline datasets.',
        'Identify enumerator reporting bias exceeding 2 standard deviations (>2σ) from survey baseline.',
        'Group spatial anomalies by First Stage Units (FSU/PSU) and urban/rural sector clusters.',
      ],
      scenario: 'Scenario: A regional sampling unit shows significant statistical deviation. Action: Inspect cluster scorecard, check enumerator variance alerts, request supervisor field check.',
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-sketch-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Interactive Field Training Manual</h2>
              <p className="text-xs font-semibold text-slate-300">
                Guided Onboarding & Operational Guidelines for Field Supervisors and Enumerators
              </p>
            </div>
          </div>
          <span className="bg-amber-400 text-slate-900 text-xs font-black px-4 py-2 rounded-xl border-2 border-white shadow-sketch-sm">
            Interactive Training Mode
          </span>
        </div>
      </div>

      {/* Module Selector & Active Training Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Sidebar */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
            Training Modules
          </h3>
          {modules.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(idx)}
              className={`w-full text-left p-4 rounded-2xl border-2 border-slate-900 transition-all cursor-pointer shadow-sketch-sm ${
                activeModule === idx
                  ? 'bg-blue-600 text-white shadow-sketch'
                  : 'bg-white text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-black ${activeModule === idx ? 'text-white' : 'text-slate-900'}`}>
                  {m.title}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${activeModule === idx ? 'bg-white text-blue-900 border-white' : 'bg-slate-100 text-slate-700 border-slate-900'}`}>
                  {m.duration}
                </span>
              </div>
              <p className={`text-[11px] font-semibold line-clamp-2 ${activeModule === idx ? 'text-blue-100' : 'text-slate-500'}`}>
                {m.description}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Module Detail */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-blue-900 bg-blue-100 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
                {modules[activeModule].title}
              </span>
              <span className="text-xs text-slate-500 font-bold">Time: {modules[activeModule].duration}</span>
            </div>

            <h3 className="font-black text-slate-900 text-lg mb-3">{modules[activeModule].description}</h3>

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Key Learning Steps</h4>
              {modules[activeModule].steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs font-bold text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>

            {/* Scenario Card */}
            <div className="mt-6 bg-amber-50 border-2 border-slate-900 rounded-2xl p-4 shadow-sketch-sm">
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <PlayCircle className="w-4 h-4 text-blue-600" /> Practical Field Verification Scenario
              </div>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">{modules[activeModule].scenario}</p>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-slate-900 mt-6 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">Field Verification Manual v2.4</span>
            <button
              onClick={() => setActiveModule((activeModule + 1) % modules.length)}
              className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <span>Next Module</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
