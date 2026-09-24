import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Save, Check, Sparkles, Clock, Edit3, PlusCircle } from 'lucide-react';
import { parseCaregiverVoiceObservation } from '../../services/orchestrator';
import { addCaregiverObservation, getCaregiverObservations, subscribeToStorage } from '../../services/storage';

export const CaregiverVoiceObservationTab = () => {
  const [isListening, setIsListening] = useState(false);
  const [rawText, setRawText] = useState('');
  const [structured, setStructured] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [observations, setObservations] = useState(getCaregiverObservations());

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setObservations(getCaregiverObservations());
    });
    return unsub;
  }, []);

  const handleStartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser speech recognition not supported. Please type your observation in the text field below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setRawText(transcript);
        const parsed = parseCaregiverVoiceObservation(transcript);
        setStructured(parsed);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleTextChange = (text) => {
    setRawText(text);
    if (text.trim().length > 5) {
      const parsed = parseCaregiverVoiceObservation(text);
      setStructured(parsed);
    } else {
      setStructured(null);
    }
  };

  const handleSaveObservation = () => {
    if (!structured) return;

    addCaregiverObservation(structured);
    setSavedSuccess(true);
    setRawText('');
    setStructured(null);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-white">
      {/* Speech Input & Structured AI Parser Card */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              Caregiver Voice Observation Capture
            </span>
            <h3 className="text-2xl font-black text-white">"Tell EchoCare what happened"</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Speak or type naturally. EchoCare AI will convert your observation into structured clinical signals.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            Observation saved and logged to Longitudinal Care Timeline!
          </div>
        )}

        {/* Large Mic Button & Text Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
            <button
              onClick={handleStartListening}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 ${
                isListening
                  ? 'bg-red-600 border-red-300 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white active:scale-95'
              }`}
            >
              <Mic className="w-10 h-10" />
              <span className="text-[10px] font-extrabold uppercase mt-1">
                {isListening ? 'Listening...' : 'Tap to Speak'}
              </span>
            </button>
            <span className="text-xs text-slate-400 font-medium">Press to record spoken observation</span>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase">
              Or Type Observation Naturally:
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`e.g. "Margaret didn't eat much today and she seemed more tired than usual. She also needed help getting out of the chair."`}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Structured AI Output Review Section */}
        {structured && (
          <div className="p-6 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Structured Observation (Review & Confirm)
              </h4>
              <span className="text-xs font-mono text-slate-400">{structured.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">APPETITE</label>
                <input
                  type="text"
                  value={structured.structured.appetite}
                  onChange={(e) =>
                    setStructured({
                      ...structured,
                      structured: { ...structured.structured, appetite: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ENERGY LEVEL</label>
                <input
                  type="text"
                  value={structured.structured.energy}
                  onChange={(e) =>
                    setStructured({
                      ...structured,
                      structured: { ...structured.structured, energy: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">MOBILITY</label>
                <input
                  type="text"
                  value={structured.structured.mobility}
                  onChange={(e) =>
                    setStructured({
                      ...structured,
                      structured: { ...structured.structured, mobility: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SLEEP / BEHAVIOR</label>
                <input
                  type="text"
                  value={structured.structured.sleepBehavior}
                  onChange={(e) =>
                    setStructured({
                      ...structured,
                      structured: { ...structured.structured, sleepBehavior: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleSaveObservation}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Observation to Longitudinal Timeline
            </button>
          </div>
        )}
      </div>

      {/* Observation History Log */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl space-y-4">
        <h4 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-slate-400" />
          Recent Caregiver Observations History
        </h4>

        {observations.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No caregiver observations recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {observations.map((obs) => (
              <div key={obs.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-emerald-400">{obs.source}</span>
                  <span>{obs.timestamp} · {obs.date}</span>
                </div>
                <p className="text-sm text-slate-200 italic font-medium">"{obs.rawAudioText}"</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-bold">
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg text-slate-300">
                    Appetite: {obs.structured?.appetite}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg text-slate-300">
                    Energy: {obs.structured?.energy}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg text-slate-300">
                    Mobility: {obs.structured?.mobility}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg text-slate-300">
                    Sleep: {obs.structured?.sleepBehavior}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
