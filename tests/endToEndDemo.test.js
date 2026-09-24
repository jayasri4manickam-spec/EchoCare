import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase } from '../server/db/database.js';
import { processEchoMessage } from '../server/engines/orchestratorEngine.js';
import { notificationService } from '../server/engines/notificationEngine.js';

test('End-to-End 28-Step Demonstration Test Flow', async (t) => {
  initDatabase();

  await t.test('Complete 28-Step Verification Cycle', async () => {
    // 1. Create patient
    const patId = 'pat-e2e-' + Date.now();
    db.prepare(`
      INSERT INTO patients (id, full_name, preferred_name, primary_language)
      VALUES (?, ?, ?, ?)
    `).run(patId, 'Eleanor Vance', 'Eleanor', 'en-IN');
    assert.ok(db.prepare('SELECT * FROM patients WHERE id = ?').get(patId));

    // 2. Create caregiver
    const cgId = 'cg-e2e-' + Date.now();
    db.prepare(`
      INSERT INTO caregivers (id, patient_id, name, relation, phone_number, role, receive_emergency_alerts)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(cgId, patId, 'Priya Sharma', 'Daughter', '+919876543210', 'primary');

    // 3. Add family member
    db.prepare(`
      INSERT INTO family_members (id, patient_id, name, relationship, memory_note)
      VALUES (?, ?, ?, ?, ?)
    `).run('fm-e2e-' + Date.now(), patId, 'Priya', 'Daughter', 'Brings fresh chamomile tea on Sundays.');

    // 4. Add memory
    db.prepare(`
      INSERT INTO memories (id, patient_id, title, category, story)
      VALUES (?, ?, ?, ?, ?)
    `).run('mem-e2e-' + Date.now(), patId, 'Rose Garden Strolls', 'Hobbies', 'You love growing heirloom rose bushes in the backyard garden.');

    // 5-6. Add & Configure 8 PM medication
    const medId = 'med-e2e-' + Date.now();
    db.prepare(`
      INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(medId, patId, 'Metformin', '500', 'mg', 'Take 1 tablet with evening water', '08:00 PM', 'Pending');

    // 7-9. Configure provider WhatsApp/SMS/escalation
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(cgId);
    assert.equal(caregiver.phone_number, '+919876543210');

    // 10-12. Patient opens Echo and says "Echo."
    const greetingRes = processEchoMessage({ patientId: patId, text: 'Echo', language: 'en-IN' });
    assert.equal(greetingRes.recognizedIntent, 'GREETING');
    assert.ok(greetingRes.responseText.includes('Eleanor'));

    // 13-14. Patient asks "Who is Priya?"
    const memoryRes = processEchoMessage({ patientId: patId, text: 'Who is Priya?', language: 'en-IN' });
    assert.equal(memoryRes.recognizedIntent, 'FAMILY_QUERY');
    assert.ok(memoryRes.responseText.includes('Daughter'));

    // 15-16. Medication becomes due / Proactive query
    const medQueryRes = processEchoMessage({ patientId: patId, text: 'When is my medicine?', language: 'en-IN' });
    assert.equal(medQueryRes.recognizedIntent, 'MEDICATION_QUERY');
    assert.ok(medQueryRes.responseText.includes('Metformin'));

    // 17-19. Unconfirmed reminders lead to alert trigger
    db.prepare(`
      INSERT INTO emergency_escalations (id, patient_id, trigger_event, current_step, status)
      VALUES (?, ?, ?, 1, 'ACTIVE')
    `).run('esc-e2e-' + Date.now(), patId, 'Unconfirmed medication Metformin');

    // 20-22. Caregiver notification triggered via WhatsApp/SMS fallback
    const notifRes = await notificationService.dispatchNotification({
      patientId: patId,
      caregiverId: cgId,
      eventType: 'MEDICATION_OVERDUE',
      priority: 'IMPORTANT',
      message: 'EchoCare Alert: Scheduled medication Metformin 500mg requires attention.',
    });
    assert.ok(notifRes.notificationId);

    // 23-25. Caregiver acknowledges alert & stops escalation
    const ackRes = notificationService.acknowledgeNotification(notifRes.notificationId, 'Priya Sharma');
    assert.equal(ackRes.success, true);

    const activeEsc = db.prepare("SELECT * FROM emergency_escalations WHERE patient_id = ? AND status = 'ACTIVE'").get(patId);
    assert.equal(activeEsc, undefined, 'Active escalation should be stopped after acknowledgement');

    // 26. Timeline records events
    const timelineEvents = db.prepare('SELECT * FROM timeline_events WHERE patient_id = ?').all(patId);
    assert.ok(timelineEvents.length > 0, 'Timeline events recorded');

    // 27-28. Caregiver asks "What happened today?"
    const summaryRes = processEchoMessage({ patientId: patId, text: 'What happened today?', language: 'en-IN' });
    assert.equal(summaryRes.recognizedIntent, 'TODAY_SUMMARY');
    assert.ok(summaryRes.responseText.includes("Today's care record"));
  });
});
