import {
  DEMO_PATIENT_PROFILE,
  DEMO_CAREGIVERS,
  DEMO_MEDICATIONS,
  DEMO_MEMORIES,
  DEMO_TELEMETRY_LOGS,
} from '../data/initialData.js';

const KEYS = {
  PATIENT_PROFILE: 'echocare_patient_profile_v3',
  CAREGIVERS: 'echocare_caregivers_v3',
  MEDICATIONS: 'echocare_medications_v3',
  MEMORIES: 'echocare_memories_v3',
  LOGS: 'echocare_logs_v3',
  SETTINGS: 'echocare_settings_v3',
  TIMELINE: 'echocare_timeline_v3',
  OBSERVATIONS: 'echocare_observations_v3',
  HANDOVERS: 'echocare_handovers_v3',
  DISTRESS: 'echocare_distress_v3',
  AUDIT_LOGS: 'echocare_audit_logs_v3',
  WELLBEING: 'echocare_wellbeing_v3',
};

const listeners = new Set();

export const subscribeToStorage = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb());
};

// ==========================================
// PATIENT PROFILE & PERSONAL MEMORY ARCHITECTURE
// ==========================================
export const getPatientProfile = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(KEYS.PATIENT_PROFILE);
      if (data) return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed reading patient profile from storage', err);
  }

  // Complete initial profile schema matching Personal Memory Architecture
  const initial = {
    ...DEMO_PATIENT_PROFILE,
    stageProfile: 'early', // 'early' | 'moderate' | 'advanced'
    identity: {
      profession: 'High School Biology Teacher & Garden Botanist',
      hometown: 'Cape May, New Jersey',
      placesLived: 'Cape May, NJ · Philadelphia, PA',
      importantLifeEvents: 'Married Tom in 1978 · Daughter Priya born in 1980 · Son David born in 1983',
    },
    preferences: {
      favouriteMusic: '70s Soft Acoustic Folk & Classical Piano',
      favouriteFood: 'Warm Sourdough Bread with Rosemary & Chamomile Tea',
      hobbies: 'Growing heirloom roses, beach strolling, recipe journaling',
      favouritePlaces: 'Cape May Beach & Backyard Rose Garden',
      favouriteActivities: 'Afternoon tea with family, soft music listening',
    },
    routines: {
      wakeTime: '07:00 AM',
      meals: 'Breakfast at 8:00 AM · Lunch at 12:30 PM · Dinner at 6:30 PM',
      medication: '8:00 AM Metformin · 12:30 PM Vitamin D3 · 4:30 PM Lisinopril · 8:30 PM Melatonin',
      walks: '4:00 PM Garden stroll with Sarah',
      sleep: '08:30 PM Bedtime routine',
    },
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEYS.PATIENT_PROFILE, JSON.stringify(initial));
    }
  } catch (e) {}

  return initial;
};

export const savePatientProfile = (profile) => {
  localStorage.setItem(KEYS.PATIENT_PROFILE, JSON.stringify(profile));
  addTelemetryLog('PROFILE_UPDATED', 'INFO', `Patient profile updated for ${profile.preferredName || profile.fullName || 'User'}.`);
  addAccessAuditLog({
    user: 'Caregiver Admin',
    role: 'Primary Caregiver',
    action: 'UPDATE_PATIENT_PROFILE',
    targetData: `Updated profile & memory architecture for ${profile.preferredName}`,
  });
  notifyListeners();
};

