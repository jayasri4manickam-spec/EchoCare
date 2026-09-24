import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, ShieldCheck, ShieldAlert, X, Check, User, Heart } from 'lucide-react';
import { getEmergencyContacts, dispatchEmergencyAlert, cancelEmergencyAlert } from '../../services/emergencyService';
import { getPatientProfile } from '../../services/storage';
import { useLanguage } from '../../data/LanguageContext';

export const EmergencyPage = () => {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isDispatched, setIsDispatched] = useState(false);
  const timerRef = useRef(null);

  const profile = getPatientProfile();
  const emergencyContacts = getEmergencyContacts();
  const { t } = useLanguage();

  const handleStartSOS = () => {
    setIsActive(true);
    setCountdown(5);
    setIsDispatched(false);
  };

  const handleCancelSOS = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    setCountdown(5);
    setIsDispatched(false);
    cancelEmergencyAlert();
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            dispatchEmergencyAlert();
            setIsDispatched(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#F0F6F2] p-4 sm:p-6 lg:p-10 xl:p-12 pb-28 space-y-8">
      {/* FULL-SCREEN 2-COLUMN DESKTOP GRID SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: ROOM STATUS & GIANT SOS TRIGGER (Desktop lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Room Header Banner (Stitch Card) */}
          <div className="stitch-card p-6 bg-white space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
                alt="Margaret"
                className="w-20 h-20 rounded-full object-cover border-4 border-[#047857]"
              />
              <div>
                <h2 className="text-3xl font-black font-serif-heading text-[#064E3B]">
                  {profile.preferredName || profile.fullName || 'Margaret Miller'}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{t('roomInfo')}</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="p-3.5 bg-[#E6F4EA] border border-[#C6E7D2] rounded-2xl flex items-center gap-3 text-xs font-bold text-[#047857]">
              <span className="w-3 h-3 rounded-full bg-[#059669] animate-pulse shrink-0" />
              <span>{t('stableResting')}. {t('ambientNormal')}.</span>
            </div>

            <div className="p-3.5 bg-[#E6F4EA]/60 border border-[#C6E7D2] rounded-2xl flex items-center gap-3 text-xs font-medium text-[#064E3B]">
              <ShieldCheck className="w-5 h-5 text-[#047857] shrink-0" />
              <span><strong>{t('careProtocolActive')}:</strong> {t('directLine')}.</span>
            </div>
          </div>

          {/* Primary Emergency Action Button (Stitch Red Pill) */}
          <button
            onClick={handleStartSOS}
            className="w-full py-6 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-extrabold text-2xl sm:text-3xl rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 border-4 border-red-400"
          >
            <PhoneCall className="w-8 h-8 text-white animate-bounce" />
            {t('callHelpHold')}
          </button>
        </div>

        {/* RIGHT COLUMN: TRUSTED CIRCLE CONTACTS (Desktop lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
            <h3 className="text-2xl font-black font-serif-heading text-[#064E3B] flex items-center gap-2">
              <User className="w-6 h-6 text-[#047857]" />
              {t('trustedCircle')}
            </h3>
            <span className="text-xs font-bold text-slate-500">{emergencyContacts.length} {t('activeCount')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="stitch-card p-5 bg-white space-y-4 flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <img
                    src={contact.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80'}
                    alt={contact.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-[#C6E7D2]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">
                        {contact.name} {contact.primaryContact && '★'}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{contact.relation}</p>
                    <p className="text-sm font-mono font-bold text-[#047857] mt-1">{contact.phone}</p>
                  </div>
                </div>

                <button
                  onClick={handleStartSOS}
                  className="w-full py-2.5 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] font-bold text-xs rounded-full border border-[#C6E7D2]"
                >
                  {t('callDirectly')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOWER SECTION: DAILY OBSERVATIONS & COMPANION TIMELINE (FULL WIDTH 2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Daily Observations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
            <h3 className="text-2xl font-black font-serif-heading text-[#064E3B] flex items-center gap-2">
              <Heart className="w-6 h-6 text-[#047857]" />
              {t('dailyObservations')}
            </h3>
            <span className="text-xs font-bold text-slate-500">{t('todayWed')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="stitch-card p-5 bg-white space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('moodSpirit')}
              </span>
              <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">{t('gentleCheerful')}</h4>
            </div>

            <div className="stitch-card p-5 bg-white space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('sleepOverview')}
              </span>
              <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">{t('sleepDuration')}</h4>
            </div>

            <div className="stitch-card p-5 bg-white space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('dailyCareRoutine')}
              </span>
              <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">{t('medsVerified')}</h4>
            </div>

            <div className="stitch-card p-5 bg-white space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t('outdoor')}
              </span>
              <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">{t('freshAirWalk')}</h4>
            </div>
          </div>
        </div>

        {/* Companion Timeline / Journal Section */}
        <div className="space-y-4">
          <div className="border-b border-[#E1EFE7] pb-3">
            <h3 className="text-2xl font-black font-serif-heading text-[#064E3B]">{t('companionTimeline')}</h3>
          </div>

          <div className="stitch-card p-6 bg-white space-y-4">
            <div className="flex items-start gap-3 text-xs sm:text-sm border-b border-[#E1EFE7] pb-3">
              <span className="w-3 h-3 rounded-full bg-[#059669] mt-1 shrink-0" />
              <div>
                <span className="font-bold text-[#064E3B]">EchoCare Memory Chat</span> · <span className="text-slate-400">3:15 PM</span>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">Conversed softly about her old rose garden & childhood spring planting.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs sm:text-sm border-b border-[#E1EFE7] pb-3">
              <span className="w-3 h-3 rounded-full bg-[#059669] mt-1 shrink-0" />
              <div>
                <span className="font-bold text-[#064E3B]">Lunch & Medication</span> · <span className="text-slate-400">12:45 PM</span>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">Vegetable broth meal finished. Afternoon vitamins visually recognized.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-[#059669] mt-1 shrink-0" />
              <div>
                <span className="font-bold text-[#064E3B]">Hydration Prompt</span> · <span className="text-slate-400">10:30 AM</span>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">Gentle reminder chime: warm chamomile tea offered and enjoyed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Second Cancellation Countdown Overlay Modal */}
      {isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#064E3B]/90 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-white border-4 border-red-600 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            {!isDispatched ? (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-red-100 text-red-600 border-4 border-red-500 flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-14 h-14" />
                </div>

                <h3 className="text-4xl font-black font-serif-heading text-slate-900">Emergency Call Initiating</h3>
                <p className="text-2xl text-slate-600 font-medium">
                  Dispatching alert call to emergency contacts in:
                </p>

                <div className="text-8xl font-black text-red-600 font-mono my-4">{countdown}s</div>

                <button
                  onClick={handleCancelSOS}
                  className="w-full py-6 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black text-3xl rounded-3xl border-4 border-slate-700 shadow-xl transition-all flex items-center justify-center gap-4"
                >
                  <X className="w-10 h-10 text-red-400" />
                  CANCEL CALL
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 text-emerald-600 border-4 border-emerald-500 flex items-center justify-center">
                  <Check className="w-14 h-14" />
                </div>

                <h3 className="text-4xl font-black font-serif-heading text-emerald-700">Emergency Alert Dispatched!</h3>
                <p className="text-2xl text-slate-700 font-medium">
                  An urgent call and notification have been sent to your primary caregiver.
                </p>

                <button
                  onClick={() => setIsActive(false)}
                  className="w-full py-5 bg-[#047857] hover:bg-[#065F46] text-white font-extrabold text-2xl rounded-2xl shadow-md"
                >
                  Return to Home
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

