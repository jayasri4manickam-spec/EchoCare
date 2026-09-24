import { getCaregivers, getPatientProfile, addTelemetryLog, addLongitudinalEvent } from './storage.js';
import { speak } from './voiceEngine.js';

// Explicit Emergency State Machine: 'INACTIVE' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED'
let currentEmergencyState = 'INACTIVE';
let activeEmergencyEvent = null;

const emergencyListeners = new Set();

export const resetEmergencyStateOnStartup = () => {
  currentEmergencyState = 'INACTIVE';
  activeEmergencyEvent = null;
  notifyEmergencyListeners();
};

export const subscribeToEmergencyService = (callback) => {
  emergencyListeners.add(callback);
  callback({ state: currentEmergencyState, activeEvent: activeEmergencyEvent });
  return () => emergencyListeners.delete(callback);
};

const notifyEmergencyListeners = () => {
  emergencyListeners.forEach((cb) => cb({ state: currentEmergencyState, activeEvent: activeEmergencyEvent }));
};

export const getEmergencyState = () => currentEmergencyState;
export const getActiveEmergencyEvent = () => activeEmergencyEvent;

/**
 * Retrieves primary emergency contact roster
 */
export const getEmergencyContacts = () => {
  const caregivers = getCaregivers();
  const alertContacts = caregivers.filter((c) => c.receiveEmergencyAlerts || c.role === 'primary');
  return alertContacts.length > 0 ? alertContacts : caregivers;
};

/**
 * Triggers emergency assistance workflow (State: TRIGGERED)
 * MUST ONLY be called upon explicit trigger:
 * - Patient pressing Emergency SOS button
 * - Authorized caregiver pressing Emergency SOS or sending CALL EMERGENCY command
 */
export const triggerEmergencyWorkflow = (source = 'Patient SOS Button', reason = 'Manual Patient SOS Trigger') => {
  const profile = getPatientProfile();
  const contacts = getEmergencyContacts();
  const patientName = profile.preferredName || profile.fullName || 'Margaret';
  const lang = profile.preferredLanguage || 'en-IN';
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  currentEmergencyState = 'TRIGGERED';
  activeEmergencyEvent = {
    id: 'em-evt-' + Date.now(),
    patientId: profile.id || 'pat-1',
    patientName,
    source,
    reason,
    timestamp: timeStr,
    dateStr,
    status: 'TRIGGERED',
    contactsAlerted: contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone_number, relation: c.relation })),
  };

  addTelemetryLog(
    'EMERGENCY_TRIGGERED',
    'CRITICAL',
    `Emergency assistance workflow triggered by ${source}. Reason: ${reason}`,
    activeEmergencyEvent
  );

  addLongitudinalEvent({
    category: 'Safety',
    title: 'Emergency Assistance Workflow Activated',
    detail: `Emergency alert initiated by ${source}. Alerted contacts: ${contacts.map(c => c.name).join(', ')}`,
    source: 'Emergency Service',
    icon: 'ShieldAlert',
  });

  const spokenMsg = lang.startsWith('ta') ? 'அவசர உதவி கோரிக்கை செயல்படுத்தப்பட்டது. பராமரிப்பாளருக்கு செய்தி அனுப்பப்பட்டுள்ளது.' :
                    lang.startsWith('hi') ? 'आपातकालीन सहायता प्रणाली सक्रिय की गई है। आपके देखभालकर्ता को सूचित कर दिया गया है।' :
                    lang.startsWith('te') ? 'అత్యవసర సహాయ వ్యవస్థ ప్రారంభించబడింది. కేర్‌గివర్‌కు సమాచారం అందించబడింది.' :
                    lang.startsWith('ml') ? 'അടിയന്തിര സഹായ സംവിധാനം സജീവമാക്കി. സന്ദേശം അയച്ചു.' :
                    lang.startsWith('kn') ? 'ತುರ್ತು ನೆರವು ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ. ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ.' :
                    'Emergency assistance workflow activated. Alert message sent to your configured emergency contact.';

  speak(spokenMsg, lang);
  notifyEmergencyListeners();

  return activeEmergencyEvent;
};

/**
 * Acknowledge active emergency workflow (State: ACKNOWLEDGED)
 */
export const acknowledgeEmergencyWorkflow = (acknowledgedBy = 'Caregiver User') => {
  if (currentEmergencyState === 'INACTIVE') return;

  currentEmergencyState = 'ACKNOWLEDGED';
  if (activeEmergencyEvent) {
    activeEmergencyEvent.status = 'ACKNOWLEDGED';
    activeEmergencyEvent.acknowledgedBy = acknowledgedBy;
    activeEmergencyEvent.acknowledgedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  addTelemetryLog('EMERGENCY_ACKNOWLEDGED', 'INFO', `Emergency alert acknowledged by ${acknowledgedBy}.`);
  notifyEmergencyListeners();
};

/**
 * Resolve emergency workflow (State: RESOLVED -> INACTIVE)
 */
export const resolveEmergencyWorkflow = (resolvedBy = 'Caregiver Admin', resolutionReason = 'Patient status verified safe') => {
  const profile = getPatientProfile();
  const lang = profile.preferredLanguage || 'en-IN';

  currentEmergencyState = 'RESOLVED';
  if (activeEmergencyEvent) {
    activeEmergencyEvent.status = 'RESOLVED';
    activeEmergencyEvent.resolvedBy = resolvedBy;
    activeEmergencyEvent.resolvedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  addTelemetryLog('EMERGENCY_RESOLVED', 'SUCCESS', `Emergency workflow resolved by ${resolvedBy}. Reason: ${resolutionReason}`);
  addLongitudinalEvent({
    category: 'Safety',
    title: 'Emergency Workflow Resolved',
    detail: `Emergency workflow marked as resolved by ${resolvedBy}.`,
    source: 'Caregiver Action',
    icon: 'CheckCircle',
  });

  const confirmMsg = lang.startsWith('ta') ? 'அவசர உதவி நிலை பாதுகாப்பாக நிறைவு செய்யப்பட்டது.' :
                     lang.startsWith('hi') ? 'आपातकालीन स्थिति सुरक्षित रूप से समाप्त कर दी गई है।' :
                     "Emergency workflow resolved safely.";
  speak(confirmMsg, lang);

  setTimeout(() => {
    currentEmergencyState = 'INACTIVE';
    activeEmergencyEvent = null;
    notifyEmergencyListeners();
  }, 2000);
};

export const cancelEmergencyAlert = () => {
  resolveEmergencyWorkflow('Patient', 'Cancelled by patient before dispatch');
};

export const dispatchEmergencyAlert = () => {
  return triggerEmergencyWorkflow('Manual SOS Button', 'Patient pressed emergency button');
};
