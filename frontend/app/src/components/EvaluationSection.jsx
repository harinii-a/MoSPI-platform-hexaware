import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, TrendingUp, Cpu, Award, Info, AlertCircle, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { datasetApi } from '../api';

export default function EvaluationSection({ datasetId }) {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!datasetId) return;
    const fetchEval = async () => {
      setLoading(true);
      try {
        const res = await datasetApi.evaluation(datasetId);
        setEvalData(res.data);
      } catch (err) {
        console.error('Error fetching evaluation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEval();
  }, [datasetId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border-2 border-slate-900 shadow-sketch text-center">
        <p className="text-sm font-bold text-slate-600">Computing evaluation metrics...</p>
      </div>
    );
  }

  if (!evalData) {
    return null;
  }

  const hasGroundTruth = evalData.has_ground_truth;

  return (
    <div className="space-y-6 mb-8">
      {/* Information Banner */}
      <div className={`border-2 border-slate-900 rounded-3xl p-5 flex items-start gap-4 shadow-sketch ${hasGroundTruth ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-sketch-sm ${hasGroundTruth ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {hasGroundTruth ? <ShieldCheck className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div className="text-xs font-bold text-slate-900">
          <span className="font-black text-sm block mb-0.5">
            {hasGroundTruth ? 'Ground-Truth Verification Active' : 'Unsupervised Validation Mode'}
          </span>
          {evalData.message || (hasGroundTruth
            ? `Supervised metrics evaluated against column: ${evalData.ground_truth_column}`
            : 'Unsupervised metrics reported based on anomaly distribution and rule coverage.')}
        </div>
      </div>

      {hasGroundTruth ? (
        <>
          {/* Ground Truth KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-sketch">
              <span className="text-xs font-bold text-slate-500 block mb-1">Precision</span>
              <span className="text-3xl font-black text-blue-600">{evalData.precision}</span>
              <span className="text-[11px] font-bold text-slate-600 block mt-1">True positive ratio</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-sketch">
              <span className="text-xs font-bold text-slate-500 block mb-1">Recall</span>
              <span className="text-3xl font-black text-emerald-600">{evalData.recall}</span>
              <span className="text-[11px] font-bold text-slate-600 block mt-1">Sensitivity / Detection capture</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-sketch">
              <span className="text-xs font-bold text-slate-500 block mb-1">F1-Score</span>
              <span className="text-3xl font-black text-purple-600">{evalData.f1_score}</span>
              <span className="text-[11px] font-bold text-slate-600 block mt-1">Harmonic accuracy balance</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-sketch">
              <span className="text-xs font-bold text-slate-500 block mb-1">False Positive Rate</span>
              <span className="text-3xl font-black text-amber-600">{evalData.false_positive_rate}</span>
              <span className="text-[11px] font-bold text-slate-600 block mt-1">Spurious flag rate</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-base mb-2">Ground-Truth Dataset Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Evaluated</span>
                <span className="text-lg font-black text-slate-900">{evalData.total_evaluated?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Known Ground-Truth Anomalies</span>
                <span className="text-lg font-black text-rose-600">{evalData.known_anomalies?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Overall Accuracy</span>
                <span className="text-lg font-black text-emerald-600">{evalData.accuracy}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-sm mb-1">ML Outlier Rate</h3>
            <span className="text-2xl font-black text-amber-600">{evalData.unsupervised_metrics?.ml_anomaly_rate || '0%'}</span>
            <p className="text-xs font-bold text-slate-500 mt-2">
              Percentage of survey records flagged by unsupervised Isolation Forest multidimensional modeling.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-sm mb-1">Rule Violation Rate</h3>
            <span className="text-2xl font-black text-rose-600">{evalData.unsupervised_metrics?.rule_violation_rate || '0%'}</span>
            <p className="text-xs font-bold text-slate-500 mt-2">
              Percentage of survey records failing deterministic field integrity, range, or completeness rules.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-sm mb-1">Total Verified Microdata</h3>
            <span className="text-2xl font-black text-blue-600">{(evalData.unsupervised_metrics?.total_records || 0).toLocaleString()}</span>
            <p className="text-xs font-bold text-slate-500 mt-2">
              Total active records processed through the unsupervised quality and validation pipeline.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
