import React, { useState } from 'react';
import { HeartPulse, UserCheck, Volume2, VolumeX, Sun, Moon, Home, Pill, BookOpen, Users, Globe, Wrench } from 'lucide-react';
import { PinModal } from './PinModal';
import { DevTestPanel } from './DevTestPanel';
import { stopSpeaking, speak } from '../../services/voiceEngine';
import { unlockBrowserAudio } from '../../services/speechTTS';
import { getPatientProfile } from '../../services/storage';
import { useLanguage } from '../../data/LanguageContext';

export const HeaderNav = ({
  activeMode,
  setActiveMode,
  patientPage,
  setPatientPage,
  highContrast,
  setHighContrast,
  watchdogState: _watchdogState,
  ttsEnabled,
  setTtsEnabled,
}) => {
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const profile = getPatientProfile();
  const { language, setLanguage, t, languages } = useLanguage();

  const handleModeChange = (mode) => {
    if (mode === 'caregiver' && activeMode !== 'caregiver') {
      setIsPinOpen(true);
    } else {
      setActiveMode(mode);
    }
  };

  const toggleSpeech = () => {
    unlockBrowserAudio();
    if (ttsEnabled) {
      stopSpeaking();
      setTtsEnabled(false);
    } else {
      setTtsEnabled(true);
      speak('Hello! Echo voice audio is active and ready.');
    }
  };

  return (
    <>
      {/* Stitch Full Width Top Header */}
      <header className="w-full bg-[#F0F6F2]/95 backdrop-blur-md border-b border-[#E1EFE7] px-4 sm:px-8 py-3 sticky top-0 z-40 flex items-center justify-between gap-4">
        {/* Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveMode('patient');
              setPatientPage('home');
            }}
            className="p-2.5 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] rounded-2xl transition-all border border-[#C6E7D2]"
          >
            <HeartPulse className="w-6 h-6 text-[#047857]" />
          </button>
          <div>
            <h1 className="text-2xl font-black font-serif-heading text-[#064E3B] leading-tight flex items-center gap-2">
              {t('appName')}
            </h1>
            <p className="text-xs font-semibold text-slate-500">{t('appSubtitle')}</p>
          </div>
        </div>

        {/* Center Companion Ready Status Pill */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6F4EA] border border-[#C6E7D2] text-xs font-extrabold text-[#047857]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span>{t('companionReady')}</span>
          </div>
        </div>

        {/* Right Action Controls: Language Selector, Caregiver Switcher, Audio, Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center bg-white border border-[#C6E7D2] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Globe className="w-4 h-4 text-[#047857] mr-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dev Test Panel Toggle Button */}
          <button
            onClick={() => setIsDevPanelOpen(true)}
            title="Open Dev Diagnostics & Scheduler Test Panel"
            className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all border border-emerald-800 shadow-xs flex items-center gap-1"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px]">Dev Test Panel</span>
          </button>

          {/* Caregiver Switcher */}
          <button
            onClick={() => handleModeChange(activeMode === 'patient' ? 'caregiver' : 'patient')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
              activeMode === 'caregiver'
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                : 'bg-white text-slate-700 border-[#E1EFE7] hover:bg-[#E6F4EA]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">
              {activeMode === 'patient' ? t('caregiverMode') : t('patientMode')}
            </span>
          </button>

          {/* Audio TTS Toggle & Test Button */}
          <button
            onClick={toggleSpeech}
            title={ttsEnabled ? 'Click to Mute Voice' : 'Click to Enable Voice'}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              ttsEnabled
                ? 'bg-[#E6F4EA] text-[#047857] border-[#C6E7D2] shadow-xs'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 text-[#047857] animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline font-extrabold text-[11px]">
              {ttsEnabled ? 'Voice Sound Active' : 'Sound Muted'}
            </span>
          </button>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast"
            className="p-2 bg-white text-slate-700 border border-[#E1EFE7] rounded-xl"
          >
            {highContrast ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Patient Avatar Profile */}
          <button
            onClick={() => {
              setActiveMode('patient');
              setPatientPage('me');
            }}
            className="relative border-2 border-[#047857] rounded-full overflow-hidden w-9 h-9 shadow-sm"
          >
            <img
              src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
              alt={profile.preferredName || 'Margaret'}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Stitch Bottom Navigation Bar (Patient Mode) */}
      {activeMode === 'patient' && (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-[#C6E7D2] shadow-xl rounded-full px-3 py-2 flex items-center gap-1 max-w-lg w-[92%] sm:w-auto justify-around">
          <button
            onClick={() => setPatientPage('home')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-extrabold text-sm transition-all ${
              patientPage === 'home'
                ? 'bg-[#E6F4EA] text-[#047857] shadow-sm border border-[#A7F3D0]'
                : 'text-slate-600 hover:text-[#047857] hover:bg-[#F0F6F2]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{t('home')}</span>
          </button>

          <button
            onClick={() => setPatientPage('medicines')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-extrabold text-sm transition-all ${
              patientPage === 'medicines'
                ? 'bg-[#E6F4EA] text-[#047857] shadow-sm border border-[#A7F3D0]'
                : 'text-slate-600 hover:text-[#047857] hover:bg-[#F0F6F2]'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>{t('carePlan')}</span>
          </button>

          <button
            onClick={() => setPatientPage('memories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-extrabold text-sm transition-all ${
              patientPage === 'memories'
                ? 'bg-[#E6F4EA] text-[#047857] shadow-sm border border-[#A7F3D0]'
                : 'text-slate-600 hover:text-[#047857] hover:bg-[#F0F6F2]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t('memories')}</span>
          </button>

          <button
            onClick={() => setPatientPage('emergency')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-extrabold text-sm transition-all ${
              patientPage === 'emergency'
                ? 'bg-[#E6F4EA] text-[#047857] shadow-sm border border-[#A7F3D0]'
                : 'text-slate-600 hover:text-[#047857] hover:bg-[#F0F6F2]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('caregivers')}</span>
          </button>
        </nav>
      )}

      {/* Security PIN Modal */}
      <PinModal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onSuccess={() => {
          setIsPinOpen(false);
          setActiveMode('caregiver');
        }}
      />

      {/* Development Diagnostic Test Panel */}
      <DevTestPanel
        isOpen={isDevPanelOpen}
        onClose={() => setIsDevPanelOpen(false)}
      />
    </>
  );
};
