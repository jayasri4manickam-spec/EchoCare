import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Pill,
  ShieldAlert,
  Heart,
  ArrowLeft,
  Settings,
  Database,
  Trash2,
  Moon,
  Sun,
  Sparkles,
  Mic,
  Calendar,
  FileText,
  Lock,
  Activity,
} from 'lucide-react';
import { CaregiverOverviewTab } from './CaregiverOverviewTab';
import { PatientProfileEditor } from './PatientProfileEditor';
import { MedicationScheduleManager } from './MedicationScheduleManager';
import { CaregiverVoiceObservationTab } from './CaregiverVoiceObservationTab';
import { LongitudinalCareTimelineTab } from './LongitudinalCareTimelineTab';
import { ShiftHandoverTab } from './ShiftHandoverTab';
import { CaregiverDirectoryManager } from './CaregiverDirectoryManager';
import { FaceRegistryManager } from './FaceRegistryManager';
import { ConsentPrivacyCenterTab } from './ConsentPrivacyCenterTab';
import { CaregiverWellbeingTab } from './CaregiverWellbeingTab';
import { SafetyTelemetryLog } from './SafetyTelemetryLog';
import { DatabaseConfigTab } from './DatabaseConfigTab';

import {
  getCaregivers,
  getMedications,
  loadDemoData,
  clearAllData,
  getAppSettings,
  saveAppSettings,
  subscribeToStorage,
} from '../../services/storage';
import { triggerSimulatedAlarmCycle } from '../../services/reminderEngine';
import {
  subscribeToEmergencyService,
  acknowledgeEmergencyWorkflow,
  resolveEmergencyWorkflow,
  triggerEmergencyWorkflow,
} from '../../services/emergencyService';

