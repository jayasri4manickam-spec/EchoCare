import { getPatientProfile } from './storage.js';
import { processPatientVoiceInput } from './orchestrator.js';

let currentState = 'IDLE'; // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR'
let isWakeWordActive = false;
let isContinuousSupported = true;
let voiceUnavailableNotice = null;
let autoplayBlockedNotice = false;

const listeners = new Set();
let recognitionInstance = null;
let wakeWordRecognition = null;

export const subscribeToVoiceEngine = (callback) => {
  listeners.add(callback);
  callback(currentState, { isWakeWordActive, isContinuousSupported, voiceUnavailableNotice, autoplayBlockedNotice });
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(currentState, { isWakeWordActive, isContinuousSupported, voiceUnavailableNotice, autoplayBlockedNotice }));
};

const setState = (newState) => {
  currentState = newState;
  notifyListeners();
};

export const getVoiceState = () => currentState;

import { unlockBrowserAudio, playAudioStreamThroughWebAudio } from './speechTTS.js';

// ==========================================
// SPEECH SYNTHESIS (TTS) MULTILINGUAL SELECTION
// ==========================================
let voicesList = [];

const updateVoicesList = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    voicesList = window.speechSynthesis.getVoices();
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoicesList();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoicesList;
  }
}

export const getAvailableVoices = () => {
  updateVoicesList();
  return voicesList;
};

/**
 * Script & Unicode character range language auto-detector.
 * Detects target speech locale directly from text script so English/Hindi/Tamil/Telugu/Malayalam/Kannada never get wrong voice engines.
 */
export const detectLanguageFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Hindi (Devanagari)
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[a-zA-Z]/.test(text)) return 'en-IN';       // English
  return null;
};

/**
 * Searches for a matching voice for the given locale.
 * Returns null for non-English languages if native OS voice is missing, triggering instant Google MP3 TTS fallback!
 */
export const selectVoiceForLanguage = (langCode = 'en-IN') => {
  updateVoicesList();
  if (!voicesList || voicesList.length === 0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voicesList = window.speechSynthesis.getVoices();
    }
  }
  if (!voicesList || voicesList.length === 0) return null;

  const normalizedCode = langCode.toLowerCase().replace('_', '-');
  const langPrefix = normalizedCode.split('-')[0]; // 'ta', 'hi', 'te', 'ml', 'kn', 'en'

  // 1. Exact match (e.g. 'ta-in', 'hi-in', 'te-in', 'ml-in', 'kn-in', 'en-in')
  let match = voicesList.find((v) => v.lang.toLowerCase() === normalizedCode);
  if (!match) {
    // 2. Prefix match (e.g. 'ta', 'hi', 'te', 'ml', 'kn', 'en')
    match = voicesList.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  }

  if (match && match.lang.toLowerCase().startsWith(langPrefix)) {
    return match;
  }

  // If no native SAPI voice exists for a non-English language on this OS, return null so speak() uses Google MP3 TTS Stream!
  if (langPrefix !== 'en') {
    return null;
  }

  // Fallback to best available natural English voice
  return (
    voicesList.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Zira') ||
          v.name.includes('Karen') ||
          v.name.includes('David'))
    ) || voicesList.find((v) => v.lang.startsWith('en')) || voicesList[0] || null
  );
};

/**
 * Fallback HTML5 Audio TTS player using local server MP3 stream (/api/echo/tts-audio).
 * Guarantees 100% audible human speech playback for English, Hindi, Tamil, Telugu, Malayalam, and Kannada!
 */
