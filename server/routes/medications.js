import express from 'express';
import { db } from '../db/database.js';
import { broadcastSystemEvent } from '../engines/schedulerEngine.js';
import { notificationService } from '../engines/notificationEngine.js';

const router = express.Router();

// GET /api/medications?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const meds = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND active_status = 1').all(patientId);
  res.json({ success: true, medications: meds });
});

// GET /api/medications/timeline?patientId=pat-1
router.get('/timeline', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const events = db.prepare(`
    SELECT me.*, m.name as medication_name, m.dosage, m.unit
    FROM medication_events me
    JOIN medications m ON me.medication_id = m.id
    WHERE me.patient_id = ?
    ORDER BY me.created_at DESC
    LIMIT 100
  `).all(patientId);
  res.json({ success: true, events });
});

// POST /api/medications
router.post('/', (req, res) => {
  const {
    patient_id = 'pat-1',
    name,
    dosage,
    unit = 'mg',
    instructions,
    scheduled_time,
    frequency = 'Daily',
    start_date = new Date().toISOString().split('T')[0],
    end_date = null,
    reminder1_interval = 0,
    reminder2_interval = 10,
    reminder3_interval = 10,
    escalation_delay = 5,
  } = req.body;

  if (!name || !scheduled_time) {
    return res.status(400).json({ success: false, error: 'Medication name and scheduled_time required' });
  }

  const id = 'med-' + Date.now();
  db.prepare(`
    INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, frequency, start_date, end_date, reminder1_interval, reminder2_interval, reminder3_interval, escalation_delay, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patient_id, name, dosage, unit, instructions, scheduled_time, frequency, start_date, end_date, reminder1_interval, reminder2_interval, reminder3_interval, escalation_delay, 'Pending');

  // Record timeline event
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tl-med-add-' + Date.now(), patient_id, timeStr, dateStr, 'Medication', 'Medication Scheduled', `New medication added: ${name} (${dosage}) at ${scheduled_time}`, 'Caregiver Admin', 'Pill');

  const newMed = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
  res.json({ success: true, medication: newMed });
});

// POST /api/medications/:id/confirm
router.post('/:id/confirm', (req, res) => {
  const { confirmation_method = 'UI', verified_by = 'Patient' } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id);
  if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });

  db.prepare('UPDATE medications SET status = "Verified", verified_at = ? WHERE id = ?').run(timeStr, med.id);

  // Mark latest medication_events row for this medication as COMPLETED
  const eventKey = `${med.patient_id}_${med.id}_${dateStr}_${med.scheduled_time}`;
  db.prepare(`
    UPDATE medication_events
    SET state = 'COMPLETED', completed_at = ?, final_status = 'COMPLETED', confirmation_method = ?, updated_at = CURRENT_TIMESTAMP
    WHERE event_key = ? OR (medication_id = ? AND scheduled_date = ?)
  `).run(timeStr, confirmation_method, eventKey, med.id, dateStr);

  // Stop active emergency escalation
  db.prepare('UPDATE emergency_escalations SET status = "ACKNOWLEDGED", stopped_at = CURRENT_TIMESTAMP WHERE patient_id = ? AND status = "ACTIVE"').run(med.patient_id);

  // Record timeline event
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tl-med-conf-' + Date.now(), med.patient_id, timeStr, dateStr, 'Medication', 'Medication Verified', `${med.name} (${med.dosage}) confirmed via ${confirmation_method}.`, verified_by, 'CheckCircle');

  broadcastSystemEvent('MEDICATION_VERIFIED', { medicationId: med.id, status: 'Verified' });

  res.json({ success: true, message: `Medication ${med.name} marked as Verified and reminders cancelled.` });
});

// POST /api/medications/:id/snooze
router.post('/:id/snooze', (req, res) => {
  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id);
  if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });

  db.prepare('UPDATE medications SET status = "Snoozed" WHERE id = ?').run(med.id);
  
  const dateStr = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE medication_events
    SET state = 'SNOOZE', confirmation_method = 'Snooze', updated_at = CURRENT_TIMESTAMP
    WHERE medication_id = ? AND scheduled_date = ?
  `).run(med.id, dateStr);

  res.json({ success: true, message: `Remind me later set for ${med.name}` });
});

// POST /api/medications/test-simulation (DEVELOPMENT/TEST MODE)
router.post('/test-simulation', async (req, res) => {
  const { patientId = 'pat-1', medicationName = 'Metformin 500mg' } = req.body;
  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  const evtId = 'med-evt-test-' + Date.now();
  const eventKey = `${patientId}_test_${dateStr}_${Date.now()}`;

  // Step 1: Create test event in db
  db.prepare(`
    INSERT INTO medication_events (id, medication_id, patient_id, scheduled_date, scheduled_time, event_key, scheduled_for, state, reminder_1_sent_at, final_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'REMINDER_1_SENT', ?, 'REMINDER_1_SENT')
  `).run(evtId, 'med-test', patientId, dateStr, timeNowStr, eventKey, timeNowStr, timeNowStr);

  broadcastSystemEvent('PROACTIVE_REMINDER', {
    patientId,
    stage: 1,
    message: `[DEVELOPMENT TEST MODE] Reminder #1: It is time for your ${medicationName}. Please take it now with water.`,
  });

  // Step 2: Reminder #2
  setTimeout(() => {
    db.prepare(`
      UPDATE medication_events
      SET state = 'REMINDER_2_SENT', reminder_2_sent_at = ?, final_status = 'REMINDER_2_SENT', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), evtId);

    broadcastSystemEvent('PROACTIVE_REMINDER', {
      patientId,
      stage: 2,
      message: `[DEVELOPMENT TEST MODE] Reminder #2: Gentle reminder for your ${medicationName}. Please take it when you can.`,
    });
  }, 3000);

  // Step 3: Reminder #3
  setTimeout(() => {
    db.prepare(`
      UPDATE medication_events
      SET state = 'REMINDER_3_SENT', reminder_3_sent_at = ?, final_status = 'REMINDER_3_SENT', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), evtId);

    broadcastSystemEvent('PROACTIVE_REMINDER', {
      patientId,
      stage: 3,
      message: `[DEVELOPMENT TEST MODE] Reminder #3: Urgent reminder for your ${medicationName}. Please confirm once taken.`,
    });
  }, 6000);

  // Step 4: Caregiver Escalation
  setTimeout(async () => {
    db.prepare(`
      UPDATE medication_events
      SET state = 'CAREGIVER_ESCALATION', escalated_at = ?, final_status = 'ESCALATED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), evtId);

    const notifResult = await notificationService.dispatchNotification({
      patientId,
      eventType: 'MEDICATION_TEST_ESCALATION',
      priority: 'IMPORTANT',
      message: `[DEVELOPMENT TEST MODE] Caregiver Escalation: 3 missed reminders for ${medicationName}.`,
    });

    broadcastSystemEvent('CAREGIVER_ALERT', {
      patientId,
      stage: 4,
      message: `[DEVELOPMENT TEST MODE] Caregiver Escalation Triggered! Provider status: ${notifResult.status}`,
    });
  }, 9000);

  res.json({
    success: true,
    message: 'DEVELOPMENT/TEST MODE: 3-Stage Reminder & Escalation simulation initiated.',
    eventId: evtId,
  });
});

// DELETE /api/medications/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Medication deleted' });
});

export default router;
