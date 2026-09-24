import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Activity, Users, Pill, Calendar, HelpCircle } from 'lucide-react';
import { generateAICareSummary } from '../../services/orchestrator';
import { getCaregivers, getMedications, getLongitudinalTimeline, subscribeToStorage } from '../../services/storage';

export const CaregiverOverviewTab = () => {
  const [summary, setSummary] = useState(generateAICareSummary());
  const [caregiversCount, setCaregiversCount] = useState(getCaregivers().length);
  const [medsCount, setMedsCount] = useState(getMedications().length);
  const [timelineCount, setTimelineCount] = useState(getLongitudinalTimeline().length);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setSummary(generateAICareSummary());
      setCaregiversCount(getCaregivers().length);
      setMedsCount(getMedications().length);
      setTimelineCount(getLongitudinalTimeline().length);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 text-white">
      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-400" /> Active Roster
          </span>
          <h4 className="text-3xl font-black text-white">{caregiversCount} Contacts</h4>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-emerald-400" /> Scheduled Meds
          </span>
          <h4 className="text-3xl font-black text-white">{medsCount} Doses</h4>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-400" /> Care Events
          </span>
          <h4 className="text-3xl font-black text-white">{timelineCount} Logged</h4>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-400" /> Safety Status
          </span>
          <h4 className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Stable
          </h4>
        </div>
      </div>

      {/* AI Care Summary: "What changed recently?" */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">What Changed Recently?</h3>
              <p className="text-xs text-slate-400 font-medium">
                AI Longitudinal Care Summary for {summary.patientName} ({summary.recentPeriodLabel})
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold rounded-full">
            AI Decision Support Active
          </span>
        </div>

        {/* Synthesized Trend Highlights */}
        <div className="space-y-3">
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Key Clinical & Longitudinal Insights
          </h4>

          <div className="space-y-2.5">
            {summary.highlights.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <p className="text-base text-slate-200 font-medium leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Things to Watch */}
        <div className="p-5 bg-amber-950/40 border border-amber-500/30 rounded-2xl space-y-3">
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Things to Watch (Recommended Actions)
          </h4>

          <div className="flex flex-wrap gap-2.5">
            {summary.thingsToWatch.map((watchItem, i) => (
              <div key={i} className="px-4 py-2 bg-amber-900/60 border border-amber-500/40 text-amber-200 font-bold text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {watchItem}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-medium text-slate-500 italic text-center pt-2 border-t border-slate-800">
          {summary.decisionSupportNotice}
        </p>
      </div>

      {/* Why Did Echo Do This? Explainability Card */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Why Did Echo Do This? (Action Explainability)</h3>
            <p className="text-xs text-slate-400">Deterministic trace of EchoCare decision logic & escalation rules</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs sm:text-sm text-slate-300">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest block font-sans">
              Medication Alarm & Escalation Audit Trace
            </span>
            <p className="leading-relaxed font-sans text-slate-300">
              <strong className="text-white">08:00 PM:</strong> Medication Metformin (500 mg) was scheduled.<br />
              <strong className="text-white">08:00 PM:</strong> First proactive voice reminder was issued by Echo.<br />
              <strong className="text-white">08:10 PM:</strong> No confirmation received after 10 minutes. Second reminder issued.<br />
              <strong className="text-white">08:15 PM:</strong> No confirmation received after 5 more minutes. Primary Caregiver alert dispatched via WhatsApp/SMS.<br />
              <strong className="text-white">08:18 PM:</strong> Caregiver acknowledged alert. Active escalation stopped.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
