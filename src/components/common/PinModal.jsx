import React, { useState } from 'react';
import { Lock, Check, X, KeyRound } from 'lucide-react';

export const PinModal = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          onSuccess();
          setPin('');
        } else {
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleQuickDemoAccess = () => {
    setPin('1234');
    setTimeout(() => {
      onSuccess();
      setPin('');
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl high-contrast-card">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Caregiver Access</h3>
              <p className="text-slate-400 text-sm">Enter 4-Digit Security PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PIN Display Dots */}
        <div className="my-6 flex justify-center gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                error
                  ? 'border-red-500 bg-red-500/20 text-red-400'
                  : pin.length > idx
                  ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                  : 'border-slate-700 bg-slate-800/50 text-slate-500'
              }`}
            >
              {pin.length > idx ? '●' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-red-400 font-semibold mb-4 text-sm animate-shake">
            Incorrect PIN. Try default PIN: 1234
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num.toString())}
              className="py-4 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-2xl border border-slate-700/80 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="py-4 text-lg font-bold bg-slate-800/60 hover:bg-slate-700 text-slate-400 rounded-2xl border border-slate-700/80"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="py-4 text-2xl font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-2xl border border-slate-700/80 transition-all"
          >
            0
          </button>
          <button
            onClick={handleQuickDemoAccess}
            className="py-4 text-xs font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 rounded-2xl border border-sky-500/40 flex flex-col items-center justify-center gap-1"
          >
            <KeyRound className="w-4 h-4" />
            Auto (1234)
          </button>
        </div>
      </div>
    </div>
  );
};