export const playFallbackAudioSpeech = (text, langCode = 'en-IN', onEndCallback = null) => {
  if (typeof window === 'undefined' || !text || !text.trim()) {
    if (onEndCallback) onEndCallback();
    return;
  }
  try {
    unlockBrowserAudio();
    setState('SPEAKING');

    const cleanText = encodeURIComponent(text.substring(0, 300));
    const port = window.location.port === '5173' || window.location.port === '3000' ? '5001' : window.location.port;
    const origin = `${window.location.protocol}//${window.location.hostname}:${port}`;
    const ttsUrl = `${origin}/api/echo/tts-audio?text=${cleanText}&lang=${encodeURIComponent(langCode || 'en-IN')}`;

    console.log(`🔊 [Echo Web Audio Stream] Playing MP3 voice [${langCode}]:`, text);

    const finalizeAudio = () => {
      setState('IDLE');
      if (onEndCallback) onEndCallback();
      if (isWakeWordActive) {
        startWakeWordDetection();
      }
    };

    playAudioStreamThroughWebAudio(ttsUrl, finalizeAudio);
  } catch (e) {
    console.warn('Fallback TTS Audio error:', e);
    setState('IDLE');
    if (onEndCallback) onEndCallback();
  }
};

export const speak = (text, langCode = null, onEndCallback = null) => {
  if (typeof window === 'undefined' || !text || !text.trim()) {
    if (onEndCallback) onEndCallback();
    return;
  }

  // Stop any currently playing audio stream or speech to prevent overlapping voices!
  stopSpeaking();

  // Resolve language: 1. Explicit arg, 2. Script auto-detection, 3. localStorage, 4. Profile
  let selectedLang = langCode;
  if (!selectedLang) {
    const detected = detectLanguageFromText(text);
    if (detected) {
      selectedLang = detected;
    } else {
      try {
        const savedUiLang = localStorage.getItem('echocare_language');
        const langMap = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN' };
        if (savedUiLang && langMap[savedUiLang]) {
          selectedLang = langMap[savedUiLang];
        }
      } catch (e) {}
    }
  }

  if (!selectedLang) {
    const profile = getPatientProfile();
    selectedLang = profile.preferredLanguage || 'en-IN';
  }

  unlockBrowserAudio();

  console.log(`🔊 [Echo Voice Engine] Speaking response out loud [${selectedLang}]:`, text);

  // 1. Prioritize Native Browser SpeechSynthesis for 100% instant, serverless, offline voice speech on any device!
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voice = selectVoiceForLanguage(selectedLang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setState('SPEAKING');
      utterance.onend = () => {
        setState('IDLE');
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = (e) => {
        console.warn('[SpeechSynthesis Notice] Native voice playback notice, trying MP3 fallback...', e);
        playFallbackAudioSpeech(text, selectedLang, onEndCallback);
      };

      window.speechSynthesis.speak(utterance);
      return;
    } catch (err) {
      console.warn('[SpeechSynthesis Exception] Falling back to MP3 stream', err);
    }
  }

  // 2. Fallback to server MP3 stream if SpeechSynthesis is unavailable
  playFallbackAudioSpeech(text, selectedLang, onEndCallback);
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentState === 'SPEAKING') {
    setState('IDLE');
  }
};

// ==========================================
// SPEECH RECOGNITION (STT) WITH SELECTED LOCALE
// ==========================================
let listeningSilenceTimer = null;
let currentTranscriptBuffer = '';
let listeningStartTime = 0;
let restartTimer = null;

