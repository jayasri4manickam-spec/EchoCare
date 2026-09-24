import React, { useState, useEffect } from 'react';
import { User, Heart, ShieldAlert, FileText, Clock, ArrowLeft, Sun, Moon, Globe } from 'lucide-react';
import { getPatientProfile, subscribeToStorage } from '../../services/storage';

export const PatientProfilePage = ({ onBackHome }) => {
  const [profile, setProfile] = useState(getPatientProfile());

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setProfile(getPatientProfile());
    });
    return unsub;
  }, []);

  const hasData = Boolean(profile.fullName || profile.preferredName);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackHome}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl transition-all"
            title="Return to Home"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">About Me — Patient Profile</h2>
            <p className="text-xl text-slate-600 font-medium">Personal information and special care instructions</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <User className="w-10 h-10" />
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">No Patient Profile Configured</h3>
          <p className="text-xl text-slate-600 max-w-md mx-auto">
            The patient profile is currently empty. Caregivers can configure personal details, preferred name, and language in Caregiver Settings.
          </p>
        </div>
      ) : (
        /* Profile Info Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Identity Card */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
            <img
              src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'}
              alt={profile.fullName || 'Patient'}
              className="w-36 h-36 rounded-full object-cover border-4 border-emerald-400 shadow-md"
            />
            <div>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900">
                {profile.preferredName || profile.fullName}
              </h3>
              {profile.fullName && profile.preferredName && profile.fullName !== profile.preferredName && (
                <p className="text-xl text-slate-500 font-medium">Full Name: {profile.fullName}</p>
              )}
              {profile.age && <p className="text-xl font-bold text-emerald-700 mt-1">{profile.age} years old</p>}
            </div>

            <div className="w-full pt-4 border-t border-slate-200 text-left space-y-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-700">
                <Globe className="w-5 h-5 text-emerald-600" />
                <span>Language: <strong>{profile.preferredLanguage || 'English (en-IN)'}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-700">
                <Sun className="w-5 h-5 text-amber-500" />
                <span>Wake Up: <strong>{profile.wakeUpTime || '07:00 AM'}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-700">
                <Moon className="w-5 h-5 text-indigo-500" />
                <span>Sleep Time: <strong>{profile.sleepTime || '09:30 PM'}</strong></span>
              </div>
            </div>
          </div>

          {/* Details & Notes Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Emergency Notes */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">Emergency Medical Notes</h4>
              </div>
              <p className="text-xl text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {profile.emergencyNotes || 'No specific emergency medical notes entered.'}
              </p>
            </div>

            {/* Important Instructions */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">Important Daily Instructions</h4>
              </div>
              <p className="text-xl text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {profile.importantInstructions || 'No daily care instructions entered.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
