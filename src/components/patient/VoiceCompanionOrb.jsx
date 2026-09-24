import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Loader2, Music, ShieldCheck, PhoneCall, Sparkles, AlertCircle, Send, Square } from 'lucide-react';
import {
  listen,
  stopListening,
  stopSpeaking,
  speak,
  subscribeToVoiceEngine,
  startWakeWordDetection,
  handleVoiceCommand,
} from '../../services/voiceEngine';
import { playRelaxingMelody, stopMelody } from '../../services/speechTTS';
import { useLanguage } from '../../data/LanguageContext';

export const VoiceCompanionOrb = ({ onNavigateToEmergency }) => {
  const [voiceState, setVoiceState] = useState('IDLE'); // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR'
  const [wakeInfo, setWakeInfo] = useState({ isWakeWordActive: false, isContinuousSupported: true });
  const [textInput, setTextInput] = useState('');
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const unsub = subscribeToVoiceEngine((state, info) => {
      setVoiceState(state);
      if (info) setWakeInfo(info);
    });

    // Start wake-word listener on component mount
    startWakeWordDetection();

    return unsub;
  }, []);

  const handleOrbClick = () => {
    if (voiceState === 'SPEAKING') {
      stopSpeaking();
    } else if (voiceState === 'LISTENING' || voiceState === 'THINKING') {
      stopListening();
    } else {
      listen(
        (result) => {
          console.log('Orb voice input:', result);
        },
        (err) => {
          console.warn('Orb listener error:', err);
        }
      );
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    handleVoiceCommand(msg);
  };

  const handleToggleMelody = () => {
    if (isPlayingMelody) {
      stopMelody();
      stopSpeaking();
      setIsPlayingMelody(false);
    } else {
      setIsPlayingMelody(true);
      playRelaxingMelody(() => {
        setIsPlayingMelody(false);
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full my-2">
      {/* Central Interactive Voice Companion Orb */}
      <div className="relative flex items-center justify-center py-4">
        {/* Soft Organic Outer Rings */}
        <div
          className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full transition-all duration-700 blur-xl opacity-30 ${
            voiceState === 'LISTENING'
              ? 'bg-[#059669] animate-ping opacity-25'
              : voiceState === 'THINKING'
              ? 'bg-[#047857] animate-pulse opacity-40'
              : voiceState === 'SPEAKING'
              ? 'bg-[#059669] animate-pulse opacity-50'
              : voiceState === 'ERROR'
              ? 'bg-amber-500 opacity-20'
              : 'bg-[#A7F3D0] animate-sage-orb'
          }`}
        />

        {/* Concentric Circle Backdrop Rings */}
        <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-[#C6E7D2] bg-[#E6F4EA]/40 pointer-events-none" />
        <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-[#A7F3D0] bg-[#D1FAE5]/60 pointer-events-none" />

        {/* Main Touch Button */}
        <button
          onClick={handleOrbClick}
          aria-label="EchoCare Voice Companion. Say Echo or tap to speak."
          className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-xl focus:outline-none focus:ring-8 focus:ring-[#A7F3D0] active:scale-95 border-4 ${
            voiceState === 'LISTENING'
              ? 'bg-[#047857] border-[#A7F3D0] text-white shadow-emerald-700/40 scale-105'
              : voiceState === 'THINKING'
              ? 'bg-[#065F46] border-emerald-300 text-white shadow-emerald-800/40'
              : voiceState === 'SPEAKING'
              ? 'bg-[#059669] border-[#A7F3D0] text-white shadow-emerald-600/40 scale-102'
              : voiceState === 'ERROR'
              ? 'bg-amber-800 border-amber-300 text-white'
              : 'bg-[#047857] hover:bg-[#065F46] border-[#A7F3D0] text-white shadow-emerald-800/20'
          }`}
        >
          {/* Audio Waveform Visualization for Speaking */}
          {voiceState === 'SPEAKING' && (
            <div className="flex items-center gap-1.5 mb-2 h-7">
              <span className="w-1.5 bg-white rounded-full animate-wave-1 h-6" />
              <span className="w-1.5 bg-white rounded-full animate-wave-2 h-8" />
              <span className="w-1.5 bg-white rounded-full animate-wave-3 h-5" />
              <span className="w-1.5 bg-white rounded-full animate-wave-4 h-7" />
            </div>
          )}

          {/* Soft Expanding Rings for Listening */}
          {voiceState === 'LISTENING' && (
            <div className="flex items-center gap-1 mb-2 h-7">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping delay-100" />
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping delay-200" />
            </div>
          )}

          <div className={voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 'scale-90' : 'mb-1'}>
            {voiceState === 'LISTENING' && <Mic className="w-11 h-11 animate-pulse" />}
            {voiceState === 'THINKING' && <Loader2 className="w-11 h-11 animate-spin" />}
            {voiceState === 'SPEAKING' && <Volume2 className="w-11 h-11" />}
            {voiceState === 'ERROR' && <AlertCircle className="w-11 h-11 text-amber-200" />}
            {voiceState === 'IDLE' && <Mic className="w-11 h-11" />}
          </div>

          {/* Exact Orb Status Labels */}
          <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase px-2 text-center">
            {voiceState === 'LISTENING' && "I'm listening."}
            {voiceState === 'THINKING' && 'One moment...'}
            {voiceState === 'SPEAKING' && 'Echo is speaking.'}
            {voiceState === 'ERROR' && "I didn't quite catch that"}
            {voiceState === 'IDLE' &&
              (wakeInfo.isContinuousSupported ? 'Say "Echo"' : 'Tap Echo to speak')}
          </span>
        </button>
      </div>

      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
        {voiceState === 'IDLE' &&
          (wakeInfo.isContinuousSupported
            ? 'Say "Echo" to speak naturally'
            : 'Tap the orb or button below to speak')}
        {voiceState !== 'IDLE' && t('readyWhenYouAre')}
      </p>

      {/* AI Suggestion Whisper Card */}
      <div className="w-full stitch-card p-4 sm:p-5 bg-white border border-[#C6E7D2] rounded-3xl shadow-sm text-center space-y-2">
        <p className="text-base sm:text-lg font-semibold text-[#064E3B] leading-relaxed flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-[#047857] shrink-0" />
          "{t('aiWhisper')}"
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="w-full space-y-3 pt-1">
        <button
          onClick={handleOrbClick}
          className="w-full py-4 bg-[#047857] hover:bg-[#065F46] active:scale-95 text-white font-extrabold text-xl rounded-full shadow-md transition-all flex items-center justify-center gap-3 border border-[#059669]"
        >
          <Mic className="w-6 h-6" />
          {t('tapToSpeak')}
        </button>

        {/* Direct Text Chat Bar Fallback */}
        <form onSubmit={handleSendText} className="flex items-center gap-2 bg-white border border-[#C6E7D2] p-1.5 rounded-full shadow-sm">
          <input
            type="text"
            placeholder="Type your message to Echo here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 px-4 py-2 bg-transparent text-slate-800 font-semibold text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="p-2.5 bg-[#047857] hover:bg-[#065F46] text-white rounded-full font-bold transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <button
          onClick={handleToggleMelody}
          className={`w-full py-3.5 font-bold text-lg rounded-full border transition-all flex items-center justify-center gap-2.5 ${
            isPlayingMelody
              ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
              : 'bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] border-[#C6E7D2]'
          }`}
        >
          {isPlayingMelody ? (
            <>
              <Square className="w-5 h-5 fill-current text-red-600" />
              Stop Melody
            </>
          ) : (
            <>
              <Music className="w-5 h-5 text-[#047857]" />
              {t('playMelody')} (Soothing Music)
            </>
          )}
        </button>

        <p className="text-sm font-medium text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-4 h-4 text-[#047857]" />
          {t('readyWhenYouAre')}
        </p>
      </div>

      {/* TTS Voice Unavailability Notice Banner */}
      {wakeInfo?.voiceUnavailableNotice && (
        <div className="w-full p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{wakeInfo.voiceUnavailableNotice}</span>
        </div>
      )}

      {/* Autoplay Blocked Notice Banner */}
      {wakeInfo?.autoplayBlockedNotice && (
        <div
          onClick={handleOrbClick}
          className="w-full p-3.5 bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shadow-md cursor-pointer hover:bg-emerald-800 transition-all animate-pulse"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>Medication reminder ready — tap to hear Echo</span>
          </div>
          <span className="bg-white text-emerald-900 px-3 py-1 rounded-full text-xs font-bold shrink-0">Tap to Play</span>
        </div>
      )}

      {/* Quick Need Someone Card */}
      <div
        onClick={onNavigateToEmergency}
        className="w-full stitch-card p-4 bg-[#E6F4EA]/60 hover:bg-[#E6F4EA] border border-[#C6E7D2] rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white text-[#047857] rounded-xl border border-[#C6E7D2]">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-base font-extrabold text-[#064E3B]">{t('needSomeone')}</h4>
            <p className="text-xs font-semibold text-slate-600">{t('tapToNotify')}</p>
          </div>
        </div>
        <span className="text-[#047857] font-bold text-xl">→</span>
      </div>
    </div>
  );
};