// ==========================================
// CAREGIVERS / CONTACTS & GRANULAR PERMISSIONS
// ==========================================
export const getCaregivers = () => {
  try {
    const data = localStorage.getItem(KEYS.CAREGIVERS);
    if (data) {
      const list = JSON.parse(data);
      // Ensure role & permissions fields exist on each caregiver
      return list.map((c) => ({
        ...c,
        role: c.role || (c.primaryContact ? 'primary' : 'family'),
        permissions: c.permissions || {
          viewMemories: true,
          viewMedications: true,
          addObservations: true,
          viewTimeline: true,
          manageContacts: c.primaryContact || false,
          receiveAlerts: c.receiveEmergencyAlerts || false,
          manageMedication: c.primaryContact || false,
        },
      }));
    }
  } catch (err) {
    console.error('Failed to read caregivers from storage', err);
  }

  const initialCaregivers = DEMO_CAREGIVERS.map((c) => ({
    ...c,
    role: c.primaryContact ? 'primary' : 'family',
    permissions: {
      viewMemories: true,
      viewMedications: true,
      addObservations: true,
      viewTimeline: true,
      manageContacts: c.primaryContact || false,
      receiveAlerts: c.receiveEmergencyAlerts || false,
      manageMedication: c.primaryContact || false,
    },
  }));

  localStorage.setItem(KEYS.CAREGIVERS, JSON.stringify(initialCaregivers));
  return initialCaregivers;
};

export const saveCaregivers = (caregivers) => {
  localStorage.setItem(KEYS.CAREGIVERS, JSON.stringify(caregivers));
  notifyListeners();
};

export const addCaregiver = (newCaregiver) => {
  const current = getCaregivers();
  const caregiverWithPerms = {
    ...newCaregiver,
    role: newCaregiver.role || 'family',
    permissions: newCaregiver.permissions || {
      viewMemories: true,
      viewMedications: true,
      addObservations: true,
      viewTimeline: true,
      manageContacts: false,
      receiveAlerts: newCaregiver.receiveEmergencyAlerts || false,
      manageMedication: false,
    },
  };
  const updated = [caregiverWithPerms, ...current];
  saveCaregivers(updated);
  addTelemetryLog('CONTACT_ADDED', 'INFO', `Added contact: ${newCaregiver.name} (${newCaregiver.relation}).`);
  addAccessAuditLog({
    user: 'Caregiver Admin',
    role: 'Primary Caregiver',
    action: 'ADD_CONTACT',
    targetData: `Added contact ${newCaregiver.name} with role ${caregiverWithPerms.role}`,
  });
  return updated;
};

export const updateCaregiver = (id, updatedFields) => {
  const current = getCaregivers();
  const updated = current.map((c) => (c.id === id ? { ...c, ...updatedFields } : c));
  saveCaregivers(updated);
  addTelemetryLog('CONTACT_UPDATED', 'INFO', `Updated contact info for ID: ${id}`);
  addAccessAuditLog({
    user: 'Caregiver Admin',
    role: 'Primary Caregiver',
    action: 'UPDATE_CONTACT_PERMISSIONS',
    targetData: `Updated permissions/details for contact ID ${id}`,
  });
  return updated;
};

export const deleteCaregiver = (id) => {
  const current = getCaregivers();
  const caregiver = current.find((c) => c.id === id);
  const updated = current.filter((c) => c.id !== id);
  saveCaregivers(updated);
  if (caregiver) {
    addTelemetryLog('CONTACT_DELETED', 'INFO', `Deleted contact: ${caregiver.name}.`);
  }
  return updated;
};

// ==========================================
// MEDICATIONS & SCHEDULES
// ==========================================
export const getMedications = () => {
  try {
    const data = localStorage.getItem(KEYS.MEDICATIONS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read medications', err);
  }
  localStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(DEMO_MEDICATIONS));
  return DEMO_MEDICATIONS;
};

export const saveMedications = (meds) => {
  localStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(meds));
  notifyListeners();
};

export const addMedication = (newMed) => {
  const meds = getMedications();
  const updated = [...meds, newMed];
  saveMedications(updated);
  addTelemetryLog('MEDICATION_ADDED', 'INFO', `Scheduled medication: ${newMed.name} (${newMed.dosage}) for ${newMed.scheduledTime}.`);
  addLongitudinalEvent({
    category: 'Medication',
    title: 'Medication Scheduled',
    detail: `New medication added: ${newMed.name} (${newMed.dosage}) scheduled at ${newMed.scheduledTime}.`,
    source: 'Caregiver Admin',
    icon: 'Pill',
  });
  return updated;
};

export const updateMedication = (id, updatedFields) => {
  const meds = getMedications();
  const updated = meds.map((m) => (m.id === id ? { ...m, ...updatedFields } : m));
  saveMedications(updated);
  return updated;
};

