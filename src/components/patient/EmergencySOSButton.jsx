import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, ShieldAlert, X, Check } from 'lucide-react';
import { playChime, speakWhisper } from '../../services/speechTTS';
import { triggerSimulatedEscalation } from '../../services/watchdogTimer';

export const EmergencySOSButton = () => {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isDispatched, setIsDispatched] = useState(false);
  const timerRef = useRef(null);

  const startSOS = () => {
    setIsActive(true);
    setCountdown(5);
    setIsDispatched(false);
    playChime('sos_tick');
    speakWhisper('Emergency quick call initiated. Touch cancel to abort.', true);
  };

  const cancelSOS = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setCountdown(5);
    setIsDispatched(false);
    speakWhisper('Emergency call cancelled safely.', true);
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            dispatchEmergencyAlert();
            return 0;
          }
          playChime('sos_tick');
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const dispatchEmergencyAlert = () => {
    setIsDispatched(true);
    triggerSimulatedEscalation('Critical Alert');
    speakWhisper('Critical emergency call dispatched to registered emergency contacts.', true);
  };

  return (
    <>
      <button
        onClick={startSOS}
        className="relative group overflow-hidden px-8 py-5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-95 text-white font-black text-2xl rounded-3xl shadow-2xl shadow-red-600/40 border-4 border-red-400/50 transition-all flex items-center gap-4 animate-pulse-ring"
      >
        <div className="p-2 bg-white/20 rounded-2xl">
          <PhoneCall className="w-8 h-8 text-white animate-bounce" />
        </div>
        <div className="text-left">
          <span className="block text-xs font-bold text-red-200 uppercase tracking-widest">
            Tap for Assistance
          </span>
          <span className="text-2xl font-black tracking-tight">EMERGENCY SOS</span>
        </div>
      </button>

      {isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border-4 border-red-500 rounded-3xl p-8 shadow-2xl text-center high-contrast-card">
            {!isDispatched ? (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-red-500/20 text-red-500 border-4 border-red-500 flex items-center justify-center mb-6 animate-pulse">
                  <ShieldAlert className="w-14 h-14" />
                </div>

                <h3 className="text-3xl font-extrabold text-white mb-2">
                  Emergency Call Initiating
                </h3>
                <p className="text-slate-300 text-lg mb-6">
                  Dispatching automated phone call to your caregiver family roster in:
                </p>

                <div className="text-7xl sm:text-8xl font-black text-red-400 mb-8 font-mono">
                  {countdown}s
                </div>

                <button
                  onClick={cancelSOS}
                  className="w-full py-6 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-3xl rounded-3xl border-4 border-slate-600 shadow-xl transition-all flex items-center justify-center gap-4"
                >
                  <X className="w-10 h-10 text-red-400" />
                  CANCEL CALL
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border-4 border-emerald-500 flex items-center justify-center mb-6">
                  <Check className="w-14 h-14" />
                </div>

                <h3 className="text-3xl font-extrabold text-emerald-400 mb-2">
                  Emergency Alert Dispatched!
                </h3>
                <p className="text-slate-200 text-xl mb-8">
                  Your location and safety telemetry payload have been sent to emergency contacts.
                </p>

                <button
                  onClick={cancelSOS}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-2xl rounded-2xl"
                >
                  Return to Companion View
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
