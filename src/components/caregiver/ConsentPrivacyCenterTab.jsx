import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, User, Check, AlertTriangle, FileText, History } from 'lucide-react';
import { getCaregivers, updateCaregiver, getAccessAuditLogs, subscribeToStorage } from '../../services/storage';

export const ConsentPrivacyCenterTab = () => {
  const [caregivers, setCaregivers] = useState(getCaregivers());
  const [auditLogs, setAuditLogs] = useState(getAccessAuditLogs());

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setCaregivers(getCaregivers());
      setAuditLogs(getAccessAuditLogs());
    });
    return unsub;
  }, []);

  const handleTogglePermission = (caregiverId, permKey) => {
    const cg = caregivers.find((c) => c.id === caregiverId);
    if (!cg) return;

    const currentPerms = cg.permissions || {};
    const updatedPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };

    updateCaregiver(caregiverId, { permissions: updatedPerms });
  };

  return (
    <div className="space-y-6 text-white">
      {/* Privacy Header */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Privacy & Access Architecture
          </span>
          <h3 className="text-2xl font-black text-white">Who Can See What? (Permission Control Matrix)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based granular permissions for family members and care team. Changes take effect instantly across all devices.
          </p>
        </div>

        {/* Permission Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-extrabold">
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Health Timeline</th>
                <th className="py-3 px-4 text-center">Medications</th>
                <th className="py-3 px-4 text-center">Memories</th>
                <th className="py-3 px-4 text-center">Emergency Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {caregivers.map((cg) => {
                const perms = cg.permissions || {};
                return (
                  <tr key={cg.id} className="hover:bg-slate-950/60 transition-all">
                    <td className="py-4 px-4 font-bold flex items-center gap-3">
                      <img
                        src={cg.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80'}
                        alt={cg.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <div className="text-white">{cg.name}</div>
                        <div className="text-xs text-slate-400">{cg.relation}</div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-extrabold text-xs rounded-lg uppercase">
                        {cg.role || (cg.primaryContact ? 'Primary' : 'Family')}
                      </span>
                    </td>

                    {/* Timeline Permission Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(cg.id, 'viewTimeline')}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1 mx-auto transition-all ${
                          perms.viewTimeline
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {perms.viewTimeline ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {perms.viewTimeline ? 'Allowed' : 'Restricted'}
                      </button>
                    </td>

                    {/* Medication Permission Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(cg.id, 'viewMedications')}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1 mx-auto transition-all ${
                          perms.viewMedications
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {perms.viewMedications ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {perms.viewMedications ? 'Allowed' : 'Restricted'}
                      </button>
                    </td>

                    {/* Memories Permission Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(cg.id, 'viewMemories')}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1 mx-auto transition-all ${
                          perms.viewMemories
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {perms.viewMemories ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {perms.viewMemories ? 'Allowed' : 'Restricted'}
                      </button>
                    </td>

                    {/* Emergency Alerts Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleTogglePermission(cg.id, 'receiveAlerts')}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1 mx-auto transition-all ${
                          perms.receiveAlerts
                            ? 'bg-red-950 text-red-400 border border-red-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {perms.receiveAlerts ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {perms.receiveAlerts ? 'Alerts On' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Audit History */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl space-y-4">
        <h4 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <History className="w-5 h-5 text-slate-400" />
          Access Audit History Log
        </h4>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-2">No data access events logged yet.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">{log.user}</span>
                  <span className="text-slate-500">({log.role})</span>
                  <span className="text-slate-300 font-medium">· {log.targetData}</span>
                </div>
                <span className="font-mono text-slate-500">{log.timestamp} · {log.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Override Policy Documentation */}
      <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
        <h5 className="font-bold text-base text-amber-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Emergency Override & Prototype Consent Architecture
        </h5>
        <p className="text-xs text-slate-400 leading-relaxed">
          In emergency situations (e.g. SOS activation or high distress signal), configured primary contacts receive priority alerts regardless of read-only mode. This prototype demonstrates privacy architecture and consent governance.
        </p>
      </div>
    </div>
  );
};
