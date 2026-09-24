import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET /api/audit-logs
router.get('/', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ success: true, auditLogs: logs });
});

export default router;
