import React, { useState, useEffect } from 'react';
import { Settings, Sliders, CheckCircle2, Save, Sparkles, Shield, Cpu, UserCheck, Network } from 'lucide-react';
import { datasetApi } from '../api';

export default function SettingsPage({ datasetId }) {
  const [weights, setWeights] = useState({
    rule: 35,
    ml: 35,
    enumerator: 15,
    cluster: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    datasetApi.config(datasetId).then((res) => {
      if (res.data?.risk_weights) {
        setWeights(res.data.risk_weights);
      }
    }).catch(() => {});
  }, [datasetId]);

  const totalWeight = Object.values(weights).reduce((a, b) => Number(a) + Number(b), 0);

  const handleSave = async () => {
    if (totalWeight !== 100) {
      alert(`Weights must sum to 100%. Current total: ${totalWeight}%`);
      return;
    }
    setSaving(true);
    try {
      await datasetApi.updateConfig(datasetId, { risk_weights: weights });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save weights:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 mb-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900">System Configuration & Risk Weights</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Customize the evidence weights for multi-factor automated risk scoring
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || totalWeight !== 100}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Weights'}</span>
        </button>
      </div>

      {/* Weights Config Box */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Multi-Factor Risk Weights</h3>
            <p className="text-xs font-bold text-slate-500">Configure contribution percentages (must total 100%)</p>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full border-2 border-slate-900 shadow-sketch-sm ${
            totalWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            Total: {totalWeight}% / 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rule Integrity Weight */}
          <div className="p-4 bg-rose-50/50 rounded-2xl border-2 border-slate-900 shadow-sketch-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-black text-slate-900">Rule Integrity Weight</span>
              </div>
              <span className="text-sm font-black text-rose-800">{weights.rule}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.rule}
              onChange={(e) => setWeights({ ...weights, rule: parseInt(e.target.value) || 0 })}
              className="w-full cursor-pointer accent-rose-600"
            />
            <p className="text-[11px] font-semibold text-slate-500">
              Contribution from deterministic schema, completeness, range, and custom validation rules.
            </p>
          </div>

          {/* ML Outlier Weight */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border-2 border-slate-900 shadow-sketch-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black text-slate-900">Smart ML Anomaly Weight</span>
              </div>
              <span className="text-sm font-black text-amber-800">{weights.ml}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.ml}
              onChange={(e) => setWeights({ ...weights, ml: parseInt(e.target.value) || 0 })}
              className="w-full cursor-pointer accent-amber-600"
            />
            <p className="text-[11px] font-semibold text-slate-500">
              Contribution from multidimensional Isolation Forest outlier anomaly scoring.
            </p>
          </div>

          {/* Enumerator Weight */}
          <div className="p-4 bg-purple-50/50 rounded-2xl border-2 border-slate-900 shadow-sketch-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-slate-900">Staff Variance Bias Weight</span>
              </div>
              <span className="text-sm font-black text-purple-800">{weights.enumerator}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.enumerator}
              onChange={(e) => setWeights({ ...weights, enumerator: parseInt(e.target.value) || 0 })}
              className="w-full cursor-pointer accent-purple-600"
            />
            <p className="text-[11px] font-semibold text-slate-500">
              Contribution from enumerator-level statistical skew and response variance.
            </p>
          </div>

          {/* Cluster Weight */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border-2 border-slate-900 shadow-sketch-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-900">Cluster / Geographic Weight</span>
              </div>
              <span className="text-sm font-black text-blue-800">{weights.cluster}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.cluster}
              onChange={(e) => setWeights({ ...weights, cluster: parseInt(e.target.value) || 0 })}
              className="w-full cursor-pointer accent-blue-600"
            />
            <p className="text-[11px] font-semibold text-slate-500">
              Contribution from primary sampling unit and district-level aggregate risk flags.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
