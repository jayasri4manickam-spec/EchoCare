import React, { useState, useEffect } from 'react';
import { Activity, Pill, Heart, ShieldAlert, Mic, Sparkles, UserCheck, Calendar, Filter } from 'lucide-react';
import { getLongitudinalTimeline, getPatientProfile, subscribeToStorage } from '../../services/storage';

export const LongitudinalCareTimelineTab = () => {
  const [events, setEvents] = useState(getLongitudinalTimeline());
  const [activeFilter, setActiveFilter] = useState('All');
  const [profile, setProfile] = useState(getPatientProfile());

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setEvents(getLongitudinalTimeline());
      setProfile(getPatientProfile());
    });
    return unsub;
  }, []);

  const patientName = profile.preferredName || profile.fullName || 'Margaret';

  const filterCategories = ['All', 'Medication', 'Mood', 'Mobility', 'Memory', 'Safety', 'Observation', 'Family'];

  const filteredEvents = activeFilter === 'All'
    ? events
    : events.filter((e) => e.category?.toLowerCase() === activeFilter.toLowerCase());

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'medication':
        return <Pill className="w-5 h-5 text-emerald-400" />;
      case 'mood':
        return <Activity className="w-5 h-5 text-amber-400" />;
      case 'mobility':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'memory':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'safety':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'observation':
        return <Mic className="w-5 h-5 text-emerald-400" />;
      case 'family':
        return <Heart className="w-5 h-5 text-rose-400" />;
      default:
        return <Calendar className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              Longitudinal Health & Care Memory
            </span>
            <h3 className="text-2xl font-black text-white">{patientName}'s Story & Care Timeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological care events following the patient across medication, observations, mood, visits, and safety.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Total Events:</span>
            <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold rounded-full">
              {events.length} Events
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </span>
          {filterCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeFilter === cat
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Chronological Timeline Stream */}
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Calendar className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <h4 className="text-lg font-bold">No timeline events yet.</h4>
            <p className="text-xs">EchoCare will build the story of care here as events occur.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Timeline Dot Icon */}
                <div className="absolute -left-[35px] top-1 w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center shadow-md">
                  {getCategoryIcon(evt.category)}
                </div>

                {/* Event Card */}
                <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-slate-900 text-slate-300 font-extrabold text-[11px] rounded-md border border-slate-800">
                        {evt.category || 'General'}
                      </span>
                      <h4 className="text-base font-bold text-white">{evt.title}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {evt.timestamp} · {evt.date}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{evt.detail}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Source: <strong className="text-slate-400">{evt.source}</strong></span>
                    <span className="italic">Margaret Care History</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
