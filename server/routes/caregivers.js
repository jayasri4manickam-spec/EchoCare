import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/caregivers?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const caregivers = db.prepare('SELECT * FROM caregivers WHERE patient_id = ?').all(patientId);

  // Attach permissions to each caregiver
  const result = caregivers.map(c => {
    const perms = db.prepare('SELECT * FROM permissions WHERE caregiver_id = ?').get(c.id) || {
      view_memories: 1,
      view_medications: 1,
      add_observations: 1,
      view_timeline: 1,
      manage_contacts: c.role === 'primary' ? 1 : 0,
      receive_alerts: c.receive_emergency_alerts,
      manage_medication: c.role === 'primary' ? 1 : 0,
    };
    return { ...c, permissions: perms };
  });

  res.json({ success: true, caregivers: result });
});

// POST /api/caregivers
router.post('/', (req, res) => {
  const { patient_id = 'pat-1', name, relation, phone_number, email, role = 'family', receive_emergency_alerts = 1 } = req.body;

  if (!name || !phone_number) {
    return res.status(400).json({ success: false, error: 'Caregiver name and phone_number required' });
  }

  const id = 'cg-' + Date.now();
  db.prepare(`
    INSERT INTO caregivers (id, patient_id, name, relation, phone_number, email, role, receive_emergency_alerts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, name, relation, phone_number, email, role, receive_emergency_alerts);

  db.prepare(`
    INSERT INTO permissions (id, caregiver_id, view_memories, view_medications, add_observations, view_timeline, manage_contacts, receive_alerts, manage_medication)
    VALUES (?, ?, 1, 1, 1, 1, ?, ?, ?)
  `).run('perm-' + Date.now(), id, role === 'primary' ? 1 : 0, receive_emergency_alerts, role === 'primary' ? 1 : 0);

  const newCaregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(id);
  res.json({ success: true, caregiver: newCaregiver });
});

// POST /api/caregivers/register-device
router.post('/register-device', (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const token = req.body.token || req.body.fcmToken;
  const caregiverId = req.body.caregiverId || req.body.caregiver_id || 'cg-1';
  const platform = req.body.platform || req.body.deviceInfo || 'web';

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'FCM registration token is required',
    });
  }

  const caregiver =
    db.prepare('SELECT * FROM caregivers WHERE id = ?').get(caregiverId) ||
    db.prepare('SELECT * FROM caregivers WHERE role = "primary" LIMIT 1').get() ||
    db.prepare('SELECT * FROM caregivers LIMIT 1').get();

  if (!caregiver) {
    return res.status(404).json({
      success: false,
      error: 'Caregiver profile not found',
      caregiverId,
    });
  }

  // Idempotent Check: If token is already active for this caregiver, return success immediately
  if (caregiver.fcm_token === token && caregiver.push_enabled === 1) {
    return res.json({
      success: true,
      message: 'Device registered successfully',
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      token,
      platform,
      alreadyRegistered: true,
    });
  }

  db.prepare(`
    UPDATE caregivers
    SET fcm_token = ?, push_enabled = 1
    WHERE id = ?
  `).run(token, caregiver.id);

  // Log timeline audit entry
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'tl-fcm-' + Date.now(),
    caregiver.patient_id,
    timeStr,
    dateStr,
    'Safety',
    'Caregiver Push Notification Enabled',
    `Caregiver ${caregiver.name} registered browser device for FCM push alerts (${platform}).`,
    'Caregiver Action',
    'Bell'
  );

  return res.json({
    success: true,
    message: 'Device registered successfully',
    caregiverId: caregiver.id,
    caregiverName: caregiver.name,
    token,
    platform,
  });
});

export default router;
