import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Enable WAL mode & foreign keys for high performance & reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.transaction(() => {
    // 1. Schema Versioning Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL, -- 'PATIENT', 'PRIMARY_CAREGIVER', 'FAMILY_CAREGIVER'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Patients Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        preferred_name TEXT,
        date_of_birth TEXT,
        primary_language TEXT DEFAULT 'en-IN',
        stage_profile TEXT DEFAULT 'early', -- 'early', 'moderate', 'advanced'
        medical_notes TEXT,
        emergency_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Caregivers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS caregivers (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        relation TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        email TEXT,
        preferred_language TEXT DEFAULT 'en-IN',
        role TEXT DEFAULT 'family', -- 'primary', 'secondary', 'family', 'emergency'
        receive_emergency_alerts INTEGER DEFAULT 1,
        active_status INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Family Members Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        photo_url TEXT,
        memory_note TEXT,
        contact_phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Relationships Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        entity_a_id TEXT NOT NULL,
        entity_b_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Emergency Contacts Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        priority_order INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Medications Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        unit TEXT DEFAULT 'mg',
        instructions TEXT,
        frequency TEXT DEFAULT 'Daily',
        scheduled_time TEXT NOT NULL, -- e.g. "05:00 PM" or "10:37 AM"
        reminder1_interval INTEGER DEFAULT 0,
        reminder2_interval INTEGER DEFAULT 10,
        reminder3_interval INTEGER DEFAULT 10,
        escalation_delay INTEGER DEFAULT 5,
        start_date TEXT,
        end_date TEXT,
        active_status INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'Verified', 'Declined', 'Snoozed', 'Missed'
        verified_at TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Medication Schedules Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS medication_schedules (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        scheduled_time TEXT NOT NULL,
        days_of_week TEXT DEFAULT 'ALL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Medication Events Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS medication_events (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        event_key TEXT UNIQUE, -- e.g. pat-1_med-1_2026-09-22_05:00 PM
        scheduled_for TEXT NOT NULL,
        state TEXT NOT NULL, -- 'SCHEDULED', 'FIRST_REMINDER_SENT', 'SECOND_REMINDER_SENT', 'THIRD_REMINDER_SENT', 'CAREGIVER_ESCALATION', 'COMPLETED', 'DECLINED', 'SNOOZED', 'FAILED'
        reminder_1_sent_at TEXT,
        reminder_2_sent_at TEXT,
        reminder_3_sent_at TEXT,
        escalated_at TEXT,
        acknowledged_at TEXT,
        completed_at TEXT,
        confirmation_method TEXT, -- 'Voice', 'UI', 'Snooze', 'Decline', 'Camera'
        acknowledged_by_caregiver TEXT,
        final_status TEXT DEFAULT 'SCHEDULED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe column migrations for pre-existing databases
    const addColumnIfMissing = (table, column, def) => {
      try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!info.some((c) => c.name === column)) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
        }
      } catch (e) {}
    };

    addColumnIfMissing('medications', 'reminder1_interval', 'INTEGER DEFAULT 0');
    addColumnIfMissing('medications', 'reminder2_interval', 'INTEGER DEFAULT 10');
    addColumnIfMissing('medications', 'reminder3_interval', 'INTEGER DEFAULT 10');
    addColumnIfMissing('medications', 'escalation_delay', 'INTEGER DEFAULT 5');
    addColumnIfMissing('medications', 'end_date', 'TEXT');

    addColumnIfMissing('medication_events', 'scheduled_date', 'TEXT');
    addColumnIfMissing('medication_events', 'scheduled_time', 'TEXT');
    addColumnIfMissing('medication_events', 'event_key', 'TEXT');
    addColumnIfMissing('medication_events', 'reminder_1_sent_at', 'TEXT');
    addColumnIfMissing('medication_events', 'reminder_2_sent_at', 'TEXT');
    addColumnIfMissing('medication_events', 'reminder_3_sent_at', 'TEXT');
    addColumnIfMissing('medication_events', 'escalated_at', 'TEXT');
    addColumnIfMissing('medication_events', 'completed_at', 'TEXT');
    addColumnIfMissing('medication_events', 'final_status', 'TEXT DEFAULT "SCHEDULED"');

    // 11. Memories Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Family',
        year TEXT,
        story TEXT NOT NULL,
        people_involved TEXT,
        location TEXT,
        audio_url TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Life Events Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS life_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        event_date TEXT,
        description TEXT,
        importance TEXT DEFAULT 'High',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Patient Preferences Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS patient_preferences (
        id TEXT PRIMARY KEY,
        patient_id TEXT UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        favourite_music TEXT,
        favourite_food TEXT,
        hobbies TEXT,
        favourite_places TEXT,
        favourite_activities TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Conversations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        language TEXT DEFAULT 'en-IN'
      );
    `);

    // 15. Conversation Messages Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        sender TEXT NOT NULL, -- 'PATIENT', 'ECHO'
        text TEXT NOT NULL,
        intent TEXT,
        agent_source TEXT,
        timestamp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Observations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        caregiver_name TEXT NOT NULL,
        raw_audio_text TEXT NOT NULL,
        appetite TEXT,
        energy TEXT,
        mobility TEXT,
        sleep_behavior TEXT,
        status TEXT DEFAULT 'Confirmed',
        timestamp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. Distress Events Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS distress_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        distress_level TEXT NOT NULL, -- 'EARLY DISTRESS', 'ELEVATED DISTRESS', 'HIGH DISTRESS'
        trigger_signal TEXT NOT NULL,
        support_mode_applied TEXT,
        alert_sent INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. Timeline Events Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        timestamp TEXT NOT NULL,
        date_str TEXT NOT NULL,
        category TEXT NOT NULL, -- 'Medication', 'Mood', 'Mobility', 'Memory', 'Safety', 'Observation', 'Family'
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        source TEXT NOT NULL,
        icon TEXT DEFAULT 'Activity',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 19. Notifications Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        recipient_caregiver_id TEXT REFERENCES caregivers(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL, -- 'MEDICATION_OVERDUE', 'DISTRESS_ALERT', 'ROUTINE_ALERT', 'SAFETY_ALERT'
        priority TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'IMPORTANT', 'CRITICAL'
        message TEXT NOT NULL,
        status TEXT DEFAULT 'QUEUED', -- 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP,
        failure_reason TEXT
      );
    `);

    // 20. Notification Deliveries Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id TEXT PRIMARY KEY,
        notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        channel TEXT NOT NULL, -- 'WHATSAPP', 'SMS', 'PUSH', 'EMAIL'
        provider TEXT NOT NULL,
        attempt_number INTEGER DEFAULT 1,
        status TEXT NOT NULL, -- 'SENT', 'DELIVERED', 'FAILED'
        response_payload TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 21. Consents Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS consents (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        consent_type TEXT NOT NULL, -- 'PATIENT', 'CAREGIVER', 'VOICE_MESSAGE', 'NOTIFICATION', 'DATA_ACCESS'
        granted_by TEXT NOT NULL,
        is_granted INTEGER DEFAULT 1,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP
      );
    `);

    // 22. Permissions Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        caregiver_id TEXT NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
        view_memories INTEGER DEFAULT 1,
        view_medications INTEGER DEFAULT 1,
        add_observations INTEGER DEFAULT 1,
        view_timeline INTEGER DEFAULT 1,
        manage_contacts INTEGER DEFAULT 0,
        receive_alerts INTEGER DEFAULT 1,
        manage_medication INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 23. Audit Logs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 24. Caregiver Wellbeing Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS caregiver_wellbeing (
        id TEXT PRIMARY KEY,
        caregiver_id TEXT NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
        self_report TEXT DEFAULT 'Doing okay',
        care_tasks_count INTEGER DEFAULT 0,
        recent_alerts_count INTEGER DEFAULT 0,
        recommendation TEXT,
        reported_at TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 25. Handovers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS handovers (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        outgoing_caregiver TEXT NOT NULL,
        raw_notes TEXT NOT NULL,
        appetite_summary TEXT,
        behaviour_summary TEXT,
        pattern_summary TEXT,
        watch_summary TEXT,
        routine_summary TEXT,
        status TEXT DEFAULT 'Confirmed',
        timestamp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 26. Emergency Events & Escalations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS emergency_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        triggered_by TEXT DEFAULT 'PATIENT',
        reason TEXT DEFAULT 'Explicit emergency alert triggered',
        status TEXT DEFAULT 'INACTIVE', -- 'INACTIVE', 'TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED'
        triggered_at TIMESTAMP,
        acknowledged_at TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by TEXT,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS emergency_escalations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        trigger_event TEXT NOT NULL,
        current_step INTEGER DEFAULT 1, -- 1 = Primary Caregiver, 2 = Secondary Caregiver, 3 = Escalated
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
        primary_notified_at TIMESTAMP,
        secondary_notified_at TIMESTAMP,
        stopped_at TIMESTAMP,
        stopped_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 27. Routines Table & Routine Events
    db.exec(`
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routine_events (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'COMPLETED',
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 28. Voice Memories Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS voice_memories (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        speaker TEXT NOT NULL,
        relationship TEXT NOT NULL,
        title TEXT NOT NULL,
        message_text TEXT NOT NULL,
        audio_url TEXT,
        consent_granted INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Mandatory Indexes for Performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
      CREATE INDEX IF NOT EXISTS idx_caregivers_patient_id ON caregivers(patient_id);
      CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
      CREATE INDEX IF NOT EXISTS idx_medications_scheduled_time ON medications(scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_medication_events_scheduled_for ON medication_events(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_patient_id ON timeline_events(patient_id);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_timestamp ON timeline_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_emergency_escalations_state ON emergency_escalations(status);
    `);
  })();

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount && userCount.count > 0) return; // Already seeded

  console.log('🌱 Seeding initial EchoCare database evaluation records...');

  const passHash = bcrypt.hashSync('echocare123', 10);

  // Seed Users
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('usr-patient-1', 'margaret', 'margaret@echocare.org', passHash, 'PATIENT');

  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('usr-caregiver-1', 'priya', 'priya@echocare.org', passHash, 'PRIMARY_CAREGIVER');

  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('usr-caregiver-2', 'david', 'david@echocare.org', passHash, 'FAMILY_CAREGIVER');

  // Seed Patient
  db.prepare(`
    INSERT INTO patients (id, user_id, full_name, preferred_name, date_of_birth, primary_language, stage_profile, medical_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pat-1',
    'usr-patient-1',
    'Margaret Miller',
    'Margaret',
    '1946-04-12',
    'en-IN',
    'early',
    'Mild Cognitive Impairment, Hypertension, Type 2 Diabetes'
  );

  // Seed Caregivers
  db.prepare(`
    INSERT INTO caregivers (id, patient_id, user_id, name, relation, phone_number, email, preferred_language, role, receive_emergency_alerts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('cg-1', 'pat-1', 'usr-caregiver-1', 'Priya Sharma', 'Daughter', '+919876543210', 'priya@echocare.org', 'en-IN', 'primary', 1);

  db.prepare(`
    INSERT INTO caregivers (id, patient_id, user_id, name, relation, phone_number, email, preferred_language, role, receive_emergency_alerts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('cg-2', 'pat-1', 'usr-caregiver-2', 'David Miller', 'Son', '+919812345678', 'david@echocare.org', 'en-IN', 'secondary', 1);

  // Seed Family Members
  db.prepare(`
    INSERT INTO family_members (id, patient_id, name, relationship, memory_note, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('fm-1', 'pat-1', 'Priya', 'Daughter', 'Brings fresh chamomile tea on Sundays.', '+919876543210');

  db.prepare(`
    INSERT INTO family_members (id, patient_id, name, relationship, memory_note, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('fm-2', 'pat-1', 'David', 'Son', 'Calls every evening at 6:00 PM.', '+919812345678');

  // Seed Medications
  db.prepare(`
    INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('med-1', 'pat-1', 'Metformin', '500', 'mg', 'Take 1 tablet with breakfast water', '08:00 AM', 'Verified');

  db.prepare(`
    INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('med-2', 'pat-1', 'Vitamin D3 & Calcium', '1000', 'IU', 'Take 1 capsule with lunch broth', '12:30 PM', 'Verified');

  db.prepare(`
    INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('med-3', 'pat-1', 'Lisinopril', '10', 'mg', 'Take 1 tablet with afternoon tea', '04:30 PM', 'Pending');

  db.prepare(`
    INSERT INTO medications (id, patient_id, name, dosage, unit, instructions, scheduled_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('med-4', 'pat-1', 'Melatonin', '3', 'mg', 'Take 1 tablet 30 minutes before bedtime', '08:00 PM', 'Pending');

  // Seed Memories
  db.prepare(`
    INSERT INTO memories (id, patient_id, title, category, year, story, people_involved, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'mem-1',
    'pat-1',
    'Summer at Cape May Beach',
    'Family Vacation',
    '1982',
    'You spent summer 1982 building sandcastles at Cape May with family and having vanilla ice cream on the boardwalk.',
    'Priya & David',
    'Cape May, New Jersey'
  );

  db.prepare(`
    INSERT INTO memories (id, patient_id, title, category, year, story, people_involved, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'mem-2',
    'pat-1',
    'Backyard Rose Garden Strolls',
    'Hobbies',
    '1995',
    'Your family tradition of growing rose bushes and making fresh sourdough bread with rosemary from the garden wall.',
    'Priya',
    'Backyard Garden'
  );

  // Seed Patient Preferences
  db.prepare(`
    INSERT INTO patient_preferences (id, patient_id, favourite_music, favourite_food, hobbies, favourite_places, favourite_activities)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('pref-1', 'pat-1', '70s Soft Acoustic Folk & Classical Piano', 'Warm Sourdough Bread & Chamomile Tea', 'Growing heirloom roses', 'Cape May Beach & Backyard Garden', 'Afternoon tea with family');

  // Seed Voice Memories
  db.prepare(`
    INSERT INTO voice_memories (id, patient_id, speaker, relationship, title, message_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('vm-1', 'pat-1', 'Priya', 'Daughter', 'Sunday Visit Reminder', 'Hi Amma! I will visit you Sunday afternoon with fresh chamomile tea. Love you!');

  // Seed Timeline Events
  db.prepare(`
    INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tl-seed-1', 'pat-1', '08:04 AM', new Date().toISOString().split('T')[0], 'Medication', 'Morning Medication Confirmed', 'Metformin (500 mg) confirmed and taken with breakfast.', 'Voice Companion');

  // Seed Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, user_name, role, action, target_data, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('audit-seed-1', 'System Admin', 'SYSTEM', 'INITIALIZE_DATABASE', 'Database schema v1 created and seeded', new Date().toLocaleTimeString());

  console.log('✅ EchoCare persistent database initialization complete.');
}
