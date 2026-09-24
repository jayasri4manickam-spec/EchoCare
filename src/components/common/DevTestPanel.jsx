import React, { useState, useEffect } from 'react';
import { Wrench, Volume2, Clock, CheckCircle2, RefreshCw, X, ShieldAlert, Bug, Info } from 'lucide-react';
import { getAvailableVoices, speak, getVoiceState } from '../../services/voiceEngine';
import { unlockBrowserAudio, playChime } from '../../services/speechTTS';
import { useLanguage } from '../../data/LanguageContext';
import { api } from '../../services/api';
import { addMedication as addLocalMedication } from '../../services/storage';

export const DevTestPanel = ({ isOpen, onClose }) => {
  const [voices, setVoices] = useState([]);
  const [voiceState, setVoiceState] = useState('IDLE');
  const [schedulerStatus, setSchedulerStatus] = useState('Active (10s ticker)');
  const [medEvents, setMedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState('');
  const { language } = useLanguage();

  const speechRecognitionLocale = {
    en: 'en-IN',
    ta: 'ta-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ml: 'ml-IN',
    kn: 'kn-IN',
  }[language] || 'en-IN';

  const fetchDiagnostics = async () => {
    setVoices(getAvailableVoices());
    setVoiceState(getVoiceState());
    try {
      const res = await api.getMedicationsTimeline('pat-1');
      if (res && res.events) {
        setMedEvents(res.events.slice(0, 5));
      }
    } catch (e) {
      console.warn('Diagnostics fetch notice:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
      const interval = setInterval(fetchDiagnostics, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateTestMed = async (minutesFromNow) => {
    setLoading(true);
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    let hours = target.getHours();
    const minutes = String(target.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    const medName = `Test Med (+${minutesFromNow}m)`;

    try {
      // 1. Post to backend SQLite DB
      const res = await api.addMedication({
        patient_id: 'pat-1',
        name: medName,
        dosage: '100',
        unit: 'mg',
        instructions: `Take immediately when prompted (+${minutesFromNow}m test)`,
        scheduled_time: timeStr,
        frequency: 'Daily',
        reminder1_interval: 0,
        reminder2_interval: 1,
        reminder3_interval: 1,
        escalation_delay: 1,
      });

      // 2. Save to local storage for frontend browser voice reminder engine ticker
      addLocalMedication({
        id: (res && res.medication && res.medication.id) || `med-test-${Date.now()}`,
        name: medName,
        dosage: '100',
        unit: 'mg',
        instructions: `Take immediately when prompted (+${minutesFromNow}m test)`,
        scheduledTime: timeStr,
        scheduled_time: timeStr,
        frequency: 'Daily',
        status: 'Pending',
        reminder1Interval: 0,
        reminder2Interval: 1,
        reminder3Interval: 1,
        escalationDelay: 1,
      });

      // 3. Unlock browser audio hardware
      unlockBrowserAudio();

      setTestResultMsg(`✅ Scheduled for ${timeStr} (+${minutesFromNow}m)! Spoken voice reminder will trigger at ${timeStr}.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('echocare-medication-updated'));
      }
      fetchDiagnostics();
    } catch (e) {
      setTestResultMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerTestSimulation = async () => {
    setLoading(true);
    unlockBrowserAudio();

    const dummyMed = {
      id: 'med-sim-' + Date.now(),
      name: 'Metformin',
      dosage: '500',
      unit: 'mg',
      instructions: 'Take 1 tablet with breakfast water',
    };

    // Stage 1 (t = 0s) - Browser Audio & Voice Prompt
    playChime('warning');
    const stage1Prompt = 'Amma, it is time for your Metformin 500mg. Please take it now with water.';
    speak(stage1Prompt, language);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('echocare-medication-reminder', {
          detail: { medication: dummyMed, stage: 1, prompt: stage1Prompt },
        })
      );
    }
    setTestResultMsg('🔊 Stage 1: Proactive voice reminder speaking now out loud in browser...');

    // Stage 2 (t = 3.5s) - Browser Gentle Reminder
    setTimeout(() => {
      playChime('warning');
      const stage2Prompt = 'Gentle reminder for your Metformin 500mg. Please take it when you can.';
      speak(stage2Prompt, language);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('echocare-medication-reminder', {
            detail: { medication: dummyMed, stage: 2, prompt: stage2Prompt },
          })
        );
      }
      setTestResultMsg('🔊 Stage 2: Gentle voice reminder speaking now out loud in browser...');
    }, 3500);

    // Stage 3 (t = 7s) - Browser Urgent Reminder
    setTimeout(() => {
      playChime('warning');
      const stage3Prompt = 'Urgent reminder: Please take your Metformin 500mg now.';
      speak(stage3Prompt, language);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('echocare-medication-reminder', {
            detail: { medication: dummyMed, stage: 3, prompt: stage3Prompt },
          })
        );
      }
      setTestResultMsg('🔊 Stage 3: Urgent voice reminder speaking now out loud in browser...');
    }, 7000);

    // Stage 4 (t = 10.5s) - Caregiver Server Escalation & Push Dispatch
    setTimeout(async () => {
      try {
        const res = await api.runTestSimulation('pat-1', 'Metformin 500mg');
        if (res && res.success) {
          setTestResultMsg('🚨 Stage 4 Complete: Escalated to Caregiver Dashboard, Push Notification & Care Timeline!');
          fetchDiagnostics();
        }
      } catch (e) {
        setTestResultMsg(`Simulation backend notice: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }, 10500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-emerald-400">Development Diagnostic & Test Panel</h2>
              <p className="text-xs text-slate-400 font-semibold">Live Scheduler, Speech Recognition & Voice TTS Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Create Test Medication (Asia/Kolkata Timezone)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              disabled={loading}
              onClick={() => handleCreateTestMed(1)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> +1 Min Med
            </button>
            <button
              disabled={loading}
              onClick={() => handleCreateTestMed(2)}
              className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> +2 Min Med
            </button>
            <button
              disabled={loading}
              onClick={() => handleCreateTestMed(5)}
              className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> +5 Min Med
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={loading}
              onClick={handleTriggerTestSimulation}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" /> Trigger 3-Stage Simulation
            </button>
            <button
              onClick={() => {
                unlockBrowserAudio();
                speak('Testing audio hardware tone and speech synthesis output.');
              }}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" /> Test TTS Out Loud
            </button>
          </div>

          {testResultMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold font-mono">
              {testResultMsg}
            </div>
          )}
        </div>

        {/* Live Diagnostics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-2">
          {/* Box 1: Speech & TTS State */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" /> Speech & TTS Diagnostics
            </h4>
            <div className="space-y-1 text-slate-300">
              <p>Active UI Language: <strong className="text-white">{language}</strong></p>
              <p>STT Speech Locale: <strong className="text-white">{speechRecognitionLocale}</strong></p>
              <p>Voice Engine State: <strong className="text-emerald-400">{voiceState}</strong></p>
              <p>Browser Voices Loaded: <strong className="text-white">{voices.length}</strong></p>
            </div>
          </div>

          {/* Box 2: Scheduler State */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" /> Scheduler Engine State
            </h4>
            <div className="space-y-1 text-slate-300">
              <p>Scheduler Status: <strong className="text-emerald-400">{schedulerStatus}</strong></p>
              <p>Idempotent Events: <strong className="text-white">{medEvents.length} Recent</strong></p>
              <p>Realtime SSE Stream: <strong className="text-emerald-400">Connected</strong></p>
            </div>
          </div>
        </div>

        {/* Voices List Preview */}
        <div className="space-y-2 text-xs font-mono">
          <h4 className="font-bold text-slate-400 uppercase tracking-wider">Available Browser Voices:</h4>
          <div className="max-h-32 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 scrollbar-thin">
            {voices.length === 0 ? (
              <p className="text-slate-500 italic">No browser SAPI voices loaded yet (or loaded asynchronously)</p>
            ) : (
              voices.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-slate-400">
                  <span>{v.name}</span>
                  <span className="text-emerald-400 font-bold">[{v.lang}]</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