export const deleteMedication = (id) => {
  const meds = getMedications();
  const med = meds.find((m) => m.id === id);
  const updated = meds.filter((m) => m.id !== id);
  saveMedications(updated);
  if (med) {
    addTelemetryLog('MEDICATION_DELETED', 'INFO', `Removed medication schedule: ${med.name}.`);
  }
  return updated;
};

export const updateMedicationStatus = (medId, status, verifiedTimeStr = null, verificationSource = 'Voice Companion / OCR') => {
  const meds = getMedications();
  const timeNow = verifiedTimeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const updated = meds.map((m) => {
    if (m.id === medId) {
      const history = m.verificationHistory || [];
      return {
        ...m,
        status,
        verifiedAt: status === 'Verified' ? timeNow : m.verifiedAt,
        verificationHistory: [{ timestamp: timeNow, status, source: verificationSource }, ...history],
      };
    }
    return m;
  });
  saveMedications(updated);
  const med = meds.find((m) => m.id === medId);
  addTelemetryLog(
    'MEDICATION_STATUS_CHANGED',
    status === 'Verified' ? 'SUCCESS' : 'WARNING',
    `Medication '${med?.name || medId}' status updated to ${status}.`
  );

  // Log to longitudinal care memory
  addLongitudinalEvent({
    category: 'Medication',
    title: status === 'Verified' ? 'Medication Verified' : `Medication ${status}`,
    detail: `${med?.name || 'Medication'} (${med?.dosage || ''}) marked as ${status} via ${verificationSource}.`,
    source: verificationSource,
    icon: 'Pill',
  });

  return updated;
};

// ==========================================
// MEMORIES & SCRAPBOOK
// ==========================================
export const getMemories = () => {
  try {
    const data = localStorage.getItem(KEYS.MEMORIES);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed reading memories', err);
  }
  localStorage.setItem(KEYS.MEMORIES, JSON.stringify(DEMO_MEMORIES));
  return DEMO_MEMORIES;
};

export const saveMemories = (memories) => {
  localStorage.setItem(KEYS.MEMORIES, JSON.stringify(memories));
  notifyListeners();
};

export const addMemory = (newMemory) => {
  const current = getMemories();
  const updated = [newMemory, ...current];
  saveMemories(updated);
  addTelemetryLog('MEMORY_ADDED', 'INFO', `Added scrapbook memory: ${newMemory.title}`);
  addLongitudinalEvent({
    category: 'Memory',
    title: 'New Memory Added',
    detail: `Personal memory recorded: "${newMemory.title}"`,
    source: 'Caregiver Scrapbook',
    icon: 'Sparkles',
  });
  return updated;
};

export const deleteMemory = (id) => {
  const current = getMemories();
  const updated = current.filter((m) => m.id !== id);
  saveMemories(updated);
  return updated;
};

// ==========================================
// LONGITUDINAL CARE TIMELINE ("Margaret's Story")
// ==========================================
const INITIAL_TIMELINE_EVENTS = [
  {
    id: 'tl-1',
    timestamp: '08:15 AM',
    date: new Date().toLocaleDateString(),
    category: 'Medication', // 'Medication' | 'Mood' | 'Mobility' | 'Memory' | 'Safety' | 'Observation' | 'Family'
    title: 'Medication Verified',
    detail: 'Metformin (500 mg) visually verified and taken with morning water.',
    source: 'Pill OCR Scanner',
    icon: 'CheckCircle',
  },
  {
    id: 'tl-2',
    timestamp: '10:30 AM',
    date: new Date().toLocaleDateString(),
    category: 'Observation',
    title: 'Caregiver Voice Observation',
    detail: 'Sarah recorded: "Margaret enjoyed warm chamomile tea and conversed gently about childhood rose gardens."',
    source: 'Visiting Nurse - Sarah Jenkins',
    icon: 'Mic',
  },
  {
    id: 'tl-3',
    timestamp: '12:45 PM',
    date: new Date().toLocaleDateString(),
    category: 'Medication',
    title: 'Medication Verified',
    detail: 'Vitamin D3 & Calcium (1000 IU) verified with lunch broth.',
    source: 'Voice Companion',
    icon: 'Pill',
  },
  {
    id: 'tl-4',
    timestamp: '02:00 PM',
    date: new Date().toLocaleDateString(),
    category: 'Family',
    title: 'Family Visit',
    detail: 'Priya Sharma visited. Memory cue and voice greeting played.',
    source: 'Face Recognition',
    icon: 'Heart',
  },
];

