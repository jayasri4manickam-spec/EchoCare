import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/handovers?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const handovers = db.prepare('SELECT * FROM handovers WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  res.json({ success: true, handovers });
});

// POST /api/handovers
router.post('/', (req, res) => {
  const { patient_id = 'pat-1', outgoing_caregiver = 'Sarah Jenkins, RN', raw_notes = '' } = req.body;

  const lower = raw_notes.toLowerCase();
  let appetite_summary = 'Meal intake normal.';
  if (lower.includes('eat') || lower.includes('dinner') || lower.includes('less')) appetite_summary = 'Dinner intake lower than usual.';

  let behaviour_summary = 'Restful and cooperative during shift.';
  if (lower.includes('restless') || lower.includes('agitated')) behaviour_summary = 'Restlessness observed around 8 PM.';

  let pattern_summary = 'Routine care followed smoothly.';
  let watch_summary = 'Monitor hydration and night rest.';

  const id = 'ho-' + Date.now();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO handovers (id, patient_id, outgoing_caregiver, raw_notes, appetite_summary, behaviour_summary, pattern_summary, watch_summary, routine_summary, status, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, outgoing_caregiver, raw_notes, appetite_summary, behaviour_summary, pattern_summary, watch_summary, 'All evening medications verified.', 'Confirmed', timeStr);

  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tl-ho-' + Date.now(), patient_id, timeStr, dateStr, 'Observation', 'Shift Handover Confirmed', `Handover from ${outgoing_caregiver}. Watch: ${watch_summary}`, 'Shift Handover Intelligence', 'FileText');

  const newHandover = db.prepare('SELECT * FROM handovers WHERE id = ?').get(id);
  res.json({ success: true, handover: newHandover });
});

export default router;
