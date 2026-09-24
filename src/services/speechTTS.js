// Web Speech API & Web Audio API synthesis service for EchoCare

let lastSpokenText = '';
let lastSpokenTime = 0;
const DEBOUNCE_COOLDOWN_MS = 25000; // Don't repeat identical face whisper within 25 seconds

let cachedVoices = [];
const refreshVoices = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

let globalAudioCtx = null;
let activeAudioSourceNode = null;
let activeAudioElement = null;

export const stopAudioStream = () => {
  if (activeAudioSourceNode) {
    try {
      activeAudioSourceNode.onended = null;
      activeAudioSourceNode.stop();
    } catch (e) {}
    activeAudioSourceNode = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
    } catch (e) {}
    activeAudioElement = null;
  }
};

export const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
};

/**
 * Universal browser audio unlocker function.
 * Must be triggered on user interaction or explicit button click.
 * Plays a tiny pleasant chime to force Web Audio sound card hardware output activation.
 */
export const unlockBrowserAudio = () => {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      refreshVoices();
    }
    const ctx = getSharedAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a soft pleasant tone (C5 -> E5) to wake up sound card hardware
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime); // Soft volume
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    console.warn('Audio unlock warning:', e);
  }
};

/**
 * Decodes and plays MP3 audio streams directly through Web Audio API AudioContext.
 * Completely bypasses Chrome/Edge HTML5 <audio> autoplay restrictions for 100% audible sound!
 */
export const playAudioStreamThroughWebAudio = async (url, onEndCallback = null) => {
  stopAudioStream();
  try {
    unlockBrowserAudio();
    const ctx = getSharedAudioContext();

    if (!ctx) {
      const audio = new Audio(url);
      activeAudioElement = audio;
      audio.volume = 1.0;
      audio.onended = () => {
        activeAudioElement = null;
        if (onEndCallback) onEndCallback();
      };
      audio.onerror = () => {
        activeAudioElement = null;
        if (onEndCallback) onEndCallback();
      };
      await audio.play();
      return;
    }

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP fetch error ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    activeAudioSourceNode = source;

    source.onended = () => {
      if (activeAudioSourceNode === source) {
        activeAudioSourceNode = null;
      }
      if (onEndCallback) onEndCallback();
    };

    source.start(0);
    return source;
  } catch (err) {
    console.warn('Web Audio stream decoding failed, falling back to Audio element:', err);
    try {
      const audio = new Audio(url);
      activeAudioElement = audio;
      audio.volume = 1.0;
      audio.onended = () => {
        activeAudioElement = null;
        if (onEndCallback) onEndCallback();
      };
      audio.onerror = () => {
        activeAudioElement = null;
        if (onEndCallback) onEndCallback();
      };
      audio.play().catch((e) => {
        console.warn('DOM Audio fallback rejected:', e);
        activeAudioElement = null;
        if (onEndCallback) onEndCallback();
      });
    } catch (e) {
      activeAudioElement = null;
      if (onEndCallback) onEndCallback();
    }
  }
};

// Find a calm, natural English voice if available
export const getPreferredVoice = () => {
  if (!('speechSynthesis' in window)) return null;
  refreshVoices();
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer natural female/calm English voices (Google US English, Samantha, Karen, Natural, etc.)
  const calmVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google US English') ||
        v.name.includes('Victoria') ||
        v.name.includes('Zira'))
  );
  return calmVoice || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
};

export const speakWhisper = (text, force = false) => {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported on this browser.');
    return;
  }

  unlockBrowserAudio();

  const now = Date.now();
  if (!force && text === lastSpokenText && now - lastSpokenTime < DEBOUNCE_COOLDOWN_MS) {
    // Suppress duplicate speech trigger
    return;
  }

  lastSpokenText = text;
  lastSpokenTime = now;

  // Cancel any ongoing speech
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;  // Slightly slower rate for senior clarity
  utterance.pitch = 1.0; // Warm natural pitch
  utterance.volume = 1.0;

  const voice = getPreferredVoice();
  if (voice) {
    utterance.voice = voice;
  }

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Whisper TTS error:', err);
  }
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  stopAudioStream();
  stopMelody();
};

// Web Audio API Audio Chimes for tactile feedback
export const playChime = (type = 'success') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // Pleasant dual tone chime (C5 -> G5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    } else if (type === 'warning') {
      // Low double beep
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(329.63, now); // E4
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'sos_tick') {
      // SOS Beep pulse
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (err) {
    console.warn('Audio Context failed', err);
  }
};

let activeMelodyOscillators = [];

export const stopMelody = () => {
  if (activeMelodyOscillators.length > 0) {
    activeMelodyOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    activeMelodyOscillators = [];
  }
};

/**
 * Plays a beautiful, calming, soothing 4-bar instrumental melody using Web Audio API synthesis.
 * Can be stopped anytime by calling stopMelody().
 */
export const playRelaxingMelody = (onEndCallback = null) => {
  stopMelody();
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) {
      if (onEndCallback) onEndCallback();
      return;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Soothing pentatonic notes: C4 (261.63), E4 (329.63), G4 (392.00), B4 (493.88), C5 (523.25), E5 (659.25)
    const notes = [
      { f: 261.63, d: 0.5, t: 0.0 }, // C4
      { f: 329.63, d: 0.5, t: 0.4 }, // E4
      { f: 392.00, d: 0.6, t: 0.8 }, // G4
      { f: 523.25, d: 0.8, t: 1.2 }, // C5
      { f: 493.88, d: 0.5, t: 1.8 }, // B4
      { f: 392.00, d: 0.5, t: 2.2 }, // G4
      { f: 329.63, d: 0.7, t: 2.6 }, // E4
      { f: 261.63, d: 1.2, t: 3.2 }, // C4
    ];

    notes.forEach((n) => {
      const now = ctx.currentTime + n.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + n.d);

      activeMelodyOscillators.push(osc);
    });

    if (onEndCallback) {
      setTimeout(() => {
        activeMelodyOscillators = [];
        onEndCallback();
      }, 4400);
    }
  } catch (err) {
    console.warn('Melody playback error:', err);
    if (onEndCallback) onEndCallback();
  }
};
