import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeString, buildLocalizedMedicationPrompt } from '../src/services/reminderEngine.js';
import { initDatabase, db } from '../server/db/database.js';

test('Reminder Engine & Database Integration Tests', async (t) => {
  await t.test('Time String Parsing (12-hour and 24-hour formats)', () => {
    // 12-hour AM/PM tests
    const t1 = parseTimeString('08:00 AM');
    assert.deepEqual(t1, { hours: 8, minutes: 0 });

    const t2 = parseTimeString('04:30 PM');
    assert.deepEqual(t2, { hours: 16, minutes: 30 });

    const t3 = parseTimeString('12:00 AM');
    assert.deepEqual(t3, { hours: 0, minutes: 0 });

    const t4 = parseTimeString('12:30 PM');
    assert.deepEqual(t4, { hours: 12, minutes: 30 });

    // 24-hour format tests
    const t5 = parseTimeString('08:00');
    assert.deepEqual(t5, { hours: 8, minutes: 0 });

    const t6 = parseTimeString('16:30');
    assert.deepEqual(t6, { hours: 16, minutes: 30 });

    const t7 = parseTimeString('20:45');
    assert.deepEqual(t7, { hours: 20, minutes: 45 });

    // Invalid format test
    const t8 = parseTimeString('invalid-time');
    assert.equal(t8, null);
  });

  await t.test('Localized Medication Voice Prompt Generation', () => {
    const med = { name: 'Metformin', dosage: '500', unit: 'mg', instructions: 'With breakfast' };
    const enPrompt = buildLocalizedMedicationPrompt(med, 1, 'en-IN');
    assert.ok(enPrompt.includes('Metformin'), 'English prompt contains medication name');
    assert.ok(enPrompt.includes('500'), 'English prompt contains dosage');

    const taPrompt = buildLocalizedMedicationPrompt(med, 1, 'ta-IN');
    assert.ok(taPrompt.includes('Metformin'), 'Tamil prompt contains medication name');

    const hiPrompt = buildLocalizedMedicationPrompt(med, 1, 'hi-IN');
    assert.ok(hiPrompt.includes('Metformin'), 'Hindi prompt contains medication name');
  });

  await t.test('Database Initialization & Record Counts', () => {
    initDatabase();
    const medRow = db.prepare('SELECT count(*) as count FROM medications').get();
    assert.ok(medRow.count >= 4, 'Seeded medications exist in SQLite DB');

    const patRow = db.prepare('SELECT count(*) as count FROM patients').get();
    assert.ok(patRow.count >= 1, 'Seeded patient exists in SQLite DB');
  });
});
