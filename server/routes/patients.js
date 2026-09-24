import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/patients/:id
router.get('/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const preferences = db.prepare('SELECT * FROM patient_preferences WHERE patient_id = ?').get(patient.id);
  const family = db.prepare('SELECT * FROM family_members WHERE patient_id = ?').all(patient.id);

  res.json({
    success: true,
    patient: {
      ...patient,
      preferences,
      family,
    },
  });
});

// PATCH /api/patients/:id
router.patch('/:id', (req, res) => {
  const { preferred_name, primary_language, stage_profile, medical_notes } = req.body;
  
  db.prepare(`
    UPDATE patients
    SET preferred_name = COALESCE(?, preferred_name),
        primary_language = COALESCE(?, primary_language),
        stage_profile = COALESCE(?, stage_profile),
        medical_notes = COALESCE(?, medical_notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(preferred_name, primary_language, stage_profile, medical_notes, req.params.id);

  const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  res.json({ success: true, patient: updated });
});

export default router;
