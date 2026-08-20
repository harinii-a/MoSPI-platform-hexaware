import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, Save, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { datasetApi } from '../api';

const SEMANTIC_OPTIONS = [
  { value: 'OTHER', label: 'Other / Generic' },
  { value: 'RECORD_ID', label: 'Record Identifier (ID)' },
  { value: 'HOUSEHOLD_ID', label: 'Household ID' },
  { value: 'PERSON_ID', label: 'Person ID' },
  { value: 'ENUMERATOR_ID', label: 'Enumerator / Staff ID' },
  { value: 'SUPERVISOR_ID', label: 'Supervisor ID' },
  { value: 'CLUSTER_ID', label: 'Cluster / PSU / Block' },
  { value: 'STATE', label: 'State' },
  { value: 'DISTRICT', label: 'District' },
  { value: 'VILLAGE', label: 'Village / Town' },
  { value: 'URBAN_RURAL', label: 'Urban / Rural Sector' },
  { value: 'AGE', label: 'Age (Numeric)' },
  { value: 'GENDER', label: 'Gender / Sex' },
  { value: 'EMPLOYMENT', label: 'Employment Status' },
  { value: 'EDUCATION', label: 'Education Level' },
  { value: 'INCOME', label: 'Income / Earnings (Measure)' },
  { value: 'HOURS_WORKED', label: 'Hours Worked (Measure)' },
  { value: 'DATE', label: 'Survey Date / Time' },
  { value: 'WEIGHT', label: 'Survey Weight / Multiplier' },
];

