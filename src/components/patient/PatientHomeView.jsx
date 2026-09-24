import React, { useState, useEffect } from 'react';
import { Clock, Play, Pill, Heart, ShieldCheck, Sparkles, MessageSquare, PhoneCall, Volume2, UserCheck } from 'lucide-react';
import { VoiceCompanionOrb } from './VoiceCompanionOrb';
import { getPatientProfile, getMedications, getMemories, subscribeToStorage } from '../../services/storage';
import { subscribeToOrchestrator } from '../../services/orchestrator';
import { speak } from '../../services/voiceEngine';
import { unlockBrowserAudio } from '../../services/speechTTS';
import { useLanguage } from '../../data/LanguageContext';

export const PatientHomeView = ({ onNavigate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState(getPatientProfile());
  const [medications, setMedications] = useState(getMedications());
  const [memories, setMemories] = useState(getMemories());
  const [conversationStream, setConversationStream] = useState([]);
  const [isAmbient, setIsAmbient] = useState(false);
  const { t } = useLanguage();

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Storage & Orchestrator subscriptions
  useEffect(() => {
    const unsubStorage = subscribeToStorage(() => {
      setProfile(getPatientProfile());
      setMedications(getMedications());
      setMemories(getMemories());
    });

    const unsubOrchestrator = subscribeToOrchestrator(({ history }) => {
      setConversationStream(history);
    });

    return () => {
      unsubStorage();
      unsubOrchestrator();
    };
  }, []);

  // 3. Ambient Mode inactivity timer (45 seconds)
  useEffect(() => {
    let activityTimer = null;

    const resetInactivity = () => {
      setIsAmbient(false);
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        setIsAmbient(true);
      }, 45000); // 45 seconds of inactivity
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);

    resetInactivity();

    return () => {
      clearTimeout(activityTimer);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
    };
  }, []);

  const patientName = profile.preferredName || profile.fullName || 'Margaret';
  const pendingMeds = medications.filter((m) => m.status === 'Pending' || m.status === 'Scheduled');
  const nextMed = pendingMeds[0] || medications[0];
  const featuredMemory = memories[0];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-[#F0F6F2] p-4 sm:p-6 lg:p-10 xl:p-12 pb-28 relative">
      {/* AMBIENT MODE OVERLAY */}
      {isAmbient && (
        <div
          onClick={() => setIsAmbient(false)}
          className="fixed inset-0 z-50 bg-[#064E3B]/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center space-y-8 cursor-pointer animate-fadeIn"
        >
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-[#059669]/40 border-4 border-[#A7F3D0]/60 animate-pulse flex items-center justify-center shadow-2xl">
            <div className="w-32 h-32 rounded-full bg-[#047857] flex items-center justify-center">
              <span className="text-2xl font-black text-white">Echo</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-6xl sm:text-7xl font-black font-serif-heading text-white tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p className="text-2xl font-bold text-[#A7F3D0]">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <p className="text-3xl font-serif-heading text-white/90 italic pt-4">
            "I'm right here with you, {patientName}."
          </p>

          <span className="px-6 py-2 bg-white/10 border border-white/20 text-white font-extrabold text-sm rounded-full">
            Say "Echo" or tap screen to wake
          </span>
        </div>
      )}

      {/* TOP UNIVERSAL STATUS & DATE BAR WITH ALL 6 LANGUAGE VOICE TEST BUTTONS */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-bold text-[#047857] bg-[#E6F4EA] border border-[#C6E7D2] p-4 sm:px-6 sm:py-3.5 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#059669] animate-pulse" />
          <span className="text-sm font-extrabold text-[#064E3B]">EchoCare Multilingual Voice Active</span>
        </div>

        {/* 6 Language Quick Voice Test Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-[#064E3B] mr-1">Test Voice Out Loud:</span>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('Hello! I am Echo. English voice output is active and working clearly.', 'en-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇬🇧 English
          </button>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('வணக்கம்! நான் எக்கோ. தமிழ் குரல் தெளிவாகக் கேட்கிறது.', 'ta-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇮🇳 தமிழ்
          </button>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('नमस्ते! मैं एको हूँ। हिन्दी आवाज़ बिल्कुल साफ़ सुनाई दे रही है।', 'hi-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇮🇳 हिन्दी
          </button>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('నమస్కారం! నేను ఎకో. నా తెలుగు వాయిస్ బాగా పనిచేస్తోంది.', 'te-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇮🇳 తెలుగు
          </button>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('നമസ്കാരം! ഞാൻ എക്കോ ആണ്. എന്റെ മലയാളം ശബ്ദം വ്യക്തമായി കേൾക്കാം.', 'ml-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇮🇳 മലയാളം
          </button>

          <button
            onClick={() => {
              unlockBrowserAudio();
              speak('ನಮಸ್ಕಾರ! ನಾನು ಎಕೋ. ನನ್ನ ಕನ್ನಡ ಧ್ವನಿ ಸಕ್ರಿಯವಾಗಿದೆ.', 'kn-IN');
            }}
            className="py-1.5 px-3 bg-white hover:bg-[#D1EAD8] text-[#064E3B] border border-[#C6E7D2] rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            🇮🇳 ಕನ್ನಡ
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-700 font-semibold">
          <Clock className="w-4 h-4 text-[#047857]" />
          <span>
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* FULL-SCREEN MAIN WIDESCREEN GRID SYSTEM */}
      <div className="w-full space-y-8">
        {/* UPPER HERO ROW: VOICE ORB (LEFT) + LIVE CONVERSATION STREAM (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMN 1: VOICE ORB & GREETING (Desktop lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="stitch-card p-6 sm:p-8 bg-white space-y-6 text-center">
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-[#047857] uppercase tracking-widest block">
                  Voice Companion First
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif-heading text-[#064E3B] tracking-tight">
                  {t('greeting').replace('Margaret', patientName)}
                </h2>
                <p className="text-base sm:text-lg font-medium text-slate-600">
                  {t('greetingSub')}
                </p>
              </div>

              {/* Voice Orb Component */}
              <VoiceCompanionOrb onNavigateToEmergency={() => onNavigate('emergency')} />
            </div>
          </div>

          {/* COLUMN 2: LIVE SPOKEN CONVERSATION STREAM (Desktop lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="stitch-card p-6 sm:p-8 bg-white space-y-6 min-h-[580px] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-4">
                <div>
                  <h3 className="text-2xl font-black font-serif-heading text-[#064E3B] flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-[#047857]" />
                    Live Spoken Conversation Stream
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Real-time multi-turn memory & adaptive stage context
                  </p>
                </div>
                <span className="text-xs font-extrabold text-[#047857] px-3.5 py-1.5 bg-[#E6F4EA] rounded-full border border-[#C6E7D2]">
                  Context Active
                </span>
              </div>

              {conversationStream.length === 0 ? (
                <div className="my-auto py-16 text-center text-slate-400 space-y-4">
                  <Sparkles className="w-12 h-12 mx-auto text-[#047857] opacity-40 animate-pulse" />
                  <p className="text-lg font-bold text-[#064E3B]">
                    Say <strong className="text-[#047857]">"Echo"</strong> or tap the orb to start speaking naturally.
                  </p>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    EchoCare listens continuously and remembers your past stories, medications, and family members.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left max-w-2xl mx-auto">
                    <div className="p-3.5 bg-[#F0F6F2] rounded-2xl border border-[#C6E7D2] text-xs text-slate-700">
                      <p className="font-bold text-[#064E3B] mb-1">Medication:</p>
                      <p>"Echo, what medicine do I take now?"</p>
                    </div>
                    <div className="p-3.5 bg-[#F0F6F2] rounded-2xl border border-[#C6E7D2] text-xs text-slate-700">
                      <p className="font-bold text-[#064E3B] mb-1">Family:</p>
                      <p>"Echo, when will my daughter come?"</p>
                    </div>
                    <div className="p-3.5 bg-[#F0F6F2] rounded-2xl border border-[#C6E7D2] text-xs text-slate-700">
                      <p className="font-bold text-[#064E3B] mb-1">Comfort:</p>
                      <p>"Echo, I'm feeling a little anxious today."</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin">
                  {conversationStream.slice(0, 8).map((turn) => (
                    <div key={turn.id} className="space-y-2 text-sm sm:text-base">
                      {/* User Query */}
                      <div className="p-4 bg-[#E6F4EA] border border-[#C6E7D2] rounded-3xl rounded-tr-none ml-12 text-right">
                        <span className="text-xs font-bold text-slate-400 block mb-1">{turn.timestamp} · You</span>
                        <p className="font-bold text-[#064E3B] text-lg">"{turn.userMsg}"</p>
                      </div>

                      {/* AI Response */}
                      <div className="p-4 bg-[#FBF9F5] border border-[#EAE5D9] rounded-3xl rounded-tl-none mr-12 text-left space-y-1">
                        <span className="text-xs font-bold text-[#047857] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#047857]" /> EchoCare AI ({turn.agentSource})
                        </span>
                        <p className="font-medium text-slate-800 text-lg leading-relaxed">"{turn.aiMsg}"</p>
                        <button
                          onClick={() => speak(turn.aiMsg)}
                          className="pt-1 text-xs font-bold text-[#047857] hover:underline flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Replay Voice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-[#E6F4EA]/60 border border-[#C6E7D2] rounded-2xl flex items-center justify-between gap-4 text-xs font-semibold text-[#064E3B]">
                <span>Stage Adaptive Protocol: Gentle reassurance & validation active</span>
                <span className="text-[#047857] font-bold">Privacy Mode: On-Device Voice</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER ROW: TODAY'S ESSENTIALS & DASHBOARD (FULL WIDTH 3 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
          {/* Next Medication Reminder Card */}
          {nextMed && (
            <div className="stitch-card p-6 bg-white space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
                  <span className="text-xs font-extrabold text-[#047857] uppercase tracking-widest flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-[#047857]" /> Next Medicine
                  </span>
                  <span className="text-xs font-bold px-3 py-1 bg-[#E6F4EA] text-[#047857] rounded-full border border-[#C6E7D2]">
                    {nextMed.scheduledTime}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-bold font-serif-heading text-[#064E3B]">
                    {nextMed.name} <span className="text-sm font-sans font-medium text-slate-500">({nextMed.dosage})</span>
                  </h4>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">{nextMed.instructions}</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('medicines')}
                className="w-full py-3 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] font-extrabold text-sm rounded-full border border-[#C6E7D2] transition-all flex items-center justify-center gap-2 mt-4"
              >
                Open Care Plan & Scan Medicine →
              </button>
            </div>
          )}

          {/* Featured Personal Memory Card */}
          {featuredMemory && (
            <div className="stitch-card p-6 bg-white space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
                  <span className="text-xs font-extrabold text-[#047857] uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#047857]" /> Memory of the Day
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{featuredMemory.dateLabel}</span>
                </div>

                <div className="space-y-2">
                  <img
                    src={featuredMemory.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'}
                    alt={featuredMemory.title}
                    className="w-full h-40 rounded-2xl object-cover border border-[#C6E7D2]"
                  />
                  <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">{featuredMemory.title}</h4>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">{featuredMemory.story}</p>
                </div>
              </div>

              <button
                onClick={() => speak(`${featuredMemory.title}. ${featuredMemory.story}`)}
                className="w-full py-3 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] font-bold text-sm rounded-full border border-[#C6E7D2] flex items-center justify-center gap-2 transition-all mt-4"
              >
                <Play className="w-4 h-4 fill-current" />
                Listen to Story
              </button>
            </div>
          )}

          {/* Quick Contact / Caregiver Shortcut */}
          <div className="stitch-card p-6 bg-white space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
                <span className="text-xs font-extrabold text-[#047857] uppercase tracking-widest flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-[#047857]" /> Primary Caregiver
                </span>
                <span className="text-xs font-bold text-emerald-600">On Call</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">Sarah Miller (Daughter)</h4>
                <p className="text-sm font-medium text-slate-600">
                  Primary family contact & memory record administrator.
                </p>
                <div className="p-3 bg-[#F0F6F2] rounded-xl border border-[#C6E7D2] text-xs font-semibold text-[#064E3B]">
                  ● Next visit scheduled for tomorrow at 2:00 PM
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('emergency')}
              className="w-full py-3 bg-[#047857] hover:bg-[#065F46] text-white font-extrabold text-sm rounded-full shadow-sm transition-all flex items-center justify-center gap-2 mt-4"
            >
              <PhoneCall className="w-4 h-4" />
              Call Sarah Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
