import React, { useState, useEffect } from 'react';
import { Heart, Activity, Check, AlertCircle, Coffee, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { getCaregiverWellbeing, saveCaregiverWellbeing, subscribeToStorage } from '../../services/storage';

export const CaregiverWellbeingTab = () => {
  const [wellbeing, setWellbeing] = useState(getCaregiverWellbeing());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setWellbeing(getCaregiverWellbeing());
    });
    return unsub;
  }, []);

  const handleSelectStatus = (status) => {
    let rec = "You are doing wonderful work keeping your loved one safe.";
    if (status === 'Tired') {
      rec = "You've had a demanding week with multiple evening check-ins. Consider sharing tonight's medication check with David or taking a short break.";
    } else if (status === 'Overwhelmed') {
      rec = "Caring for a loved one with cognitive impairment is deeply demanding. We recommend asking another family member to take over evening routines today.";
    } else if (status === 'Struggling') {
      rec = "Please consider reaching out to your primary care coordinator or visiting nurse for shift support. You deserve rest and care too.";
    }

    const updated = {
      ...wellbeing,
      selfReport: status,
      lastReportedAt: new Date().toLocaleDateString(),
      recommendation: rec,
    };

    setWellbeing(updated);
    saveCaregiverWellbeing(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-white">
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest block mb-1">
            Caregiver Health & Support Layer
          </span>
          <h3 className="text-2xl font-black text-white">Caregiver Wellbeing Tracker</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Caregivers need care too. Track your workload context and receive supportive action recommendations.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            Wellbeing status updated.
          </div>
        )}

        {/* Self-Report Status Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-300 uppercase">How are you feeling today?</h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Doing okay', color: 'emerald' },
              { label: 'Tired', color: 'amber' },
              { label: 'Overwhelmed', color: 'orange' },
              { label: 'Struggling', color: 'red' },
            ].map((st) => (
              <button
                key={st.label}
                onClick={() => handleSelectStatus(st.label)}
                className={`p-4 rounded-2xl border-2 font-bold text-center transition-all ${
                  wellbeing.selfReport === st.label
                    ? 'bg-rose-950/80 border-rose-500 text-white shadow-lg scale-105'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-base font-black">{st.label}</div>
                {wellbeing.selfReport === st.label && (
                  <span className="text-[10px] font-extrabold text-rose-400 block mt-1">ACTIVE STATUS</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Workload Context Metrics */}
        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Caregiver Workload Context
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Care Tasks</span>
              <span className="text-2xl font-black text-white">{wellbeing.workloadMetrics?.careTasksCount || 14}</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Recent Alerts</span>
              <span className="text-2xl font-black text-amber-400">{wellbeing.workloadMetrics?.recentAlertsCount || 3}</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Night Interventions</span>
              <span className="text-2xl font-black text-purple-400">{wellbeing.workloadMetrics?.nighttimeInterventionsCount || 2}</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Obs Frequency</span>
              <span className="text-base font-extrabold text-emerald-400 pt-1 block">{wellbeing.workloadMetrics?.observationFrequency || 'High'}</span>
            </div>
          </div>
        </div>

        {/* Supportive Action Indicator */}
        <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-rose-400" />
            <h4 className="text-lg font-bold text-rose-300">Supportive Action Recommendation</h4>
          </div>

          <p className="text-base text-slate-200 font-medium leading-relaxed">
            "{wellbeing.recommendation}"
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => alert("Tonight's medication check assigned to family member David.")}
              className="px-4 py-2.5 bg-rose-900/80 hover:bg-rose-800 border border-rose-500/40 text-rose-100 font-extrabold text-xs rounded-xl flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Share Tonight's Medication Check
            </button>

            <button
              onClick={() => alert("Requested family backup assistance.")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-xs rounded-xl flex items-center gap-2"
            >
              <Coffee className="w-4 h-4 text-amber-400" /> Take a Break (Notify Family)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