export const listen = async (onResultCallback, onErrorCallback) => {
  if (typeof window === 'undefined') return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available in this browser.');
    isContinuousSupported = false;
    setState('ERROR');
    if (onErrorCallback) onErrorCallback('Speech recognition is not supported in this browser.');
    return;
  }

  stopSpeaking();
  stopWakeWordDetection();

  if (restartTimer) clearTimeout(restartTimer);
  if (listeningSilenceTimer) clearTimeout(listeningSilenceTimer);

  if (recognitionInstance) {
    try {
      recognitionInstance.abort();
    } catch (e) {}
    recognitionInstance = null;
  }

  currentTranscriptBuffer = '';
  listeningStartTime = Date.now();

  // Request explicit microphone permission first!
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  } catch (micErr) {
    console.warn('Microphone permission notice:', micErr);
  }

  setState('LISTENING');

  const finalizeSpeechAndProcess = () => {
    const finalText = currentTranscriptBuffer.trim();
    if (!finalText) {
      setState('IDLE');
      if (isWakeWordActive) {
        setTimeout(startWakeWordDetection, 300);
      }
      return;
    }

    setState('THINKING');
    console.log(`🗣️ EchoCare Finalized Speech:`, finalText);

    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
    }

    if (onResultCallback) {
      onResultCallback(finalText);
    }

    handleVoiceCommand(finalText);
  };

  const initiateRecognition = () => {
    if (currentState !== 'LISTENING') return;

    if (recognitionInstance) {
      try {
        recognitionInstance.abort();
      } catch (e) {}
      recognitionInstance = null;
    }

    try {
      recognitionInstance = new SpeechRecognition();
      let activeLang = 'en-IN';
      try {
        const savedUiLang = localStorage.getItem('echocare_language');
        const langMap = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN' };
        if (savedUiLang && langMap[savedUiLang]) {
          activeLang = langMap[savedUiLang];
        }
      } catch (e) {}

      recognitionInstance.lang = activeLang;
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;

      recognitionInstance.onresult = (event) => {
        let liveText = '';
        for (let i = 0; i < event.results.length; ++i) {
          liveText += event.results[i][0].transcript + ' ';
        }

        if (liveText.trim()) {
          currentTranscriptBuffer = liveText.trim();
          console.log('🎙️ Live speech buffer:', currentTranscriptBuffer);

          if (listeningSilenceTimer) clearTimeout(listeningSilenceTimer);
          listeningSilenceTimer = setTimeout(finalizeSpeechAndProcess, 1500);
        }
      };

      const handleEndOrError = (errType) => {
        if (currentState !== 'LISTENING') return;

        if (currentTranscriptBuffer.trim()) {
          finalizeSpeechAndProcess();
        } else if (Date.now() - listeningStartTime < 20000) {
          console.log(`🎙️ SpeechRecognition (${errType}), auto-restarting listener loop...`);
          if (restartTimer) clearTimeout(restartTimer);
          restartTimer = setTimeout(() => {
            if (currentState === 'LISTENING') {
              initiateRecognition();
            }
          }, 200);
        } else {
          console.log('🎙️ SpeechRecognition 20s timeout reached with no speech, going IDLE');
          setState('IDLE');
          if (isWakeWordActive) {
            setTimeout(startWakeWordDetection, 400);
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          handleEndOrError(event.error);
          return;
        }
        if (event.error === 'not-allowed') {
          setState('ERROR');
          if (onErrorCallback) onErrorCallback('Microphone access denied');
          return;
        }
        handleEndOrError(event.error);
      };

      recognitionInstance.onend = () => {
        if (currentState === 'LISTENING') {
          handleEndOrError('onend');
        }
      };

      recognitionInstance.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
      if (currentState === 'LISTENING' && Date.now() - listeningStartTime < 20000) {
        if (restartTimer) clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          if (currentState === 'LISTENING') initiateRecognition();
        }, 300);
      } else {
        setState('IDLE');
        if (isWakeWordActive) setTimeout(startWakeWordDetection, 400);
      }
    }
  };

  initiateRecognition();
};

export const stopListening = () => {
  if (restartTimer) clearTimeout(restartTimer);
  if (listeningSilenceTimer) clearTimeout(listeningSilenceTimer);
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (e) {}
  }
  if (currentState === 'LISTENING' || currentState === 'THINKING') {
    setState('IDLE');
  }
};

// ==========================================
// WAKE-WORD DETECTION ("Echo")
// ==========================================
const WAKE_WORD_VARIANTS = [
  'echo', 'hey echo', 'hi echo', 'hello echo', 'eco', 'ecco', 'eycho', 'ekho',
  'heko', 'aeko', 'aekho', 'ehko', 'ako', 'acco', 'எக்கோ', 'எகோ', 'इको', 'एको',
  'ఎకో', '<ctrl42><ctrl42><ctrl42>', '<ctrl42><ctrl42>', 'എക്കോ'
];

