import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Layers } from 'lucide-react';

const LINE_COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const BAR_COLORS = ['#2563eb', '#f97316', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6'];

export default function ChartsSection({ summary, hideValidationCharts = false }) {
  if (!summary) return null;

  const charts = summary.charts || {};
  const pieData = charts.pieData || [];
  const barData = charts.barData || [];
  const barLabel = charts.barLabel || 'Geographic / Cluster Distribution';
  const barGroupKey = charts.barGroupKey || 'group';
  const lineData = charts.lineData || [];
  const lineKeys = charts.lineKeys || [];
  const catDistribution = charts.catDistribution || [];
  const catDistLabel = charts.catDistLabel || 'Category Spread';

  const maxCatCount = Math.max(...catDistribution.map((c) => c.count || 0), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 1. Bar Chart: Cluster / Regional Flags */}
      {!hideValidationCharts && (
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                {barLabel}
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {barData.length > 0
                  ? 'Flagged issues and total records across identified groups'
                  : 'No group/cluster dimension identified in current dataset'}
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={barGroupKey} tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', borderColor: '#0f172a', borderWidth: '2px', boxShadow: '4px 4px 0px 0px #0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="records" name="Total Records" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="violations" name="Flagged Items" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 w-full">
                <p className="text-xs font-bold text-slate-500">No categorical/cluster breakdown available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Donut Chart: Risk Distribution */}
      {!hideValidationCharts && (
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                Risk Severity Breakdown
              </h3>
              <p className="text-xs font-bold text-slate-500">Automated multi-factor risk categorization across all records</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {pieData.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="#0f172a"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', borderColor: '#0f172a', borderWidth: '2px', boxShadow: '4px 4px 0px 0px #0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 w-full">
                <p className="text-xs font-bold text-slate-500">No risk categorization data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Line Chart: Metric Sample Trends */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-purple-600" />
              Continuous Variables Profile
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {lineKeys.length > 0
                ? `Sample distribution profile of measures: ${lineKeys.join(', ')}`
                : 'No numerical measures available in dataset'}
            </p>
          </div>
        </div>

        <div className="h-64 w-full flex items-center justify-center">
          {lineData.length > 0 && lineKeys.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', borderColor: '#0f172a', borderWidth: '2px', boxShadow: '4px 4px 0px 0px #0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                {lineKeys.map((k, idx) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={k}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 w-full">
              <p className="text-xs font-bold text-slate-500">No continuous measures available</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Categorical Spread Bar Chart */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Category Spread ({catDistLabel})
            </h3>
            <p className="text-xs font-bold text-slate-500">Frequency distribution across unique values</p>
          </div>
        </div>

        <div className="space-y-3.5 my-auto max-h-56 overflow-y-auto pr-1">
          {catDistribution.length > 0 ? (
            catDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-700 w-24 truncate" title={item.name}>
                  {item.name}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-3.5 border-2 border-slate-900 overflow-hidden shadow-sketch-sm">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / maxCatCount) * 100}%`,
                      backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-xs font-black text-slate-900 w-12 text-right">
                  {item.count?.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 w-full">
              <p className="text-xs font-bold text-slate-500">No categorical distribution available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
