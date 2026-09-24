import express from 'express';
import { processEchoMessage } from '../engines/orchestratorEngine.js';

const router = express.Router();

// POST /api/echo/message
router.post('/message', (req, res) => {
  const { patientId = 'pat-1', text = '', language = 'en-IN' } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Input message text required' });
  }

  const result = processEchoMessage({ patientId, text, language });
  res.json({
    success: true,
    data: result,
  });
});

// POST /api/echo/voice (simulated or audio stream response)
router.post('/voice', (req, res) => {
  const { patientId = 'pat-1', text = '', language = 'en-IN' } = req.body;
  const result = processEchoMessage({ patientId, text, language });

  res.json({
    success: true,
    data: {
      ...result,
      audioUrl: `/api/echo/tts-audio?text=${encodeURIComponent(result.responseText)}&lang=${language}`,
    },
  });
});

function generateChimeWavBuffer() {
  // Generates a 0.5s 44.1kHz 16-bit mono WAV buffer (523Hz -> 659Hz chime)
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * 0.5);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = t < 0.25 ? 523.25 : 659.25;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * (1 - t / 0.5);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  return buffer;
}

// GET /api/echo/tts-audio?text=...&lang=...
router.get('/tts-audio', async (req, res) => {
  const { text = '', lang = 'en-IN' } = req.query;

  if (!text || !text.trim()) {
    return res.status(400).send('Text parameter required');
  }

  const langPrefix = (lang || 'en').split('-')[0].toLowerCase();
  const cleanText = encodeURIComponent(text.substring(0, 300));
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${cleanText}&tl=${langPrefix}`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    console.warn('Backend TTS fetch error:', err);
  }

  // Fallback to generated audio chime buffer so browser audio.play() NEVER gets a 500 error!
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(generateChimeWavBuffer());
});

export default router;
