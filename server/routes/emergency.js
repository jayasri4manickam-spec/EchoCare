import express from 'express';
import { db } from '../db/database.js';
import { broadcastSystemEvent } from '../engines/schedulerEngine.js';
import { notificationService } from '../engines/notificationEngine.js';

const router = express.Router();

// GET /api/patients/:id/emergency
router.get('/patients/:id/emergency', (req, res) => {
  const patientId = req.params.id || 'pat-1';
  const latestEvent = db
    .prepare('SELECT * FROM emergency_events WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(patientId);

  res.json({
    success: true,
    emergency: latestEvent || {
      id: null,
      patient_id: patientId,
      status: 'INACTIVE',
      triggered_by: null,
      reason: null,
    },
  });
});

// POST /api/patients/:id/emergency/trigger
router.post('/patients/:id/emergency/trigger', (req, res) => {
  const patientId = req.params.id || 'pat-1';
  const { triggeredBy = 'PATIENT', reason = 'Explicit patient emergency button press' } = req.body;
  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  const evtId = 'emg-' + Date.now();
  db.prepare(`
    INSERT INTO emergency_events (id, patient_id, triggered_by, reason, status, triggered_at)
    VALUES (?, ?, ?, ?, 'TRIGGERED', CURRENT_TIMESTAMP)
  `).run(evtId, patientId, triggeredBy, reason);

  // Record timeline event
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, 'Safety', 'EMERGENCY_TRIGGERED', ?, ?, 'ShieldAlert')
  `).run('tl-emg-' + Date.now(), patientId, timeNowStr, dateStr, reason, triggeredBy);

  // Dispatch In-App Caregiver Notification
  const primaryCaregiver = db.prepare("SELECT * FROM caregivers WHERE patient_id = ? AND role = 'primary'").get(patientId);
  notificationService.dispatchNotification({
    patientId,
    caregiverId: primaryCaregiver ? primaryCaregiver.id : null,
    eventType: 'SAFETY_ALERT',
    priority: 'CRITICAL',
    message: `EMERGENCY ALERT: ${reason} triggered by ${triggeredBy}. Immediate assistance requested.`,
  });

  broadcastSystemEvent('EMERGENCY_TRIGGERED', {
    eventId: evtId,
    patientId,
    triggeredBy,
    reason,
    status: 'TRIGGERED',
  });

  const event = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(evtId);
  res.json({ success: true, emergency: event });
});

// POST /api/emergency/:id/acknowledge
router.post('/emergency/:id/acknowledge', (req, res) => {
  const eventId = req.params.id;
  const { acknowledgedBy = 'Primary Caregiver' } = req.body;

  db.prepare(`
    UPDATE emergency_events
    SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(eventId);

  const event = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(eventId);
  if (event) {
    const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
      VALUES (?, ?, ?, ?, 'Safety', 'EMERGENCY_ACKNOWLEDGED', ?, ?, 'CheckCircle')
    `).run('tl-emg-ack-' + Date.now(), event.patient_id, timeNowStr, dateStr, `Emergency acknowledged by ${acknowledgedBy}`, acknowledgedBy);

    broadcastSystemEvent('EMERGENCY_ACKNOWLEDGED', { eventId, status: 'ACKNOWLEDGED' });
  }

  res.json({ success: true, emergency: event });
});

// POST /api/emergency/:id/resolve
router.post('/emergency/:id/resolve', (req, res) => {
  const eventId = req.params.id;
  const { resolvedBy = 'Primary Caregiver' } = req.body;

  db.prepare(`
    UPDATE emergency_events
    SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
    WHERE id = ?
  `).run(resolvedBy, eventId);

  const event = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(eventId);
  if (event) {
    const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
      VALUES (?, ?, ?, ?, 'Safety', 'EMERGENCY_RESOLVED', ?, ?, 'CheckCircle')
    `).run('tl-emg-res-' + Date.now(), event.patient_id, timeNowStr, dateStr, `Emergency resolved by ${resolvedBy}`, resolvedBy);

    broadcastSystemEvent('EMERGENCY_RESOLVED', { eventId, status: 'RESOLVED' });
  }

  res.json({ success: true, emergency: event });
});

export default router;
