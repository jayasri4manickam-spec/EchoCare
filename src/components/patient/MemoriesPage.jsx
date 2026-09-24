import React, { useState, useEffect } from 'react';
import { Heart, Volume2, Clock, Camera, Play, Square, BookOpen, MessageCircle } from 'lucide-react';
import { getCaregivers, getMemories, subscribeToStorage } from '../../services/storage';
import { speak, stopSpeaking } from '../../services/voiceEngine';
import { useLanguage } from '../../data/LanguageContext';

export const MemoriesPage = ({ onOpenVisitorScanner }) => {
  const [caregivers, setCaregivers] = useState(getCaregivers());
  const [memories, setMemories] = useState(getMemories());
  const [playingStoryId, setPlayingStoryId] = useState(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setCaregivers(getCaregivers());
      setMemories(getMemories());
    });
    return unsub;
  }, []);

  const getLocalizedStory = (story) => {
    if (story.id === 'mem-1') {
      return {
        title: t('memCapeMayTitle') || story.title,
        story: t('memCapeMayStory') || story.story,
      };
    }
    if (story.id === 'mem-2') {
      return {
        title: t('memSourdoughTitle') || story.title,
        story: t('memSourdoughStory') || story.story,
      };
    }
    return { title: story.title, story: story.story };
  };

  const handleSpeakWhisper = (person) => {
    const text = `This is ${person.name}, your ${person.relation}. ${person.memoryNote || ''}`;
    speak(text, language);
  };

  const handlePlayStory = (story) => {
    if (playingStoryId === story.id) {
      stopSpeaking();
      setPlayingStoryId(null);
      return;
    }
    const loc = getLocalizedStory(story);
    setPlayingStoryId(story.id);
    speak(`${loc.title}. ${loc.story}`, language, () => {
      setPlayingStoryId(null);
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#F0F6F2] p-4 sm:p-6 lg:p-10 xl:p-12 pb-28 space-y-8">
      {/* Title & Personal Scrapbook Banner */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-[#047857] uppercase tracking-widest block">
          ● {t('personalScrapbook')}
        </span>
        <h2 className="text-3xl sm:text-5xl font-black font-serif-heading text-[#064E3B] tracking-tight">
          {t('memoriesAndPeople')}
        </h2>
        <p className="text-base sm:text-lg font-medium text-slate-600">
          {t('memoriesSub')}
        </p>
      </div>

      {/* SECTION 1: FAMILIAR FACES */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1EFE7] pb-3">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-serif-heading text-[#064E3B] flex items-center gap-2">
              <Heart className="w-7 h-7 text-[#047857] fill-current" />
              {t('familiarFaces')}
            </h3>
            <p className="text-xs font-semibold text-slate-500">{t('peopleIKnow')}</p>
          </div>

          <button
            onClick={onOpenVisitorScanner}
            className="px-5 py-2.5 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] font-extrabold text-sm rounded-full border border-[#C6E7D2] flex items-center gap-2 shadow-sm transition-all"
          >
            <Camera className="w-4 h-4 text-[#047857]" />
            {t('whoIsHere')}
          </button>
        </div>

        {/* Caregiver Memory Cards Grid (4 columns on desktop) */}
        {caregivers.length === 0 ? (
          <div className="stitch-card p-8 bg-white border border-[#C6E7D2] text-center space-y-3">
            <Heart className="w-12 h-12 mx-auto text-[#047857]" />
            <h4 className="text-xl font-bold font-serif-heading text-[#064E3B]">No Faces Registered Yet</h4>
            <p className="text-sm font-medium text-slate-600">
              Caregivers can add familiar photos and memory notes in Caregiver Settings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {caregivers.map((person) => (
              <div key={person.id} className="stitch-card p-5 bg-white space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={person.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'}
                      alt={person.name}
                      className="w-full h-48 sm:h-52 rounded-2xl object-cover border border-[#C6E7D2]"
                    />
                    <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md text-[#047857] font-bold text-xs rounded-full border border-[#C6E7D2]">
                      ● {person.relation}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-2xl font-bold font-serif-heading text-[#064E3B]">{person.name}</h4>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-[#047857]" />
                      {t('lastVisit')}: {person.lastVisited || 'Recently'}
                    </p>

                    {person.memoryNote && (
                      <p className="text-xs font-serif-heading italic text-[#064E3B] bg-[#E6F4EA]/60 p-3 rounded-xl border border-[#C6E7D2] mt-3">
                        "{person.memoryNote}"
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSpeakWhisper(person)}
                  className="w-full py-2.5 bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] font-bold text-sm rounded-full border border-[#C6E7D2] flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Volume2 className="w-4 h-4 text-[#047857]" />
                  {t('hearVoice')} ({person.name.split(' ')[0]})
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: CHERISHED STORIES & MOMENTS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-[#E1EFE7] pb-3">
          <h3 className="text-2xl sm:text-3xl font-black font-serif-heading text-[#064E3B] flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#047857]" />
            {t('cherishedStories')}
          </h3>
          <span className="text-xs font-bold text-slate-500">{t('momentsIRemember')}</span>
        </div>

        {/* Desktop 3-column grid for Stories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map((story) => {
            const localized = getLocalizedStory(story);
            return (
              <div key={story.id} className="stitch-card p-6 bg-white space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={story.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'}
                      alt={localized.title}
                      className="w-full h-56 rounded-2xl object-cover border border-[#C6E7D2]"
                    />
                    <span className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 text-white font-mono text-xs rounded-lg backdrop-blur-md">
                      {story.dateLabel || 'Memory'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-2xl font-bold font-serif-heading text-[#064E3B]">
                      {localized.title}
                    </h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed mt-1">
                      {localized.story}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => handlePlayStory(story)}
                    className={`w-full py-3 font-bold text-sm rounded-full border flex items-center justify-center gap-2 transition-all ${
                      playingStoryId === story.id
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                        : 'bg-[#E6F4EA] hover:bg-[#D1EAD8] text-[#047857] border-[#C6E7D2]'
                    }`}
                  >
                    {playingStoryId === story.id ? (
                      <>
                        <Square className="w-4 h-4 fill-current text-red-600" />
                        Stop Memory
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        {t('listenToMemory')} ({story.audioDuration || '1 min'})
                      </>
                    )}
                  </button>

                  {story.recordedWith && (
                    <span className="px-3.5 py-2 bg-[#E6F4EA]/60 text-[#047857] font-bold text-xs rounded-full border border-[#C6E7D2] flex items-center justify-center gap-1.5 text-center">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {t('recordedWith')} {story.recordedWith}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