export const CaregiverDashboard = ({ onBackToPatientMode }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [caregiversCount, setCaregiversCount] = useState(getCaregivers().length);
  const [medsCount, setMedsCount] = useState(getMedications().length);
  const [appSettings, setAppSettings] = useState(getAppSettings());
  const [emergencyData, setEmergencyData] = useState({ state: 'INACTIVE', activeEvent: null });

  useEffect(() => {
    const unsubStorage = subscribeToStorage(() => {
      setCaregiversCount(getCaregivers().length);
      setMedsCount(getMedications().length);
      setAppSettings(getAppSettings());
    });

    const unsubEmergency = subscribeToEmergencyService((data) => {
      setEmergencyData(data);
    });

    return () => {
      unsubStorage();
      unsubEmergency();
    };
  }, []);

  const handleLoadDemoData = () => {
    if (confirm('Load optional evaluation dataset? This will populate sample profile, memories, medications, and timeline events.')) {
      loadDemoData();
    }
  };

  const handleClearAllData = () => {
    if (confirm('Clear all application state and return to completely empty default state?')) {
      clearAllData();
    }
  };

  const handleToggleDarkMode = () => {
    saveAppSettings({ ...appSettings, darkMode: !appSettings.darkMode });
  };

  const isEmergencyActive = emergencyData.state === 'TRIGGERED' || emergencyData.state === 'ACKNOWLEDGED';

  return (
    <div className="w-full min-h-[calc(100vh-80px)] p-4 sm:p-6 lg:p-10 xl:p-12 bg-slate-950 space-y-6">
      {/* Real-time Emergency Status Banner */}
      {isEmergencyActive ? (
        <div className="p-6 bg-red-950 border-4 border-red-600 rounded-3xl text-white shadow-2xl space-y-4 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-red-500 animate-ping" />
              <h3 className="text-2xl font-black tracking-wide text-red-100 flex items-center gap-2">
                🔴 EMERGENCY ACTIVE
              </h3>
              <span className="px-3 py-1 bg-red-800 text-red-200 text-xs font-bold rounded-full uppercase">
                {emergencyData.state}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {emergencyData.state === 'TRIGGERED' && (
                <button
                  onClick={() => acknowledgeEmergencyWorkflow('Caregiver Admin')}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl shadow-lg transition-all"
                >
                  [ACKNOWLEDGE]
                </button>
              )}
              <button
                onClick={() => resolveEmergencyWorkflow('Caregiver Admin', 'Resolved via Caregiver Dashboard')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg transition-all"
              >
                [RESOLVE]
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-medium">
            <div>
              <span className="text-slate-400 block text-xs uppercase font-bold">Triggered By:</span>
              <span className="font-extrabold text-white">{emergencyData.activeEvent?.source || 'Patient / Caregiver'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase font-bold">Time:</span>
              <span className="font-extrabold text-white">{emergencyData.activeEvent?.timestamp || 'Just now'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase font-bold">Reason:</span>
              <span className="font-extrabold text-white">{emergencyData.activeEvent?.reason || 'Emergency Assistance Triggered'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-3 bg-emerald-950/60 border border-emerald-800/60 rounded-2xl text-emerald-300 font-bold text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            🟢 Emergency system inactive
          </span>
          <span className="text-xs text-slate-400 font-normal">Normal monitoring state</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl shadow-xl text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToPatientMode}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition-all flex items-center gap-2 font-bold text-sm"
            title="Return to Patient Mode"
          >
            <ArrowLeft className="w-5 h-5" />
            Patient Mode
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              EchoCare Caregiver Administration & Care Intelligence
            </h2>
            <p className="text-slate-400 font-medium text-xs sm:text-sm">
              Longitudinal Memory Architecture, Voice Observations, Shift Handover & Safety Telemetry
            </p>
          </div>
        </div>

        {/* Quick Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Roster:</span>
            <span className="text-base font-black text-white">{caregiversCount}</span>
          </div>

          <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Meds:</span>
            <span className="text-base font-black text-white">{medsCount}</span>
          </div>

          {/* WhatsApp Provider Status Badge */}
          <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-amber-800/80 flex items-center gap-2" title="WhatsApp integration not configured">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-400">WhatsApp:</span>
            <span className="text-xs font-extrabold text-amber-300">NOT_CONFIGURED</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b-2 border-slate-800 gap-2 overflow-x-auto pb-2 text-white scrollbar-thin">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Care Summary
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Memory Profile & Stage
        </button>

        <button
          onClick={() => setActiveTab('meds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'meds'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          Medication Schedule
        </button>

        <button
          onClick={() => setActiveTab('observations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'observations'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Mic className="w-4 h-4" />
          Voice Observation
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'timeline'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Care Timeline
        </button>

        <button
          onClick={() => setActiveTab('handover')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'handover'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Shift Handover
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'directory'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Caregiver Roster
        </button>

        <button
          onClick={() => setActiveTab('faces')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'faces'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          Face Roster
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'privacy'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Privacy & Access
        </button>

        <button
          onClick={() => setActiveTab('wellbeing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'wellbeing'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Caregiver Wellbeing
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'telemetry'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Safety Telemetry
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'database'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Database & Storage
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all ${
            activeTab === 'settings'
              ? 'bg-slate-700 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Demo Mode & Settings
        </button>
      </div>

      {/* Active Section Content */}
      <div className="pt-2">
        {activeTab === 'overview' && <CaregiverOverviewTab />}
        {activeTab === 'profile' && <PatientProfileEditor />}
        {activeTab === 'meds' && <MedicationScheduleManager />}
        {activeTab === 'observations' && <CaregiverVoiceObservationTab />}
        {activeTab === 'timeline' && <LongitudinalCareTimelineTab />}
        {activeTab === 'handover' && <ShiftHandoverTab />}
        {activeTab === 'directory' && <CaregiverDirectoryManager />}
        {activeTab === 'faces' && <FaceRegistryManager />}
        {activeTab === 'privacy' && <ConsentPrivacyCenterTab />}
        {activeTab === 'wellbeing' && <CaregiverWellbeingTab />}
        {activeTab === 'telemetry' && <SafetyTelemetryLog />}
        {activeTab === 'database' && <DatabaseConfigTab />}

        {activeTab === 'settings' && (
          <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 text-white shadow-xl">
            <h3 className="text-2xl font-bold border-b border-slate-800 pb-3 flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-400" />
              Demo Mode Controls & Application Settings
            </h3>

            {/* Hackathon Seed Data Loader */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  Hackathon Prototype Seeding (Demo Mode)
                </span>
                <h4 className="text-xl font-bold">Evaluation Dataset Seeding</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Toggle between a clean empty state or populate sample patient memories, caregivers, medications, and timeline events for hackathon demonstration.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleLoadDemoData}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Database className="w-5 h-5" />
                  Load Demo Data (Margaret Miller Profile)
                </button>

                <button
                  onClick={handleClearAllData}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded-xl border border-slate-700 flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All Data to Clean Empty State
                </button>
              </div>
            </div>

            {/* Alarm & Escalation Simulator */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Alarm & SOS Escalation Simulator
                </span>
                <h4 className="text-xl font-bold">3-Stage Medication Voice Alarm & SOS Test</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Simulate proactive medication voice reminders (Alarm 1 at T+0m, Alarm 2 at T+5m, Alarm 3 at T+10m) escalating to Emergency SOS call.
                </p>
              </div>

              <button
                onClick={() => {
                  alert('Starting 3-Stage Medicine Alarm Simulation!');
                  onBackToPatientMode();
                  triggerSimulatedAlarmCycle();
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2"
              >
                <ShieldAlert className="w-5 h-5" />
                Simulate 3-Stage Medication Voice Alarm
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xl font-bold">Caregiver Portal Theme</h4>
                <p className="text-slate-400 text-sm">
                  Toggle dark theme for Caregiver Portal. Patient mode remains in high-accessibility calm ivory.
                </p>
              </div>

              <button
                onClick={handleToggleDarkMode}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center gap-2"
              >
                {appSettings.darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                {appSettings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
