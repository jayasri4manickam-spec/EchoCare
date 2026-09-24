import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/memories?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const memories = db.prepare('SELECT * FROM memories WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  res.json({ success: true, memories });
});

// POST /api/memories
router.post('/', (req, res) => {
  const { patient_id = 'pat-1', title, category = 'Family', year, story, people_involved, location } = req.body;

  if (!title || !story) {
    return res.status(400).json({ success: false, error: 'Title and story required' });
  }

  const id = 'mem-' + Date.now();
  db.prepare(`
    INSERT INTO memories (id, patient_id, title, category, year, story, people_involved, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, title, category, year, story, people_involved, location);

  // Record timeline event
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tl-mem-' + Date.now(), patient_id, timeStr, dateStr, 'Memory', 'Personal Memory Recorded', `Memory added: "${title}"`, 'Scrapbook', 'Sparkles');

  const newMem = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
  res.json({ success: true, memory: newMem });
});

// GET /api/memories/graph?patientId=pat-1
router.get('/graph', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  const family = db.prepare('SELECT * FROM family_members WHERE patient_id = ?').all(patientId);
  const memories = db.prepare('SELECT * FROM memories WHERE patient_id = ?').all(patientId);
  const preferences = db.prepare('SELECT * FROM patient_preferences WHERE patient_id = ?').get(patientId);
  const voiceMemories = db.prepare('SELECT * FROM voice_memories WHERE patient_id = ?').all(patientId);

  res.json({
    success: true,
    memoryGraph: {
      patient,
      familyMembers: family,
      personalMemories: memories,
      preferences,
      voiceMemories,
    },
  });
});

export default router;