export default function SchemaConfigPanel({ datasetId, onConfigSaved }) {
  const [schema, setSchema] = useState(null);
  const [config, setConfig] = useState(null);
  const [columnOverrides, setColumnOverrides] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!datasetId) return;
    const fetchSchemaAndConfig = async () => {
      setLoading(true);
      try {
        const [schemaRes, configRes] = await Promise.all([
          datasetApi.schema(datasetId),
          datasetApi.config(datasetId),
        ]);
        setSchema(schemaRes.data);
        setConfig(configRes.data);

        // Prepopulate overrides based on existing config and schema
        const initial = {};
        const conf = configRes.data || {};
        if (conf.record_id_col) initial[conf.record_id_col] = 'RECORD_ID';
        if (conf.enumerator_col) initial[conf.enumerator_col] = 'ENUMERATOR_ID';
        if (conf.cluster_col) initial[conf.cluster_col] = 'CLUSTER_ID';
        if (conf.state_col) initial[conf.state_col] = 'STATE';
        if (conf.district_col) initial[conf.district_col] = 'DISTRICT';

        (conf.measure_cols || []).forEach((c) => {
          if (!initial[c]) initial[c] = 'INCOME';
        });

        // Add auto-detected
        (schemaRes.data?.columns || []).forEach((col) => {
          if (!initial[col.name] && col.semantic_role && col.semantic_role !== 'OTHER') {
            initial[col.name] = col.semantic_role;
          }
        });

        setColumnOverrides(initial);
      } catch (err) {
        console.error('Error fetching schema/config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemaAndConfig();
  }, [datasetId]);

  const handleRoleChange = (colName, role) => {
    setColumnOverrides((prev) => ({
      ...prev,
      [colName]: role,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!datasetId) return;
    setSaving(true);
    try {
      // Build new config payload
      let record_id_col = null;
      let enumerator_col = null;
      let cluster_col = null;
      let state_col = null;
      let district_col = null;
      let household_id_col = null;
      let person_id_col = null;
      let time_col = null;
      const measure_cols = [];
      const geo_cols = [];

      Object.entries(columnOverrides).forEach(([col, role]) => {
        if (role === 'RECORD_ID') record_id_col = col;
        else if (role === 'ENUMERATOR_ID') enumerator_col = col;
        else if (role === 'CLUSTER_ID') cluster_col = col;
        else if (role === 'STATE') { state_col = col; geo_cols.push(col); }
        else if (role === 'DISTRICT') { district_col = col; geo_cols.push(col); }
        else if (role === 'HOUSEHOLD_ID') household_id_col = col;
        else if (role === 'PERSON_ID') person_id_col = col;
        else if (role === 'DATE') time_col = col;
        else if (['INCOME', 'HOURS_WORKED', 'AGE', 'WEIGHT'].includes(role)) {
          measure_cols.push(col);
        }
      });

      const payload = {
        record_id_col,
        enumerator_col,
        cluster_col,
        state_col,
        district_col,
        household_id_col,
        person_id_col,
        time_col,
        geo_cols,
        measure_cols,
      };

      await datasetApi.updateConfig(datasetId, payload);
      setSaveSuccess(true);
      if (onConfigSaved) onConfigSaved();
    } catch (err) {
      console.error('Config save failed:', err);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border-2 border-slate-900 shadow-sketch">
        <p className="text-sm font-bold text-slate-600">Inspecting schema and variable types...</p>
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-900 text-lg">Survey Schema & Role Configuration</h3>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Auto-detected semantic variable roles with confidence scoring. Customize mappings to configure the validation engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved & Active
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Apply Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Variables</span>
          <span className="text-lg font-black text-blue-900">{schema.total_columns}</span>
        </div>
        <div className="p-3 bg-emerald-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Measures</span>
          <span className="text-lg font-black text-emerald-900">
            {Object.values(columnOverrides).filter(r => ['INCOME', 'HOURS_WORKED', 'AGE', 'WEIGHT'].includes(r)).length}
          </span>
        </div>
        <div className="p-3 bg-purple-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Dimensions</span>
          <span className="text-lg font-black text-purple-900">
            {Object.values(columnOverrides).filter(r => ['STATE', 'DISTRICT', 'CLUSTER_ID', 'GENDER', 'EMPLOYMENT'].includes(r)).length}
          </span>
        </div>
        <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-2xl shadow-sketch-sm">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">Identifiers</span>
          <span className="text-lg font-black text-amber-900">
            {Object.values(columnOverrides).filter(r => ['RECORD_ID', 'ENUMERATOR_ID', 'HOUSEHOLD_ID', 'PERSON_ID'].includes(r)).length}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm flex items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search column name..."
          className="w-full text-xs font-bold border-2 border-slate-900 rounded-xl px-3.5 py-2 pr-8 bg-slate-50 focus:outline-none shadow-sketch-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 text-slate-500 hover:text-slate-900 font-bold text-xs cursor-pointer select-none"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Schema Columns Table */}
      <div className="overflow-x-auto">
        {(() => {
          const filteredColumns = (schema.columns || []).filter((col) =>
            col.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (filteredColumns.length > 0) {
            return (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
                  <tr>
                    <th className="py-3 px-3 rounded-l-xl">Column Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Missing %</th>
                    <th className="py-3 px-3">Sample Values</th>
                    <th className="py-3 px-3">Auto Confidence</th>
                    <th className="py-3 px-3 rounded-r-xl">Assigned Semantic Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-bold">
                  {filteredColumns.map((col) => {
                    const currentRole = columnOverrides[col.name] || col.semantic_role || 'OTHER';
                    const confPct = Math.round((col.confidence || 0) * 100);

                    return (
                      <tr key={col.name} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-black text-slate-900">
                          {col.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border border-slate-900 bg-slate-100 text-slate-800">
                            {col.inferred_type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={col.missing_percentage > 10 ? 'text-rose-600 font-black' : 'text-slate-600'}>
                            {col.missing_percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-500">
                          {col.sample_values?.slice(0, 3).join(', ') || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            confPct >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            confPct >= 40 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {confPct}% {col.semantic_role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={currentRole}
                            onChange={(e) => handleRoleChange(col.name, e.target.value)}
                            className="bg-slate-50 border-2 border-slate-900 rounded-lg text-xs font-black px-2.5 py-1 text-slate-900 focus:outline-none shadow-sketch-sm cursor-pointer"
                          >
                            {SEMANTIC_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          } else {
            return (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                <p className="text-xs font-bold text-slate-500">No columns match your search</p>
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
}
