import React, { useEffect } from 'react';
import { Volume2, CheckCircle2, Clock, X, BellRing, Pill } from 'lucide-react';
import { speak } from '../../services/voiceEngine';
import { unlockBrowserAudio } from '../../services/speechTTS';
import { updateMedicationStatus } from '../../services/storage';

export const MedicationReminderModal = ({ reminderData, onClose }) => {
  if (!reminderData || !reminderData.medication) return null;

  const { medication, stage, prompt } = reminderData;

  useEffect(() => {
    unlockBrowserAudio();
  }, [prompt]);

  const handleReplayVoice = () => {
    if (prompt) {
      speak(prompt);
    }
  };

  const handleTakeMedication = () => {
    updateMedicationStatus(medication.id, 'Verified', null, 'Voice Reminder Modal');
    onClose();
  };

  const handleSnooze = () => {
    updateMedicationStatus(medication.id, 'Snoozed', null, 'Voice Reminder Modal');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl animate-bounce">
              <BellRing className="w-7 h-7 text-emerald-700" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Stage {stage || 1} Voice Reminder
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-serif-heading mt-0.5">
                Medicine Time for Amma
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Spoken Voice Box */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
              Echo Voice Spoken Reminder
            </span>
            <button
              onClick={handleReplayVoice}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Replay Voice
            </button>
          </div>
          <p className="text-lg font-bold text-slate-800 leading-snug font-serif-heading italic">
            "{prompt || `Amma, it is time to take your ${medication.name} ${medication.dosage}.`}"
          </p>
        </div>

        {/* Medication Details Card */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="p-3 bg-white text-emerald-600 border border-emerald-200 rounded-xl shadow-xs">
            <Pill className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900">{medication.name}</h3>
            <p className="text-sm font-semibold text-slate-600">
              Dosage: <span className="text-emerald-700 font-bold">{medication.dosage}</span> · Scheduled: {medication.scheduledTime}
            </p>
            {medication.instructions && (
              <p className="text-xs text-slate-500 mt-1 italic">
                "{medication.instructions}"
              </p>
            )}
          </div>
        </div>

        {/* Large Senior-Friendly Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleTakeMedication}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>I Took This Medicine</span>
          </button>

          <button
            onClick={handleSnooze}
            className="w-full py-4 px-6 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-base rounded-2xl border border-amber-300 flex items-center justify-center gap-2 transition-all"
          >
            <Clock className="w-5 h-5 text-amber-700" />
            <span>Snooze 10 Mins</span>
          </button>
        </div>
      </div>
    </div>
  );
};
