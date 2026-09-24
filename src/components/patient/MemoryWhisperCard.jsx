import React, { useEffect } from 'react';
import { Volume2, Heart, Sparkles, Clock, Calendar } from 'lucide-react';
import { speakWhisper } from '../../services/speechTTS';

export const MemoryWhisperCard = ({ person, ttsEnabled }) => {
  const whisperText = person ? `This is ${person.name}, your ${person.relation}. ${person.memoryNote}` : '';

  // Automatically trigger voice whisper upon recognition
  useEffect(() => {
    if (ttsEnabled && person && whisperText) {
      speakWhisper(whisperText);
    }
  }, [person, ttsEnabled, whisperText]);

  if (!person) return null;

  const handleReplayWhisper = () => {
    speakWhisper(whisperText, true);
  };

  return (
    <div className="w-full bg-slate-900/95 border-4 border-sky-400/80 rounded-3xl p-6 shadow-2xl backdrop-blur-lg transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 high-contrast-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {/* Avatar / Relation Icon */}
          <div className="relative">
            <img
              src={person.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
              alt={person.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-sky-400 shadow-md"
            />
            <div className="absolute -bottom-2 -right-2 p-1.5 bg-sky-500 text-white rounded-xl shadow-lg">
              <Heart className="w-4 h-4 fill-current" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-sky-500/20 text-sky-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-sky-500/30">
                Recognized Family
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {person.lastVisited}
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 high-contrast-text-yellow">
              {person.name}
            </h3>
            <p className="text-xl font-bold text-sky-400">
              Your {person.relation}
            </p>
          </div>
        </div>

        {/* Audio Replay Whisper Button */}
        <button
          onClick={handleReplayWhisper}
          className="flex items-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg shadow-sky-600/30 transition-all border border-sky-400/40"
        >
          <Volume2 className="w-6 h-6 animate-pulse" />
          Replay Whisper
        </button>
      </div>

      {/* Shared Memory Whisper Note */}
      <div className="mt-4 bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800 flex items-start gap-3">
        <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0 mt-1">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
            Recent Shared Memory
          </span>
          <p className="text-xl sm:text-2xl font-semibold text-slate-100 leading-snug">
            "{person.memoryNote}"
          </p>
        </div>
      </div>
    </div>
  );
};
