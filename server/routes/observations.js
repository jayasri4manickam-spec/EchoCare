import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/observations?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const obs = db.prepare('SELECT * FROM observations WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  res.json({ success: true, observations: obs });
});

// POST /api/observations (Draft & Confirmation flow)
router.post('/', (req, res) => {
  const { patient_id = 'pat-1', caregiver_name = 'Caregiver', raw_audio_text = '' } = req.body;

  if (!raw_audio_text) {
    return res.status(400).json({ success: false, error: 'raw_audio_text required' });
  }

  const lower = raw_audio_text.toLowerCase();

  let appetite = 'Normal';
  if (lower.includes('eat') || lower.includes('food') || lower.includes('dinner') || lower.includes('refused')) {
    if (lower.includes('little') || lower.includes('less') || lower.includes('refused') || lower.includes('poor')) {
      appetite = 'Reduced (Dinner intake lower than usual)';
    } else {
      appetite = 'Good (Finished full meal)';
    }
  }

  let energy = 'Normal';
  if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('sleepy') || lower.includes('exhausted')) {
    energy = 'Lower than usual (More tired than usual)';
  } else if (lower.includes('active') || lower.includes('energetic')) {
    energy = 'Energetic & Alert';
  }

  let mobility = 'Independent';
  if (lower.includes('chair') || lower.includes('walk') || lower.includes('assistance') || lower.includes('help')) {
    mobility = 'Increased assistance required';
  }

  let sleepBehavior = 'Restful';
  if (lower.includes('restless') || lower.includes('agitated') || lower.includes('night')) {
    sleepBehavior = 'Restless / Evening agitation observed';
  }

  const draftObservation = {
    id: 'obs-draft-' + Date.now(),
    patient_id,
    caregiver_name,
    raw_audio_text,
    structured: {
      appetite,
      energy,
      mobility,
      sleepBehavior,
    },
    status: 'Draft',
  };

  res.json({ success: true, draftObservation });
});

// POST /api/observations/confirm
router.post('/confirm', (req, res) => {
  const { patient_id = 'pat-1', caregiver_name, raw_audio_text, appetite, energy, mobility, sleep_behavior } = req.body;

  const id = 'obs-' + Date.now();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO observations (id, patient_id, caregiver_name, raw_audio_text, appetite, energy, mobility, sleep_behavior, status, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, caregiver_name || 'Caregiver', raw_audio_text, appetite, energy, mobility, sleep_behavior, 'Confirmed', timeStr);

  // Add to longitudinal care timeline
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'tl-obs-' + Date.now(),
    patient_id,
    timeStr,
    dateStr,
    'Observation',
    'Caregiver Observation Captured',
    `Appetite: ${appetite} | Energy: ${energy} | Mobility: ${mobility}`,
    caregiver_name || 'Caregiver Voice Capture',
    'Mic'
  );

  const confirmedObs = db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
  res.json({ success: true, observation: confirmedObs });
});

export default router;
