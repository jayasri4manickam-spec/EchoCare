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

export default router;
