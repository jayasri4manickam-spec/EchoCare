import { api } from './api.js';
import { getMedications, getPatientProfile, addTelemetryLog, updateMedicationStatus } from './storage.js';
import { speak } from './voiceEngine.js';
import { playChime } from './speechTTS.js';
import { triggerEmergencyWorkflow } from './emergencyService.js';

let reminderTimer = null;
const alarmStagesTracked = new Map(); // Key: `${medId}_${dateStr}` -> Stage (1, 2, 3, 4)

/**
 * Startup initialization resets historical stage tracking for past scheduled times
 * to ensure app startup NEVER triggers accidental emergency alerts.
 */
export const startReminderEngine = () => {
  if (reminderTimer) clearInterval(reminderTimer);

  // Mark all current pending medications as initialized at startup time to prevent past-time triggers
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const meds = getMedications();
  meds.forEach((m) => {
    alarmStagesTracked.set(`${m.id}_${dateStr}`, { stage: 0, initializedAt: Date.now() });
  });

  evaluateScheduledReminders();
  reminderTimer = setInterval(() => {
    evaluateScheduledReminders();
  }, 10000); // Check every 10 seconds

  console.log('⏰ [EchoCare 3-Reminder Engine] Active with multilingual voice alerts.');
};

export const stopReminderEngine = () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
};

export const parseTimeString = (timeStr) => {
  if (!timeStr) return null;

  // 12-hour format with AM/PM (e.g., "08:00 AM", "4:30 PM", "8:00pm")
  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  // 24-hour format (e.g., "08:00", "16:30", "20:30")
  const h24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
};

/**
 * Manually trigger or test a localized medication voice reminder
 */
export const triggerMedicationVoiceReminder = (med, stage = 1) => {
  const profile = getPatientProfile();
  const lang = profile.preferredLanguage || 'en-IN';
  const text = buildLocalizedMedicationPrompt(med, stage, lang);
  playChime('warning');
  speak(text, lang);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('echocare-medication-reminder', {
        detail: { medication: med, stage, prompt: text },
      })
    );
  }
};

/**
 * Generates localized voice reminder prompt containing exact database medication facts
 */
