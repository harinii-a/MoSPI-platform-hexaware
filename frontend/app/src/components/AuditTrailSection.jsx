import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { auditApi } from '../api';

export default function AuditTrailSection({ datasetId }) {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const res = await auditApi.log(datasetId);
      setAuditLog(res.data);
    } catch (err) {
      console.error('Error fetching audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
    const id = setInterval(fetchAuditLog, 8000);
    return () => clearInterval(id);
  }, [datasetId]);

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <h3 className="font-black text-slate-900 text-lg">System & Decision Audit Trail</h3>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Immutable log of supervisor actions, schema updates, validations, and system events
          </p>
        </div>
        <button
          onClick={fetchAuditLog}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-black text-slate-900 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl border-2 border-slate-900 shadow-sketch-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
            <tr>
              <th className="py-3.5 px-4 rounded-l-xl">ID</th>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Target</th>
              <th className="py-3.5 px-4">Status Update</th>
              <th className="py-3.5 px-4 rounded-r-xl">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 font-bold">
            {auditLog.length > 0 ? (
              auditLog.slice(0, 50).map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-black text-slate-900">#{entry.id}</td>
                  <td className="py-4 px-4 text-[11px] text-slate-600 font-mono font-bold">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-black text-slate-900">{entry.user}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-900 bg-blue-100 text-blue-900">
                      {entry.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-900 bg-emerald-100 text-emerald-900">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-black text-slate-900">{entry.target}</td>
                  <td className="py-4 px-4">
                    {entry.old_status ? (
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-500 font-bold">{entry.old_status}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-black text-slate-900">{entry.new_status}</span>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 text-[11px]">{entry.new_status}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 max-w-xs">
                    <span className="text-[11px] text-slate-600 italic truncate block">"{entry.comment}"</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-bold">
                  No audit log entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
