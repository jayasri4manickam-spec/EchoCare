import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/timeline?patientId=pat-1&limit=50&offset=0
router.get('/', (req, res) => {
  const patientId = req.query.patientId || 'pat-1';
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;

  const events = db.prepare('SELECT * FROM timeline_events WHERE patient_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(patientId, limit, offset);
  const totalCount = db.prepare('SELECT count(*) as count FROM timeline_events WHERE patient_id = ?').get(patientId).count;

  res.json({
    success: true,
    timeline: events,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + events.length < totalCount,
    },
  });
});

export default router;
