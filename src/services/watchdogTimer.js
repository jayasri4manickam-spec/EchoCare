import { getMedications, addTelemetryLog } from './storage';
import { speakWhisper } from './speechTTS';

let watchdogInterval = null;
let currentEscalationState = 'Normal'; // 'Normal' | 'Pending Caregiver Ping' | 'Critical Alert'
let lastTwilioPayload = null;

const watchdogListeners = new Set();

export const subscribeToWatchdog = (callback) => {
  watchdogListeners.add(callback);
  return () => watchdogListeners.delete(callback);
};

const notifyWatchdog = () => {
  watchdogListeners.forEach((cb) => cb(getWatchdogStatus()));
};

export const getWatchdogStatus = () => {
  return {
    state: currentEscalationState,
    lastTwilioPayload,
    lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

/**
 * Start automated inactivity & medication compliance watchdog
 */
export const startWatchdogTimer = () => {
  if (watchdogInterval) clearInterval(watchdogInterval);

  // Check every 15 seconds
  watchdogInterval = setInterval(() => {
    evaluateCompliance();
  }, 15000);

  evaluateCompliance();
};

export const stopWatchdogTimer = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
};

/**
 * Evaluates pending medication compliance and advances escalation state machine
 */
export const evaluateCompliance = () => {
  const medications = getMedications();
  const pendingMeds = medications.filter((m) => m.status === 'Pending');

  if (pendingMeds.length === 0) {
    if (currentEscalationState !== 'Normal') {
      currentEscalationState = 'Normal';
      lastTwilioPayload = null;
      addTelemetryLog('WATCHDOG_RESOLVED', 'SUCCESS', 'All scheduled medications verified. Escalation state reset to Normal.');
      notifyWatchdog();
    }
    return;
  }

  // Check if any medication is past scheduled window (Simulated check)
  if (currentEscalationState === 'Normal' && pendingMeds.length > 0) {
    // Standard normal state with pending meds
  }
};

/**
 * Simulate safety escalation trigger (Normal -> Pending Caregiver Ping -> Critical Alert)
 */
export const triggerSimulatedEscalation = (targetLevel = 'Pending Caregiver Ping') => {
  const pendingMeds = getMedications().filter((m) => m.status === 'Pending');
  const medName = pendingMeds[0]?.name || 'Donepezil 10mg';

  currentEscalationState = targetLevel;

  const payload = {
    sid: 'SM' + Math.random().toString(36).substring(2, 12).toUpperCase(),
    to: '+1 (555) 234-5678 (Daughter - Sarah)',
    from: '+1 (800) 555-ECHO (EchoCare Telemetry)',
    event: targetLevel === 'Critical Alert' ? 'CRITICAL_UNVERIFIED_MEDICATION' : 'PENDING_CAREGIVER_PING',
    patientName: 'Arthur Pendelton',
    roomLocation: 'Master Suite Room Companion Tablet (Lat: 37.7749° N, Lon: -122.4194° W)',
    status: `${targetLevel} - Scheduled medication ${medName} past due by 30 mins.`,
    timestamp: new Date().toISOString(),
    twilioVoiceTwiML: `<Response><Say voice="Polly.Joanna">Urgent EchoCare Notification: Arthur Pendelton has an unverified medication (${medName}). Please check room tablet or contact patient.</Say></Response>`
  };

  lastTwilioPayload = payload;

  addTelemetryLog(
    targetLevel === 'Critical Alert' ? 'CRITICAL_SAFETY_ALERT' : 'CAREGIVER_PING_SENT',
    targetLevel === 'Critical Alert' ? 'CRITICAL' : 'WARNING',
    `Escalation State: ${targetLevel}. Mock Twilio Payload dispatched to caregiver contact.`,
    payload
  );

  if (targetLevel === 'Pending Caregiver Ping') {
    speakWhisper("Gentle reminder: You have a scheduled medication pending verification. Caregiver has been notified.", true);
  } else if (targetLevel === 'Critical Alert') {
    speakWhisper("Attention: Scheduled medication window elapsed. Dispatching emergency safety ping to your family.", true);
  }

  notifyWatchdog();
  return payload;
};

/**
 * Reset escalation state back to Normal
 */
export const resetWatchdogState = () => {
  currentEscalationState = 'Normal';
  lastTwilioPayload = null;
  addTelemetryLog('WATCHDOG_MANUAL_RESET', 'INFO', 'Watchdog state manually reset to Normal by caregiver.');
  notifyWatchdog();
};
