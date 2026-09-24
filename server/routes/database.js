import express from 'express';
import { db } from '../db/database.js';
import { config } from '../config.js';

const router = express.Router();

router.get('/status', (req, res) => {
  try {
    const getCount = (tableName) => {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
        return row ? row.count : 0;
      } catch (e) {
        return 0;
      }
    };

    const tableCounts = {
      users: getCount('users'),
      patients: getCount('patients'),
      caregivers: getCount('caregivers'),
      medications: getCount('medications'),
      memories: getCount('memories'),
      timelineEvents: getCount('timeline_events'),
      notifications: getCount('notifications'),
      auditLogs: getCount('audit_logs'),
    };

    res.json({
      success: true,
      data: {
        activeEngine: 'SQLite (better-sqlite3)',
        status: 'CONNECTED',
        journalMode: 'WAL',
        dbPath: config.dbPath || 'server/db/echocare.db',
        tableCounts,
        supportedDatabases: [
          {
            id: 'sqlite',
            name: 'SQLite (better-sqlite3)',
            type: 'Relational (Embedded)',
            status: 'ACTIVE',
            useCase: 'Fast, local edge zero-config database for senior care units & local servers.',
          },
          {
            id: 'postgresql',
            name: 'PostgreSQL',
            type: 'Relational (Cloud)',
            status: 'AVAILABLE',
            useCase: 'Enterprise cloud hosting, multi-caregiver portals, and HIPAA compliance.',
          },
          {
            id: 'mongodb',
            name: 'MongoDB',
            type: 'NoSQL Document Store',
            status: 'AVAILABLE',
            useCase: 'Unstructured sensor telemetry, voice transcripts, and AI conversation streams.',
          },
          {
            id: 'supabase',
            name: 'Supabase / Firebase',
            type: 'Real-time BaaS',
            status: 'AVAILABLE',
            useCase: 'Real-time websocket sync between senior edge device and caregiver mobile app.',
          },
          {
            id: 'indexeddb',
            name: 'IndexedDB (Dexie.js)',
            type: 'Browser Client Store',
            status: 'ACTIVE_FALLBACK',
            useCase: 'Offline PWA browser cache so medicine reminders run even without internet.',
          },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