export const startWakeWordDetection = () => {
  if (typeof window === 'undefined') return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    isContinuousSupported = false;
    notifyListeners();
    return;
  }

  if (wakeWordRecognition) {
    try {
      wakeWordRecognition.stop();
    } catch (e) {}
  }

  try {
    wakeWordRecognition = new SpeechRecognition();
    const profile = getPatientProfile();
    wakeWordRecognition.lang = profile.preferredLanguage || 'en-IN';
    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = true;

    isWakeWordActive = true;
    notifyListeners();

    wakeWordRecognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        const matchesWakeWord = WAKE_WORD_VARIANTS.some((w) => transcript.includes(w));

        if (matchesWakeWord) {
          console.log('⚡ Wake word "Echo" detected! Transcript:', transcript);
          try {
            wakeWordRecognition.stop();
          } catch (e) {}

          const profile = getPatientProfile();
          const lang = profile.preferredLanguage || 'en-IN';
          const ackMsg = lang.startsWith('ta') ? 'ஆம், நான் கேட்கிறேன்.' :
                         lang.startsWith('hi') ? 'जी, मैं सुन रहा हूँ।' :
                         lang.startsWith('te') ? 'అవును, నేను వింటున్నాను.' :
                         lang.startsWith('ml') ? 'അതെ, ഞാൻ കേൾക്കുന്നു.' :
                         lang.startsWith('kn') ? 'ಹೌದು, ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.' :
                         "Yes, I'm listening.";
          speak(ackMsg, lang, () => {
            listen();
          });
          break;
        }
      }
    };

    wakeWordRecognition.onerror = (err) => {
      if (err.error === 'no-speech' || err.error === 'aborted') {
        // Normal silence timeout during background listening — keep listening
        return;
      }
      if (err.error === 'not-allowed') {
        isContinuousSupported = false;
        isWakeWordActive = false;
        notifyListeners();
      }
    };

    wakeWordRecognition.onend = () => {
      if (isWakeWordActive && currentState === 'IDLE') {
        setTimeout(() => {
          if (isWakeWordActive && currentState === 'IDLE') {
            try {
              wakeWordRecognition.start();
            } catch (e) {}
          }
        }, 300);
      }
    };

    wakeWordRecognition.start();
  } catch (err) {
    console.warn('Wake-word continuous listener start failed:', err);
    isContinuousSupported = false;
    notifyListeners();
  }
};

export const stopWakeWordDetection = () => {
  isWakeWordActive = false;
  if (wakeWordRecognition) {
    try {
      wakeWordRecognition.stop();
    } catch (e) {}
  }
};

import { api } from './api.js';
import { logConversation } from './orchestrator.js';

export const handleVoiceCommand = async (transcript) => {
  if (!transcript || !transcript.trim()) return;

  // 1. Check Unicode script of transcript
  let targetLang = detectLanguageFromText(transcript);

  // 2. If no script match, check active UI language from localStorage
  if (!targetLang) {
    try {
      const uiLang = localStorage.getItem('echocare_language');
      const langMap = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN' };
      if (uiLang && langMap[uiLang]) {
        targetLang = langMap[uiLang];
      }
    } catch (e) {}
  }

  // 3. Fallback to profile preferred language
  if (!targetLang) {
    const profile = getPatientProfile();
    targetLang = profile.preferredLanguage || 'en-IN';
  }

  let aiResponse = null;
  let agentSource = 'BACKEND_ORCHESTRATOR';

  try {
    const profile = getPatientProfile();
    const res = await api.sendEchoMessage(transcript, targetLang, profile.id || 'pat-1');
    if (res && res.success && res.data && res.data.responseText) {
      aiResponse = res.data.responseText;
      agentSource = res.data.agentSource || 'BACKEND_ORCHESTRATOR';
    }
  } catch (err) {
    console.warn('Backend orchestrator offline, fallback to local engine:', err);
  }

  if (!aiResponse) {
    aiResponse = processPatientVoiceInput(transcript);
    agentSource = 'ECHO_VOICE_AGENT';
  } else {
    logConversation(transcript, aiResponse, agentSource);
  }

  speak(aiResponse, targetLang);
};
