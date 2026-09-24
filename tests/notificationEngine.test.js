import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../server/db/database.js';
import { notificationService } from '../server/engines/notificationEngine.js';

test('Notification Abstraction & Fallback Engine Tests', async (t) => {
  initDatabase();

  await t.test('Dispatch Notification Fallback Chain', async () => {
    const result = await notificationService.dispatchNotification({
      patientId: 'pat-1',
      caregiverId: 'cg-1',
      eventType: 'MEDICATION_OVERDUE',
      priority: 'IMPORTANT',
      message: 'Test automated alert message',
    });

    assert.ok(result.notificationId, 'Notification ID created');
    assert.equal(result.recipient, 'Priya Sharma');
    assert.ok(result.deliveryLogs.length >= 1, 'Should attempt Push/SMS fallback');
  });

  await t.test('Caregiver Acknowledgement Stops Escalation', () => {
    const dispatchRes = notificationService.dispatchNotification({
      patientId: 'pat-1',
      caregiverId: 'cg-1',
      eventType: 'DISTRESS_ALERT',
      priority: 'CRITICAL',
      message: 'Test distress alert requiring acknowledgement',
    });

    return dispatchRes.then(res => {
      const ackRes = notificationService.acknowledgeNotification(res.notificationId, 'Priya Sharma');
      assert.equal(ackRes.success, true);
      assert.equal(ackRes.status, 'ACKNOWLEDGED');
    });
  });
});
