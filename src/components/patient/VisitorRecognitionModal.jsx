import React, { useState } from 'react';
import { Camera, X, Sparkles, Volume2 } from 'lucide-react';
import { WebcamStream } from '../vision/WebcamStream';
import { speak } from '../../services/voiceEngine';

let lastSpokenPersonId = null;
let lastSpokenTime = 0;
const COOLDOWN_MS = 35000; // 35s debouncing cooldown

export const VisitorRecognitionModal = ({ isOpen, onClose }) => {
  const [detectedPerson, setDetectedPerson] = useState(null);

  if (!isOpen) return null;

  const handleFaceDetected = (result) => {
    if (result && result.matched && result.person) {
      const person = result.person;
      setDetectedPerson(person);

      const now = Date.now();
      if (lastSpokenPersonId !== person.id || now - lastSpokenTime > COOLDOWN_MS) {
        lastSpokenPersonId = person.id;
        lastSpokenTime = now;
        const whisper = `This is ${person.name}, your ${person.relation}. ${person.memoryNote || ''}`;
        speak(whisper);
      }
    }
  };

  const handleReplayWhisper = () => {
    if (detectedPerson) {
      const whisper = `This is ${detectedPerson.name}, your ${detectedPerson.relation}. ${detectedPerson.memoryNote || ''}`;
      speak(whisper);
    }
  };

  const handleClose = () => {
    setDetectedPerson(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border-4 border-slate-300 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">Recognize Room Visitor</h2>
              <p className="text-slate-600 font-medium text-base">
                Scanning camera feed for enrolled caregivers and family members
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-3 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Live Camera Viewport */}
        <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-inner">
          <WebcamStream active={true} onFaceDetected={handleFaceDetected} />
        </div>

        {/* Dynamic Contextual Memory Whisper Card */}
        {detectedPerson ? (
          <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-3xl shadow-sm space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-200 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={detectedPerson.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
                  alt={detectedPerson.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-400 shadow-sm"
                />
                <div>
                  <span className="px-3 py-1 bg-purple-200 text-purple-900 font-bold text-xs uppercase tracking-wider rounded-lg">
                    Recognized Visitor
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">{detectedPerson.name}</h3>
                  <p className="text-xl font-bold text-purple-700">Your {detectedPerson.relation}</p>
                </div>
              </div>

              <button
                onClick={handleReplayWhisper}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-2xl shadow-sm flex items-center gap-2"
              >
                <Volume2 className="w-6 h-6 animate-pulse" />
                Replay Whisper
              </button>
            </div>

            {detectedPerson.memoryNote && (
              <div className="bg-white p-4 rounded-2xl border border-purple-200 flex items-start gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block mb-1">
                    Shared Memory Whisper
                  </span>
                  <p className="text-xl font-semibold text-slate-900">"{detectedPerson.memoryNote}"</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl text-center text-slate-600 font-medium text-lg">
            Looking for familiar faces... Stand in front of the camera to recognize visitors.
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleClose}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xl rounded-2xl shadow-sm"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