export const getLongitudinalTimeline = () => {
  try {
    const data = localStorage.getItem(KEYS.TIMELINE);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed reading timeline', err);
  }
  localStorage.setItem(KEYS.TIMELINE, JSON.stringify(INITIAL_TIMELINE_EVENTS));
  return INITIAL_TIMELINE_EVENTS;
};

export const addLongitudinalEvent = (event) => {
  const current = getLongitudinalTimeline();
  const newEvent = {
    id: 'tl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: event.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: event.date || new Date().toLocaleDateString(),
    category: event.category || 'Observation',
    title: event.title || 'Care Event',
    detail: event.detail || '',
    source: event.source || 'EchoCare System',
    icon: event.icon || 'Activity',
  };
  const updated = [newEvent, ...current];
  localStorage.setItem(KEYS.TIMELINE, JSON.stringify(updated));
  notifyListeners();
  return updated;
};

// ==========================================
// CAREGIVER VOICE OBSERVATIONS
// ==========================================
const INITIAL_OBSERVATIONS = [
  {
    id: 'obs-1',
    timestamp: '10:30 AM',
    date: new Date().toLocaleDateString(),
    rawAudioText: "Margaret finished half of her breakfast tea and was very cheerful talking about garden roses.",
    structured: {
      appetite: 'Normal',
      energy: 'Energetic & Alert',
      mobility: 'Independent',
      sleepBehavior: 'Restful',
    },
    source: 'Sarah Jenkins, RN',
  },
];

export const getCaregiverObservations = () => {
  try {
    const data = localStorage.getItem(KEYS.OBSERVATIONS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed reading observations', err);
  }
  localStorage.setItem(KEYS.OBSERVATIONS, JSON.stringify(INITIAL_OBSERVATIONS));
  return INITIAL_OBSERVATIONS;
};

export const addCaregiverObservation = (obs) => {
  const current = getCaregiverObservations();
  const updated = [obs, ...current];
  localStorage.setItem(KEYS.OBSERVATIONS, JSON.stringify(updated));

  // Automatically append to longitudinal timeline
  addLongitudinalEvent({
    category: 'Observation',
    title: 'Voice Observation Captured',
    detail: `Appetite: ${obs.structured.appetite} | Energy: ${obs.structured.energy} | Mobility: ${obs.structured.mobility}`,
    source: obs.source || 'Caregiver Voice Capture',
    icon: 'Mic',
  });

  notifyListeners();
  return updated;
};

// ==========================================
// SHIFT HANDOVERS
// ==========================================
export const getShiftHandovers = () => {
  try {
    const data = localStorage.getItem(KEYS.HANDOVERS);
    if (data) return JSON.parse(data);
  } catch (err) {
    return [];
  }
  return [];
};

export const addShiftHandover = (handover) => {
  const current = getShiftHandovers();
  const updated = [handover, ...current];
  localStorage.setItem(KEYS.HANDOVERS, JSON.stringify(updated));

  addLongitudinalEvent({
    category: 'Observation',
    title: 'Shift Handover Confirmed',
    detail: `Handover from ${handover.outgoingCaregiver}. Watch: ${handover.structuredBrief.watch}`,
    source: 'Shift Handover Intelligence',
    icon: 'FileText',
  });

  notifyListeners();
  return updated;
};

// ==========================================
// DISTRESS EVENTS
// ==========================================
export const getDistressEvents = () => {
  try {
    const data = localStorage.getItem(KEYS.DISTRESS);
    if (data) return JSON.parse(data);
  } catch (err) {
    return [];
  }
  return [];
};

export const addDistressEvent = (event) => {
  const current = getDistressEvents();
  const updated = [event, ...current];
  localStorage.setItem(KEYS.DISTRESS, JSON.stringify(updated));
  notifyListeners();
  return updated;
};

// ==========================================
// CONSENT & ACCESS AUDIT LOGS
// ==========================================
export const getAccessAuditLogs = () => {
  try {
    const data = localStorage.getItem(KEYS.AUDIT_LOGS);
    if (data) return JSON.parse(data);
  } catch (err) {
    return [];
  }
  return [];
};

export const addAccessAuditLog = (entry) => {
  const current = getAccessAuditLogs();
  const newLog = {
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    user: entry.user || 'Caregiver User',
    role: entry.role || 'Primary Caregiver',
    action: entry.action || 'VIEW_RECORD',
    targetData: entry.targetData || 'Health & Timeline Data',
  };
  const updated = [newLog, ...current.slice(0, 99)];
  localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(updated));
  return updated;
};

