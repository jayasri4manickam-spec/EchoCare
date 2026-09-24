import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Send, Clock, User, ShieldCheck, Sparkles } from 'lucide-react';
import { generateShiftHandoverBrief } from '../../services/orchestrator';
import { addShiftHandover, getShiftHandovers, subscribeToStorage } from '../../services/storage';

export const ShiftHandoverTab = () => {
  const [rawNotes, setRawNotes] = useState('');
  const [outgoingNurse, setOutgoingNurse] = useState('Sarah Jenkins, RN');
  const [handoverBrief, setHandoverBrief] = useState(null);
  const [publishedHandovers, setPublishedHandovers] = useState(getShiftHandovers());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setPublishedHandovers(getShiftHandovers());
    });
    return unsub;
  }, []);

  const handleGenerateBrief = () => {
    if (!rawNotes.trim()) return;
    const brief = generateShiftHandoverBrief(rawNotes, outgoingNurse);
    setHandoverBrief(brief);
  };

  const handleConfirmAndPublish = () => {
    if (!handoverBrief) return;
    addShiftHandover(handoverBrief);
    setSavedSuccess(true);
    setRawNotes('');
    setHandoverBrief(null);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-white">
      {/* Shift Handover Generator Card */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              Shift Handover Intelligence
            </span>
            <h3 className="text-2xl font-black text-white">Professional & Family Shift Briefing</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record natural shift notes. EchoCare AI will format a 5-part structured handover brief for the incoming shift.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Shift handover confirmed & published! Incoming shift caregiver can now view this brief.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Outgoing Caregiver Name</label>
            <input
              type="text"
              value={outgoingNurse}
              onChange={(e) => setOutgoingNurse(e.target.value)}
              className="w-full sm:w-1/2 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Natural Language Shift Notes:
            </label>
            <textarea
              rows={4}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder='e.g. "She refused dinner twice and was restless around 8 PM. Morning medications were verified cleanly."'
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleGenerateBrief}
            disabled={!rawNotes.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate Structured Shift Brief
          </button>
        </div>

        {/* Generated Structured Handover Brief Review */}
        {handoverBrief && (
          <div className="p-6 bg-slate-950 rounded-2xl border border-emerald-500/50 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated Shift Handover Brief
              </h4>
              <span className="text-xs font-mono text-slate-400">{handoverBrief.timestamp}</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-emerald-400 block uppercase">1. Appetite Intake</span>
                <p className="text-slate-200 font-medium">{handoverBrief.structuredBrief.appetite}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-amber-400 block uppercase">2. Behaviour & Sundowning</span>
                <p className="text-slate-200 font-medium">{handoverBrief.structuredBrief.behaviour}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-purple-400 block uppercase">3. Longitudinal Pattern</span>
                <p className="text-slate-200 font-medium">{handoverBrief.structuredBrief.pattern}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-red-400 block uppercase">4. Things to Watch</span>
                <p className="text-slate-200 font-medium">{handoverBrief.structuredBrief.watch}</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-blue-400 block uppercase">5. Routine Pending</span>
                <p className="text-slate-200 font-medium">{handoverBrief.structuredBrief.routine}</p>
              </div>
            </div>

            <button
              onClick={handleConfirmAndPublish}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Confirm & Publish Shift Handover
            </button>
          </div>
        )}
      </div>

      {/* Published Shift Handovers Log */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl space-y-4">
        <h4 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-slate-400" />
          Recent Shift Handover Briefings
        </h4>

        {publishedHandovers.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No published handovers yet.</p>
        ) : (
          <div className="space-y-4">
            {publishedHandovers.map((ho) => (
              <div key={ho.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-2">
                  <span className="font-bold text-emerald-400">From: {ho.outgoingCaregiver}</span>
                  <span>{ho.timestamp} · {ho.date}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p><strong className="text-slate-400">Appetite:</strong> {ho.structuredBrief?.appetite}</p>
                  <p><strong className="text-slate-400">Behaviour:</strong> {ho.structuredBrief?.behaviour}</p>
                  <p><strong className="text-slate-400">Watch:</strong> {ho.structuredBrief?.watch}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
