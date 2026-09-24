import express from 'express';
import { db } from '../db/database.js';
import { notificationService } from '../engines/notificationEngine.js';

const router = express.Router();

// GET /api/notifications?patientId=pat-1
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const notifications = db.prepare('SELECT * FROM notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT 50').all(patientId);
  const deliveries = db.prepare('SELECT * FROM notification_deliveries ORDER BY created_at DESC LIMIT 50').all();

  res.json({
    success: true,
    notifications,
    deliveries,
  });
});

// POST /api/notifications/:id/acknowledge
router.post('/:id/acknowledge', (req, res) => {
  const { acknowledgedBy = 'Caregiver User' } = req.body;
  const result = notificationService.acknowledgeNotification(req.params.id, acknowledgedBy);
  res.json(result);
});

// POST /api/notifications/test-alert (For evaluation & manual testing)
router.post('/test-alert', async (req, res) => {
  const { patientId = 'pat-1', eventType = 'MEDICATION_OVERDUE', message = 'Test alert' } = req.body;
  const result = await notificationService.dispatchNotification({
    patientId,
    eventType,
    priority: 'IMPORTANT',
    message,
  });
  res.json({ success: true, result });
});

// POST /api/notifications/test-fcm (Dispatches real Firebase FCM Push Notification)
router.post('/test-fcm', async (req, res) => {
  const {
    caregiverId = 'cg-1',
    patientId = 'pat-1',
    title = '🔔 EchoCare Real Test Notification',
    message = 'This is a real Firebase FCM push notification sent from EchoCare backend!',
  } = req.body;

  const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(caregiverId);
  const fcmToken = req.body.fcmToken || caregiver?.fcm_token;

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      error: 'UNREGISTERED_DEVICE',
      message: 'No registered FCM device token found. Please click "Enable Caregiver Notifications" first.',
    });
  }

  const result = await notificationService.pushProvider.send(fcmToken, {
    title,
    message,
    priority: 'HIGH',
  });

  const notificationId = 'notif-fcm-test-' + Date.now();
  db.prepare(`
    INSERT INTO notifications (id, patient_id, recipient_caregiver_id, event_type, priority, message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(notificationId, patientId, caregiverId, 'FCM_TEST_PUSH', 'IMPORTANT', message, result.status);

  db.prepare(`
    INSERT INTO notification_deliveries (id, notification_id, channel, provider, attempt_number, status, response_payload, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'del-fcm-test-' + Date.now(),
    notificationId,
    'PUSH',
    result.provider,
    1,
    result.status,
    result.responsePayload || null,
    result.error || null
  );

  res.json({
    success: result.success,
    result,
    notificationId,
    fcmToken,
  });
});

export default router;
