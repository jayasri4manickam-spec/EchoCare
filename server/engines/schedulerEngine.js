import { db } from '../db/database.js';
import { notificationService } from './notificationEngine.js';

let schedulerInterval = null;
const alarmStagesMap = new Map(); // `${medId}_${dateStr}` -> { stage: 1..4, lastAlertTime: timestamp }

/**
 * Parses time string like "08:00 AM" into hour & minute integers
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const cleanStr = String(timeStr).replace(/[\u202F\u00A0]/g, ' ').trim();
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  const h24Match = cleanStr.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
}

export function evaluateMedicationSchedules() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeNowStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  // Fetch all active patients
  const patients = db.prepare('SELECT * FROM patients').all();

  for (const patient of patients) {
    const pendingMeds = db.prepare("SELECT * FROM medications WHERE patient_id = ? AND active_status = 1 AND status IN ('Pending', 'Scheduled')").all(patient.id);

    for (const med of pendingMeds) {
      const timeObj = parseTimeString(med.scheduled_time);
      if (!timeObj) continue;

      const medTotalMinutes = timeObj.hours * 60 + timeObj.minutes;
      const diffMinutes = currentTotalMinutes - medTotalMinutes;
      const eventKey = `${patient.id}_${med.id}_${dateStr}_${med.scheduled_time}`;

      // Fetch or initialize persistent occurrence record in medication_events table
      let event = db.prepare('SELECT * FROM medication_events WHERE event_key = ?').get(eventKey);

      if (!event) {
        const evtId = 'med-evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        db.prepare(`
          INSERT INTO medication_events (id, medication_id, patient_id, scheduled_date, scheduled_time, event_key, scheduled_for, state, final_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', 'SCHEDULED')
        `).run(evtId, med.id, patient.id, dateStr, med.scheduled_time, eventKey, med.scheduled_time);
        event = db.prepare('SELECT * FROM medication_events WHERE event_key = ?').get(eventKey);
      }

      // If already completed or declined, stop processing future reminders for this occurrence
      if (event.state === 'COMPLETED' || event.state === 'DECLINED' || event.final_status === 'COMPLETED') {
        continue;
      }

      const rem1Interval = med.reminder1_interval || 0;
      const rem2Interval = rem1Interval + (med.reminder2_interval || 10);
      const rem3Interval = rem2Interval + (med.reminder3_interval || 10);
      const escDelay = rem3Interval + (med.escalation_delay || 5);

      // STAGE 1: REMINDER #1 (Exact time to T+rem2)
      if (diffMinutes >= rem1Interval && diffMinutes < rem2Interval && event.state === 'SCHEDULED') {
        db.prepare(`
          UPDATE medication_events
          SET state = 'REMINDER_1_SENT', reminder_1_sent_at = ?, final_status = 'REMINDER_1_SENT', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(timeNowStr, event.id);

        broadcastSystemEvent('PROACTIVE_REMINDER', {
          patientId: patient.id,
          medicationId: med.id,
          eventId: event.id,
          stage: 1,
          message: `${patient.preferred_name || 'Margaret'}, it is time for your ${med.name}, ${med.dosage}. ${med.instructions || 'Please take it with water.'}`,
        });

        console.log(`⏰ [Scheduler] Stage 1 Reminder sent for ${med.name} (${eventKey})`);
      }

      // STAGE 2: REMINDER #2 (T+rem2 to T+rem3)
      else if (diffMinutes >= rem2Interval && diffMinutes < rem3Interval && event.state === 'REMINDER_1_SENT') {
        db.prepare(`
          UPDATE medication_events
          SET state = 'REMINDER_2_SENT', reminder_2_sent_at = ?, final_status = 'REMINDER_2_SENT', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(timeNowStr, event.id);

        broadcastSystemEvent('PROACTIVE_REMINDER', {
          patientId: patient.id,
          medicationId: med.id,
          eventId: event.id,
          stage: 2,
          message: `I wanted to remind you about your ${med.name}, ${med.dosage}. Please take it when you can.`,
        });

        console.log(`⏰ [Scheduler] Stage 2 Reminder (+10m) sent for ${med.name}`);
      }

      // STAGE 3: REMINDER #3 (T+rem3 to T+escDelay)
      else if (diffMinutes >= rem3Interval && diffMinutes < escDelay && event.state === 'REMINDER_2_SENT') {
        db.prepare(`
          UPDATE medication_events
          SET state = 'REMINDER_3_SENT', reminder_3_sent_at = ?, final_status = 'REMINDER_3_SENT', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(timeNowStr, event.id);

        broadcastSystemEvent('PROACTIVE_REMINDER', {
          patientId: patient.id,
          medicationId: med.id,
          eventId: event.id,
          stage: 3,
          message: `I've reminded you a few times about your ${med.name}. Please confirm once you have taken it.`,
        });

        console.log(`⏰ [Scheduler] Stage 3 Reminder (+20m) sent for ${med.name}`);
      }

      // STAGE 4: CAREGIVER ESCALATION (T >= escDelay)
      else if (diffMinutes >= escDelay && event.state === 'REMINDER_3_SENT') {
        db.prepare(`
          UPDATE medication_events
          SET state = 'CAREGIVER_ESCALATION', escalated_at = ?, final_status = 'ESCALATED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(timeNowStr, event.id);

        const primaryCaregiver = db.prepare("SELECT * FROM caregivers WHERE patient_id = ? AND role = 'primary'").get(patient.id);

        db.prepare(`
          INSERT INTO emergency_escalations (id, patient_id, trigger_event, current_step, status, primary_notified_at)
          VALUES (?, ?, ?, 1, 'ACTIVE', CURRENT_TIMESTAMP)
        `).run('esc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), patient.id, `3 Missed Reminders: ${med.name} (${med.scheduled_time})`);

        notificationService.dispatchNotification({
          patientId: patient.id,
          caregiverId: primaryCaregiver ? primaryCaregiver.id : null,
          eventType: 'MEDICATION_OVERDUE',
          priority: 'IMPORTANT',
          message: `EchoCare Alert: Scheduled medication ${med.name} (${med.dosage}) missed 3 voice reminders for ${patient.full_name}. Caregiver attention required.`,
        });

        broadcastSystemEvent('CAREGIVER_ALERT', {
          patientId: patient.id,
          medicationId: med.id,
          eventId: event.id,
          stage: 4,
          message: `Medication ${med.name} escalated after 3 unacknowledged reminders. Caregiver notification logged.`,
        });

        console.log(`🚨 [Scheduler] Stage 4 Caregiver Escalation dispatched for ${med.name}`);
      }
    }
  }
}

// System Event Bus Subscribers (Server-Sent Events)
const eventSubscribers = new Set();

export function subscribeToSystemEvents(res) {
  eventSubscribers.add(res);
  return () => eventSubscribers.delete(res);
}

export function broadcastSystemEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const res of eventSubscribers) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      eventSubscribers.delete(res);
    }
  }
}

export function startScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  evaluateMedicationSchedules();
  schedulerInterval = setInterval(() => {
    evaluateMedicationSchedules();
  }, 10000); // 10 seconds check
  console.log('⏰ [Scheduler Engine] Persistent background medication ticker active.');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
