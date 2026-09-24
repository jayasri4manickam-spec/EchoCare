import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Terminal, Phone, BellRing } from 'lucide-react';
import { getTelemetryLogs } from '../../services/storage';
import {
  getWatchdogStatus,
  subscribeToWatchdog,
  triggerSimulatedEscalation,
  resetWatchdogState,
} from '../../services/watchdogTimer';

export const SafetyTelemetryLog = () => {
  const [watchdogStatus, setWatchdogStatus] = useState(getWatchdogStatus());
  const [logs, setLogs] = useState(getTelemetryLogs());

  useEffect(() => {
    const unsub = subscribeToWatchdog((status) => {
      setWatchdogStatus(status);
      setLogs(getTelemetryLogs());
    });
    return unsub;
  }, []);

  const handleSimulatePing = () => {
    triggerSimulatedEscalation('Pending Caregiver Ping');
    setLogs(getTelemetryLogs());
  };

  const handleSimulateCritical = () => {
    triggerSimulatedEscalation('Critical Alert');
    setLogs(getTelemetryLogs());
  };

  const handleResetState = () => {
    resetWatchdogState();
    setLogs(getTelemetryLogs());
  };

  return (
    <div className="space-y-6 text-white">
      {/* Active Watchdog Status Card */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-3xl border-2 ${
              watchdogStatus.state === 'Critical Alert'
                ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                : watchdogStatus.state === 'Pending Caregiver Ping'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
            }`}
          >
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Automated Watchdog Safety Monitor
            </span>
            <h3 className="text-3xl font-black text-white">
              Current State:{' '}
              <span
                className={
                  watchdogStatus.state === 'Critical Alert'
                    ? 'text-red-400'
                    : watchdogStatus.state === 'Pending Caregiver Ping'
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }
              >
                {watchdogStatus.state}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Last checked at {watchdogStatus.lastChecked} • Room Companion Sensors Active
            </p>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulatePing}
            className="px-4 py-2.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 flex items-center gap-2"
          >
            <BellRing className="w-4 h-4" />
            Simulate Caregiver Ping
          </button>
          <button
            onClick={handleSimulateCritical}
            className="px-4 py-2.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 font-bold text-xs rounded-xl border border-red-500/40 flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Simulate Critical Alert
          </button>
          <button
            onClick={handleResetState}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset State to Normal
          </button>
        </div>
      </div>

      {/* Mock Twilio Webhook Dispatch Inspector */}
      {watchdogStatus.lastTwilioPayload && (
        <div className="bg-slate-950 border-2 border-red-500/60 p-6 rounded-3xl shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  Mock Twilio Telemetry Webhook Payload Dispatched
                </h4>
                <p className="text-xs text-slate-400">REST API SMS & Voice Call Dispatch JSON</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-500/20 text-red-300 font-mono text-xs rounded-lg border border-red-500/40">
              HTTP 200 OK (SIMULATED)
            </span>
          </div>

          <pre className="p-4 bg-slate-900 rounded-2xl text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto leading-relaxed">
            {JSON.stringify(watchdogStatus.lastTwilioPayload, null, 2)}
          </pre>
        </div>
      )}

      {/* Historical Telemetry Logs Table */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h4 className="text-xl font-bold text-white">Chronological Safety & Telemetry Logs</h4>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                log.level === 'CRITICAL'
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : log.level === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : log.level === 'SUCCESS'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                    {log.timestamp}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">{log.type}</span>
                </div>
                <p className="text-base font-semibold">{log.message}</p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                  log.level === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {log.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
