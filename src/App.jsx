import React, { useState, useEffect } from 'react';
import { HeaderNav } from './components/common/HeaderNav';
import { PatientHomeView } from './components/patient/PatientHomeView';
import { MedicinesPage } from './components/patient/MedicinesPage';
import { MemoriesPage } from './components/patient/MemoriesPage';
import { EmergencyPage } from './components/patient/EmergencyPage';
import { PatientProfilePage } from './components/patient/PatientProfilePage';
import { VisitorRecognitionModal } from './components/patient/VisitorRecognitionModal';
import { PillScannerModal } from './components/patient/PillScannerModal';
import { MedicationReminderModal } from './components/patient/MedicationReminderModal';
import { CaregiverDashboard } from './components/caregiver/CaregiverDashboard';
import { getWatchdogStatus, startWatchdogTimer, subscribeToWatchdog } from './services/watchdogTimer';
import { startReminderEngine, stopReminderEngine, evaluateScheduledReminders } from './services/reminderEngine';
import { getMedications, subscribeToStorage, getPatientProfile } from './services/storage';
import { unlockBrowserAudio, playChime } from './services/speechTTS';
import { speak } from './services/voiceEngine';
import { api } from './services/api';
import { resetEmergencyStateOnStartup } from './services/emergencyService';

export function App() {
  const [activeMode, setActiveMode] = useState('patient'); // 'patient' | 'caregiver'
  const [patientPage, setPatientPage] = useState('home'); // 'home' | 'medicines' | 'memories' | 'emergency' | 'me'
  const [highContrast, setHighContrast] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [watchdogStatus, setWatchdogStatus] = useState(getWatchdogStatus());

  // Modal explicit triggers (Camera remains OFF until these modals open!)
  const [isVisitorScannerOpen, setIsVisitorScannerOpen] = useState(false);
  const [isPillScannerOpen, setIsPillScannerOpen] = useState(false);
  const [reminderModalData, setReminderModalData] = useState(null);
  const [medications, setMedications] = useState(getMedications());

  // Initialize automated background engines & browser audio unlocker
  useEffect(() => {
    resetEmergencyStateOnStartup();
    startWatchdogTimer();
    startReminderEngine();

    // Global Browser Audio Gesture Unlocker
    const unlockAudio = () => {
      unlockBrowserAudio();
    };

    window.addEventListener('click', unlockAudio, { once: false });
    window.addEventListener('touchstart', unlockAudio, { once: false });

    const unsubWatchdog = subscribeToWatchdog((status) => {
      setWatchdogStatus(status);
    });

    const unsubStorage = subscribeToStorage(() => {
      setMedications(getMedications());
    });

    // Voice Navigation Custom Event listener
    const handleVoiceNav = (e) => {
      if (e.detail && e.detail.page) {
        setPatientPage(e.detail.page);
      }
    };
    window.addEventListener('echocare-voice-nav', handleVoiceNav);

    // Medicine Voice Reminder Modal Event Listener
    const handleMedReminder = (e) => {
      if (e.detail && e.detail.medication) {
        setReminderModalData(e.detail);
      }
    };
    window.addEventListener('echocare-medication-reminder', handleMedReminder);

    // Real-time backend event stream listener for automatic spoken medication reminders
    const unsubSSE = api.subscribeEventStream((event) => {
      console.log('📡 [SSE Stream] Event received on frontend:', event);
      if (
        event.type === 'PROACTIVE_REMINDER' ||
        event.type === 'MEDICATION_REMINDER' ||
        event.type === 'ALARM_STAGE_1' ||
        event.type === 'ALARM_STAGE_2' ||
        event.type === 'ALARM_STAGE_3'
      ) {
        const payload = event.payload || event.data || {};
        const profile = getPatientProfile();
        const lang = profile.preferredLanguage || 'en-IN';
        const spokenMsg =
          payload.message || `Amma, it is time to take your medication ${payload.medicationId || ''}. Please take it now.`;

        playChime('warning');
        speak(spokenMsg, lang);

        setReminderModalData({
          medication: { name: payload.medicationId || 'Scheduled Medicine', dosage: '', scheduledTime: 'Now' },
          stage: payload.stage || 1,
          prompt: spokenMsg,
        });
      }
    });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      unsubWatchdog();
      unsubStorage();
      unsubSSE();
      stopReminderEngine();
      window.removeEventListener('echocare-voice-nav', handleVoiceNav);
      window.removeEventListener('echocare-medication-reminder', handleMedReminder);
    };
  }, []);

  const pendingMeds = medications.filter((m) => m.status === 'Pending');

  return (
    <div className={`min-h-screen bg-[#E5EFE8] text-slate-900 font-sans ${highContrast ? 'theme-high-contrast' : ''}`}>
      {/* Universal Full Screen Header Bar */}
      <HeaderNav
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        patientPage={patientPage}
        setPatientPage={setPatientPage}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        watchdogState={watchdogStatus.state}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
      />

      {/* Primary Full Screen Content Container */}
      <main className="w-full min-h-[calc(100vh-64px)]">
        {activeMode === 'patient' ? (
          <>
            {patientPage === 'home' && (
              <PatientHomeView
                onNavigate={(page) => setPatientPage(page)}
                onOpenVisitorScanner={() => setIsVisitorScannerOpen(true)}
              />
            )}
            {patientPage === 'medicines' && (
              <MedicinesPage
                onBackHome={() => setPatientPage('home')}
                onOpenScanner={() => setIsPillScannerOpen(true)}
              />
            )}
            {patientPage === 'memories' && (
              <MemoriesPage
                onBackHome={() => setPatientPage('home')}
                onOpenVisitorScanner={() => setIsVisitorScannerOpen(true)}
              />
            )}
            {patientPage === 'emergency' && (
              <EmergencyPage onBackHome={() => setPatientPage('home')} />
            )}
            {patientPage === 'me' && (
              <PatientProfilePage onBackHome={() => setPatientPage('home')} />
            )}
          </>
        ) : (
          <CaregiverDashboard onBackToPatientMode={() => setActiveMode('patient')} />
        )}
      </main>

      {/* Explicit On-Demand Camera Feature Modals */}
      <VisitorRecognitionModal
        isOpen={isVisitorScannerOpen}
        onClose={() => setIsVisitorScannerOpen(false)}
      />

      <PillScannerModal
        isOpen={isPillScannerOpen}
        onClose={() => setIsPillScannerOpen(false)}
        pendingMedications={pendingMeds}
      />

      {/* Medicine Time Voice Reminder Alert Modal */}
      {reminderModalData && (
        <MedicationReminderModal
          reminderData={reminderModalData}
          onClose={() => setReminderModalData(null)}
        />
      )}
    </div>
  );
}

export default App;