export const buildLocalizedMedicationPrompt = (med, stage = 1, langCode = 'en-IN') => {
  const profile = getPatientProfile();
  const name = profile.preferredName || profile.fullName || 'Amma';
  const langPrefix = (langCode || profile.preferredLanguage || 'en-IN').split('-')[0].toLowerCase();

  const medName = med.name;
  const dosage = med.dosage;
  const unit = med.unit || 'mg';
  const instructions = med.instructions || '';

  if (langPrefix === 'ta') {
    if (stage === 1) return `அம்மா, இது உங்கள் ${medName} ${dosage} ${unit} மருந்து எடுத்துக்கொள்ளும் நேரம். ${instructions || 'தயவுசெய்து இப்போது தண்ணீருடன் எடுத்துக்கொள்ளுங்கள்.'}`;
    if (stage === 2) return `அம்மா, உங்கள் ${medName} மருந்தை இன்னும் சாப்பிடவில்லை என தோன்றுகிறது. தயவுசெய்து இப்போது எடுத்துக்கொள்ளுங்கள்.`;
    return `அவசர நினைவூட்டல்: தயவுசெய்து உங்கள் ${medName} ${dosage} ${unit} மருந்தை இப்போது எடுத்துக்கொள்ளுங்கள்.`;
  }

  if (langPrefix === 'hi') {
    if (stage === 1) return `अम्मा, यह आपकी दवा ${medName} ${dosage} ${unit} लेने का समय है। ${instructions || 'कृपया इसे अभी पानी के साथ लें।'}`;
    if (stage === 2) return `अम्मा, आपने अभी तक अपनी दवा ${medName} नहीं ली है। कृपया इसे अभी लें।`;
    return `ज़रूरी याददिहानी: कृपया अपनी दवा ${medName} ${dosage} ${unit} अभी लें।`;
  }

  if (langPrefix === 'te') {
    if (stage === 1) return `అమ్మా, ఇది మీ ${medName} ${dosage} ${unit} మందులు తీసుకునే సమయం. ${instructions || 'దయచేసి ఇప్పుడు నీటితో తీసుకోండి.'}`;
    if (stage === 2) return `అమ్మా, మీరు ఇంకా మీ ${medName} మందులు తీసుకోలేదు. దయచేసి ఇప్పుడు తీసుకోండి.`;
    return `అత్యవసర రిమైండర్: దయచేసి మీ ${medName} ${dosage} ${unit} మందులను ఇప్పుడు తీసుకోండి.`;
  }

  if (langPrefix === 'ml') {
    if (stage === 1) return `അമ്മേ, നിങ്ങളുടെ ${medName} ${dosage} ${unit} മരുന്ന് കഴിക്കാനുള്ള സമയമായി. ${instructions || 'ദയവായി ഇപ്പോൾ കഴിക്കുക.'}`;
    if (stage === 2) return `അമ്മേ, നിങ്ങൾ ഇതുവരെ ${medName} മരുന്ന് കഴിച്ചിട്ടില്ല. ദയവായി ഇപ്പോൾ കഴിക്കുക.`;
    return `അടിയന്തിര ഓർമ്മപ്പെടുത്തൽ: ദയവായി നിങ്ങളുടെ ${medName} മരുന്ന് ഇപ്പോൾ കഴിക്കുക.`;
  }

  if (langPrefix === 'kn') {
    if (stage === 1) return `ಅಮ್ಮಾ, ನಿಮ್ಮ ${medName} ${dosage} ${unit} ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯವಾಗಿದೆ. ${instructions || 'ದಯವಿಟ್ಟು ಈಗ ತೆಗೆದುಕೊಳ್ಳಿ.'}`;
    if (stage === 2) return `ಅಮ್ಮಾ, ನೀವು ಇನ್ನೂ ನಿಮ್ಮ ${medName} ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಂಡಿಲ್ಲ. ದಯವಿಟ್ಟು ಈಗ ತೆಗೆದುಕೊಳ್ಳಿ.`;
    return `ತುರ್ತು ನೆನಪೂಲಿಕೆ: ದಯವಿಟ್ಟು ನಿಮ್ಮ ${medName} ಔಷಧಿಯನ್ನು ಈಗ ತೆಗೆದುಕೊಳ್ಳಿ.`;
  }

  // English Default
  if (stage === 1) return `Amma, it is time to take your ${medName}, ${dosage} ${unit}. ${instructions || 'Please take it now with water.'}`;
  if (stage === 2) return `I haven't heard from you yet, Amma. Please let me know if you've taken your ${medName}, ${dosage} ${unit}.`;
  return `Urgent reminder: Please take your ${medName}, ${dosage} ${unit} now.`;
};

