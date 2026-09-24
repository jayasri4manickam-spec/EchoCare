import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Camera, Volume2, Droplets, Heart } from 'lucide-react';
import { getMedications, updateMedicationStatus, subscribeToStorage } from '../../services/storage';
import { speak } from '../../services/voiceEngine';
import { triggerMedicationVoiceReminder } from '../../services/reminderEngine';
import { useLanguage } from '../../data/LanguageContext';

export const MedicinesPage = ({ onOpenScanner }) => {
  const [medications, setMedications] = useState(getMedications());
  const { t } = useLanguage();

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setMedications(getMedications());
    });
    return unsub;
  }, []);

  const handleToggleStatus = (medId, currentStatus) => {
    const nextStatus = currentStatus === 'Verified' ? 'Pending' : 'Verified';
    const updated = updateMedicationStatus(medId, nextStatus);
    setMedications(updated);
  };

  const verifiedCount = medications.filter((m) => m.status === 'Verified').length;

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#F0F6F2] p-4 sm:p-6 lg:p-10 xl:p-12 pb-28 space-y-8">
      {/* Title & Peaceful Subtitle */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-[#047857] uppercase tracking-widest block">
          ● {t('todaysCarePlan')}
        </span>
        <h2 className="text-3xl sm:text-5xl font-black font-serif-heading text-[#064E3B] tracking-tight">
          {t('todaysCarePlan')}
        </h2>
        <p className="text-base sm:text-lg font-medium text-slate-600">
          {t('carePlanSub')}
        </p>
      </div>

      {/* FULL SCREEN WIDESCREEN GRID: LEFT COL (SCANNER & WELLNESS) + RIGHT COL (MEDS GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: SCANNER BANNER & WELLNESS (Desktop lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Medicine Scanner Feature Banner (Stitch Card) */}
          <div className="stitch-card p-6 bg-[#E6F4EA]/80 border border-[#C6E7D2] rounded-3xl space-y-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-white text-[#047857] rounded-2xl border border-[#C6E7D2] shrink-0">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif-heading text-[#064E3B]">
                  {t('letsCheckMed')}
                </h3>
                <p className="text-sm font-medium text-slate-700 mt-1 leading-relaxed">
                  {t('openScannerDesc')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={onOpenScanner}
                className="flex-1 w-full py-3.5 px-6 bg-[#047857] hover:bg-[#065F46] active:scale-95 text-white font-extrabold text-lg rounded-full shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {t('openScanner')}
              </button>

              <button
                onClick={() => {
                  const sampleMed = medications[0] || { name: 'Metformin', dosage: '500 mg', scheduledTime: '08:00 AM' };
                  triggerMedicationVoiceReminder(sampleMed, 1);
                }}
                className="py-3.5 px-4 bg-emerald-100 hover:bg-emerald-200 text-[#047857] rounded-full border border-[#C6E7D2] font-bold text-xs flex items-center gap-1.5 transition-all"
                title="Test Medicine Voice Alarm"
              >
                <Volume2 className="w-4 h-4 text-[#047857]" />
                <span>Test Voice Alarm</span>
              </button>
            </div>
          </div>

          {/* Daily Wellness Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black font-serif-heading text-[#064E3B]">{t('dailyWellness')}</h3>
              <span className="text-xs font-bold text-slate-500">{t('gentlePacing')}</span>
            </div>

            {/* Hydration Card */}
            <div className="stitch-card p-5 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#E6F4EA] text-[#047857] rounded-xl border border-[#C6E7D2]">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold font-serif-heading text-[#064E3B]">{t('hydration')}</h4>
                </div>
                <span className="text-xs font-bold text-slate-500">3 of 5</span>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#047857] h-full w-[60%] rounded-full" />
              </div>
              <p className="text-xs font-medium text-slate-600">{t('glassesEnjoyed')}</p>
            </div>

            {/* Gentle Movement Card */}
            <div className="stitch-card p-5 bg-white flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=150&q=80"
                alt="Garden Stroll"
                className="w-16 h-16 rounded-2xl object-cover border border-[#C6E7D2]"
              />
              <div>
                <h4 className="text-lg font-bold font-serif-heading text-[#064E3B]">{t('gentleMovement')}</h4>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {t('walkPlanned')}
                </p>
              </div>
            </div>

            {/* Shared with Family Note */}
            <div className="p-4 bg-[#E6F4EA]/60 border border-[#C6E7D2] rounded-2xl flex items-center gap-3">
              <Heart className="w-5 h-5 text-[#047857] shrink-0" />
              <p className="text-xs font-medium text-[#064E3B]">
                <strong>{t('sharedWithFamily')}:</strong> {t('sharedFamilyDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDICATIONS SCHEDULE GRID (Desktop lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
            <h3 className="text-2xl font-black font-serif-heading text-[#064E3B]">{t('medications')}</h3>
            <span className="px-3.5 py-1.5 bg-[#E6F4EA] text-[#047857] font-bold text-xs rounded-full border border-[#C6E7D2]">
              {verifiedCount} of {medications.length} taken today
            </span>
          </div>

          {/* Medications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {medications.map((med) => (
              <div
                key={med.id}
                className={`stitch-card p-5 transition-all space-y-4 flex flex-col justify-between ${
                  med.status === 'Verified' ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-white border-[#E1EFE7]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#047857]" />
                      {med.scheduledTime}
                    </span>

                    {med.status === 'Verified' ? (
                      <span className="px-3 py-1 bg-[#DCFCE7] text-[#15803D] font-extrabold text-xs rounded-full border border-[#86EFAC] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('takenAt')} {med.verifiedAt || 'Today'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200">
                        {t('dueIn1Hour')}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-2xl font-bold font-serif-heading text-[#064E3B]">
                      {med.name} <span className="text-sm font-sans font-bold text-slate-500">({med.dosage})</span>
                    </h4>
                    <p className="text-xs font-medium text-slate-600 mt-1">{med.instructions}</p>
                  </div>
                </div>

                {med.status !== 'Verified' ? (
                  <button
                    onClick={() => handleToggleStatus(med.id, med.status)}
                    className="w-full py-3 bg-[#047857] hover:bg-[#065F46] text-white font-extrabold text-sm rounded-full shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('markAsTaken')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleStatus(med.id, med.status)}
                    className="w-full py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-full border border-slate-200 hover:bg-slate-200"
                  >
                    Undo Verification
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

