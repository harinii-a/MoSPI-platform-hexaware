import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, ShieldAlert, CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { rulesApi, datasetApi } from '../api';

export default function RulesPage({ datasetId, summary }) {
  const [rules, setRules] = useState([]);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);

  // New rule form state
  const [newRule, setNewRule] = useState({
    field: '',
    operator: '>',
    value: '',
    severity: 'MEDIUM',
    name: '',
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await rulesApi.list(datasetId);
      setRules(res.data);
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    if (datasetId) {
      datasetApi.schema(datasetId).then((res) => setSchema(res.data)).catch(() => {});
    }
  }, [datasetId]);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRule.field || newRule.value === '') return;

    try {
      await rulesApi.create({
        ...newRule,
        dataset_id: datasetId,
      });
      setNewRule({
        field: schema?.columns?.[0]?.name || '',
        operator: '>',
        value: '',
        severity: 'MEDIUM',
        name: '',
      });
      fetchRules();
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await rulesApi.delete(ruleId);
      fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const columns = schema?.columns || [];

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900">Custom Validation Rule Builder</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Define deterministic logical consistency, threshold, and range rules tailored to your survey schema
          </p>
        </div>

        <span className="text-xs font-black text-slate-900 bg-amber-100 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm w-fit">
          {rules.length} Configured Rules
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Rule Form */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-900 text-base">Add New Rule</h3>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs font-bold">
            <div>
              <label className="block text-slate-600 mb-1">Target Field / Variable</label>
              <select
                value={newRule.field}
                onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              >
                <option value="">Select variable from schema</option>
                {columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.inferred_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Condition Operator</label>
              <select
                value={newRule.operator}
                onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
              >
                <option value=">">Greater than (&gt;)</option>
                <option value=">=">Greater than or equal (&gt;=)</option>
                <option value="<">Less than (&lt;)</option>
                <option value="<=">Less than or equal (&lt;=)</option>
                <option value="==">Equal to (==)</option>
                <option value="!=">Not equal to (!=)</option>
                <option value="contains">Contains text</option>
                <option value="is_null">Is null / missing</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Comparison Threshold / Value</label>
              <input
                type="text"
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                placeholder="e.g. 100, Employed, 0"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Severity Level</label>
              <select
                value={newRule.severity}
                onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
              >
                <option value="HIGH">High (Flags record critical)</option>
                <option value="MEDIUM">Medium (Warning)</option>
                <option value="LOW">Low (Informational)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Rule Name / Description (Optional)</label>
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g. Max weekly hours exceeded"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl border-2 border-slate-900 shadow-sketch-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Validation Rule</span>
            </button>
          </form>
        </div>

        {/* Existing Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-base mb-4">Active Validation Rules</h3>

            <div className="space-y-3">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-sketch-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {rule.name || `${rule.field} ${rule.operator} ${rule.value}`}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                          rule.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          rule.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        Condition: <span className="font-mono text-slate-800 font-bold">{rule.field} {rule.operator} {rule.value}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                  <p className="text-sm font-bold text-slate-500">
                    No custom rules defined yet. Add your first rule using the form on the left.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