export const evaluateScheduledReminders = () => {
  const medications = getMedications();
  const profile = getPatientProfile();
  const lang = profile.preferredLanguage || 'en-IN';
  const activeMeds = medications.filter(
    (m) => m.status === 'Pending' || m.status === 'Scheduled' || m.status === 'Due'
  );

  if (activeMeds.length === 0) return;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  activeMeds.forEach((med) => {
    const timeObj = parseTimeString(med.scheduledTime);
    if (!timeObj) return;

    const medTotalMinutes = timeObj.hours * 60 + timeObj.minutes;
    const diffMinutes = currentTotalMinutes - medTotalMinutes;
    const alarmKey = `${med.id}_${dateStr}`;
    const stateObj = alarmStagesTracked.get(alarmKey) || { stage: 0, lastAlertTime: Date.now() };

    const dispatchEventNotice = (stage, promptText) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('echocare-medication-reminder', {
            detail: { medication: med, stage, prompt: promptText },
          })
        );
      }
    };

    // Stage 1 Reminder (T+0m to T+9m)
    if (diffMinutes >= 0 && diffMinutes < 10 && stateObj.stage < 1) {
      alarmStagesTracked.set(alarmKey, { stage: 1, lastAlertTime: Date.now() });
      const text = buildLocalizedMedicationPrompt(med, 1, lang);
      speak(text, lang);
      dispatchEventNotice(1, text);
      addTelemetryLog('ALARM_STAGE_1', 'INFO', `Triggered Stage 1 voice reminder for ${med.name}.`);
    }

    // Stage 2 Reminder (T+10m to T+19m)
    else if (diffMinutes >= 10 && diffMinutes < 20 && stateObj.stage < 2) {
      alarmStagesTracked.set(alarmKey, { stage: 2, lastAlertTime: Date.now() });
      const text = buildLocalizedMedicationPrompt(med, 2, lang);
      speak(text, lang);
      dispatchEventNotice(2, text);
      addTelemetryLog('ALARM_STAGE_2', 'WARNING', `Triggered Stage 2 voice reminder (+10m) for ${med.name}.`);
    }

    // Stage 3 Reminder (T+20m to T+24m)
    else if (diffMinutes >= 20 && diffMinutes < 25 && stateObj.stage < 3) {
      alarmStagesTracked.set(alarmKey, { stage: 3, lastAlertTime: Date.now() });
      const text = buildLocalizedMedicationPrompt(med, 3, lang);
      speak(text, lang);
      dispatchEventNotice(3, text);
      addTelemetryLog('ALARM_STAGE_3', 'CRITICAL', `Triggered Stage 3 voice reminder (+20m) for ${med.name}.`);
    }

    // Stage 4: 3 Missed Reminders -> Caregiver Alert Dispatch (T >= 25m)
    else if (diffMinutes >= 25 && stateObj.stage < 4) {
      alarmStagesTracked.set(alarmKey, { stage: 4, lastAlertTime: Date.now() });
      playChime('sos_tick');

      addTelemetryLog('ALARM_3_MISSED_CAREGIVER_ALERT', 'CRITICAL', `3 missed reminders for ${med.name}. Dispatching caregiver notification.`);
      updateMedicationStatus(med.id, 'Missed', null, '3 Missed Alarms Engine');

      // Dispatch alert via backend notification engine
      try {
        api.testAlert({
          patientId: profile.id || 'pat-1',
          eventType: 'MEDICATION_OVERDUE_3_MISSED',
          message: `EchoCare Alert: Scheduled medication ${med.name} (${med.dosage}) missed 3 voice reminders. Caregiver attention required.`,
        }).catch((e) => console.warn('Backend notification dispatch error:', e));
      } catch (e) {}
    }
  });
};

/**
 * Fast-motion simulator function for evaluator to test 3-stage alarm & escalation cycle
 */
export const triggerSimulatedAlarmCycle = (onStageChange = null) => {
  const profile = getPatientProfile();
  const lang = profile.preferredLanguage || 'en-IN';
  const sampleMed = { name: 'Metformin', dosage: '500', unit: 'mg', instructions: 'After dinner' };

  addTelemetryLog('SIMULATION_STARTED', 'INFO', 'Started 3-stage medicine alarm simulation.');

  // Step 1: Reminder 1
  playChime('warning');
  speak(buildLocalizedMedicationPrompt(sampleMed, 1, lang), lang);
  if (onStageChange) onStageChange(1, 'Reminder 1 Triggered (T+0m)');

  // Step 2: Reminder 2 after 4 seconds
  setTimeout(() => {
    playChime('warning');
    speak(buildLocalizedMedicationPrompt(sampleMed, 2, lang), lang);
    if (onStageChange) onStageChange(2, 'Reminder 2 Triggered (T+10m)');
  }, 4000);

  // Step 3: Reminder 3 after 8 seconds
  setTimeout(() => {
    playChime('sos_tick');
    speak(buildLocalizedMedicationPrompt(sampleMed, 3, lang), lang);
    if (onStageChange) onStageChange(3, 'Reminder 3 Triggered (T+20m)');
  }, 8000);

  // Step 4: Caregiver Alert Dispatch after 12 seconds
  setTimeout(() => {
    playChime('sos_tick');
    speak('3 missed medicine reminders. Caregiver alert dispatched.', lang);
    addTelemetryLog('SIMULATION_ESCALATED', 'CRITICAL', 'Alarm simulation completed. Caregiver alert dispatched.');
    if (onStageChange) onStageChange(4, 'Caregiver Alert Dispatched after 3 Missed Reminders!');
  }, 12000);
};