// ==========================================
// CAREGIVER WELLBEING
// ==========================================
export const getCaregiverWellbeing = () => {
  try {
    const data = localStorage.getItem(KEYS.WELLBEING);
    if (data) return JSON.parse(data);
  } catch (err) {
    // Default fallback
  }
  return {
    selfReport: 'Tired', // 'Doing okay' | 'Tired' | 'Overwhelmed' | 'Struggling'
    lastReportedAt: new Date().toLocaleDateString(),
    workloadMetrics: {
      careTasksCount: 14,
      recentAlertsCount: 3,
      nighttimeInterventionsCount: 2,
      observationFrequency: 'High (4/day)',
    },
    recommendation: 'You have had a demanding week with multiple evening check-ins. Consider sharing tonight\'s medication verification with David or taking a short break.',
  };
};

export const saveCaregiverWellbeing = (wellbeing) => {
  localStorage.setItem(KEYS.WELLBEING, JSON.stringify(wellbeing));
  notifyListeners();
};

// ==========================================
// TELEMETRY LOGS
// ==========================================
export const getTelemetryLogs = () => {
  try {
    const data = localStorage.getItem(KEYS.LOGS);
    if (data) return JSON.parse(data);
  } catch (err) {
    return [];
  }
  localStorage.setItem(KEYS.LOGS, JSON.stringify(DEMO_TELEMETRY_LOGS));
  return DEMO_TELEMETRY_LOGS;
};

export const addTelemetryLog = (type, level, message, payload = null) => {
  const logs = getTelemetryLogs();
  const newLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type,
    level, // 'INFO', 'SUCCESS', 'WARNING', 'CRITICAL'
    message,
    payload,
  };
  const updated = [newLog, ...logs.slice(0, 99)];
  localStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
  notifyListeners();
  return updated;
};

// ==========================================
// SETTINGS
// ==========================================
export const getAppSettings = () => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read app settings', err);
  }
  return {
    darkMode: false,
    caregiverPin: '1234',
  };
};

export const saveAppSettings = (settings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  notifyListeners();
};

// ==========================================
// DEMO DATA SEEDING & RESET
// ==========================================
export const loadDemoData = () => {
  savePatientProfile(DEMO_PATIENT_PROFILE);
  saveCaregivers(DEMO_CAREGIVERS);
  saveMedications(DEMO_MEDICATIONS);
  saveMemories(DEMO_MEMORIES);
  localStorage.setItem(KEYS.LOGS, JSON.stringify(DEMO_TELEMETRY_LOGS));
  localStorage.setItem(KEYS.TIMELINE, JSON.stringify(INITIAL_TIMELINE_EVENTS));
  localStorage.setItem(KEYS.OBSERVATIONS, JSON.stringify(INITIAL_OBSERVATIONS));
  addTelemetryLog('DEMO_DATA_LOADED', 'SUCCESS', 'Sample evaluation dataset reset to defaults.');
  addAccessAuditLog({
    user: 'System Admin',
    role: 'System',
    action: 'SEED_DEMO_DATA',
    targetData: 'Loaded Margaret Miller evaluation dataset',
  });
  notifyListeners();
};

export const clearAllData = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  addTelemetryLog('SYSTEM_RESET', 'INFO', 'All data reset to empty state.');
  notifyListeners();
};

export const resetToDefaults = loadDemoData;
