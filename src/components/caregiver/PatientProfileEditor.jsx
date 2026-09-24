import React, { useState, useEffect } from 'react';
import { User, Save, Upload, Check, Heart, Sparkles, Sliders, Shield } from 'lucide-react';
import { getPatientProfile, savePatientProfile, subscribeToStorage } from '../../services/storage';

export const PatientProfileEditor = () => {
  const [profile, setProfile] = useState(getPatientProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setProfile(getPatientProfile());
    });
    return unsub;
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (category, field, value) => {
    setProfile((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: value,
      },
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      handleChange('avatar', evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    savePatientProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const identity = profile.identity || {};
  const preferences = profile.preferences || {};
  const routines = profile.routines || {};

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-8 shadow-xl text-white">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black flex items-center gap-2 text-white">
            <User className="w-6 h-6 text-emerald-400" />
            Personal Memory Architecture & Stage Configuration
          </h3>
          <p className="text-slate-400 text-sm">
            Everything stored here builds the patient's personal memory system and configures stage-adaptive voice interactions.
          </p>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Save className="w-5 h-5" />
          Save Memory Architecture
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-400" />
          Personal Memory Architecture saved! Voice Companion will now use this context dynamically.
        </div>
      )}

      {/* SECTION 1: STAGE-ADAPTIVE INTERACTION ENGINE */}
      <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <Sliders className="w-6 h-6 text-amber-400" />
          <div>
            <h4 className="text-xl font-bold text-white">Stage-Adaptive Interaction Profile</h4>
            <p className="text-xs text-slate-400">
              Caregiver/Clinician configured cognitive support level. Changes language complexity, pacing, response length, and repetition tolerance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Early Support */}
          <div
            onClick={() => handleChange('stageProfile', 'early')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
              (profile.stageProfile || 'early') === 'early'
                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-emerald-400">EARLY SUPPORT</span>
              {(profile.stageProfile || 'early') === 'early' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <h5 className="font-bold text-base text-white">Conversational & Rich</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Full conversational responses, proactive memory prompts, routine reinforcement, and story reminiscence.
            </p>
          </div>

          {/* Moderate Support */}
          <div
            onClick={() => handleChange('stageProfile', 'moderate')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
              profile.stageProfile === 'moderate'
                ? 'bg-amber-950/60 border-amber-500 text-white shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-amber-400">MODERATE SUPPORT</span>
              {profile.stageProfile === 'moderate' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <h5 className="font-bold text-base text-white">Short & Orienting</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Short simple sentences, high repetition tolerance, gentle redirection, and frequent time/place orientation.
            </p>
          </div>

          {/* Advanced Support */}
          <div
            onClick={() => handleChange('stageProfile', 'advanced')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
              profile.stageProfile === 'advanced'
                ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-indigo-400">ADVANCED SUPPORT</span>
              {profile.stageProfile === 'advanced' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
            <h5 className="font-bold text-base text-white">Comfort & Simple Choices</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Very short language (4-8 words), familiar names focus, sensory comfort prompts, and binary simple choices.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: PATIENT CORE IDENTIFIER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-emerald-400 border-b border-slate-800 pb-2">Patient Core Profile</h4>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Full Legal Name</label>
            <input
              type="text"
              placeholder="e.g. Margaret Miller"
              value={profile.fullName || ''}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-300 uppercase mb-1">
              Preferred Spoken Name (Used by AI Voice Companion)
            </label>
            <input
              type="text"
              placeholder="e.g. Margaret"
              value={profile.preferredName || ''}
              onChange={(e) => handleChange('preferredName', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-emerald-500/60 rounded-xl text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Date of Birth</label>
              <input
                type="date"
                value={profile.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Preferred Language</label>
              <select
                value={profile.preferredLanguage || 'en-US'}
                onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                <option value="en-US">English (en-US)</option>
                <option value="en-IN">English (en-IN)</option>
                <option value="hi-IN">Hindi (hi-IN)</option>
                <option value="ta-IN">Tamil (ta-IN)</option>
                <option value="te-IN">Telugu (te-IN)</option>
                <option value="es-ES">Spanish (es-ES)</option>
              </select>
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Profile Photo</label>
            <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <img
                src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
                alt="Patient Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400"
              />
              <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: IDENTITY & LIFE HISTORY */}
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-emerald-400 border-b border-slate-800 pb-2">Identity & Life History</h4>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Profession / Career</label>
            <input
              type="text"
              placeholder="e.g. High School Biology Teacher"
              value={identity.profession || ''}
              onChange={(e) => handleNestedChange('identity', 'profession', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Hometown & Childhood Places</label>
            <input
              type="text"
              placeholder="e.g. Cape May, New Jersey"
              value={identity.hometown || ''}
              onChange={(e) => handleNestedChange('identity', 'hometown', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Places Lived</label>
            <input
              type="text"
              placeholder="e.g. Cape May, NJ · Philadelphia, PA"
              value={identity.placesLived || ''}
              onChange={(e) => handleNestedChange('identity', 'placesLived', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Important Life Events</label>
            <textarea
              rows={2}
              placeholder="e.g. Married Tom in 1978 · Daughter Priya born 1980 · Son David born 1983"
              value={identity.importantLifeEvents || ''}
              onChange={(e) => handleNestedChange('identity', 'importantLifeEvents', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: PREFERENCES & ROUTINES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-emerald-400 border-b border-slate-800 pb-2">Preferences & Comfort Anchors</h4>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Favourite Music</label>
            <input
              type="text"
              placeholder="e.g. 70s Soft Acoustic Folk & Classical Piano"
              value={preferences.favouriteMusic || ''}
              onChange={(e) => handleNestedChange('preferences', 'favouriteMusic', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Favourite Food & Drinks</label>
            <input
              type="text"
              placeholder="e.g. Warm Sourdough Bread & Chamomile Tea"
              value={preferences.favouriteFood || ''}
              onChange={(e) => handleNestedChange('preferences', 'favouriteFood', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Hobbies & Favorite Activities</label>
            <input
              type="text"
              placeholder="e.g. Growing heirloom roses, garden strolls"
              value={preferences.hobbies || ''}
              onChange={(e) => handleNestedChange('preferences', 'hobbies', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-bold text-emerald-400 border-b border-slate-800 pb-2">Important Daily Routines</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Wake Time</label>
              <input
                type="text"
                placeholder="e.g. 07:00 AM"
                value={routines.wakeTime || ''}
                onChange={(e) => handleNestedChange('routines', 'wakeTime', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Sleep Time</label>
              <input
                type="text"
                placeholder="e.g. 08:30 PM"
                value={routines.sleep || ''}
                onChange={(e) => handleNestedChange('routines', 'sleep', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Daily Walks & Exercise</label>
            <input
              type="text"
              placeholder="e.g. 4:00 PM Garden stroll with Sarah"
              value={routines.walks || ''}
              onChange={(e) => handleNestedChange('routines', 'walks', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Meal Routine Notes</label>
            <input
              type="text"
              placeholder="e.g. Breakfast 8 AM · Lunch 12:30 PM · Dinner 6:30 PM"
              value={routines.meals || ''}
              onChange={(e) => handleNestedChange('routines', 'meals', e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
