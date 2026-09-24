import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, Clock, Trash2, AlertCircle, Edit2, X, Play, ShieldAlert, History, RefreshCw } from 'lucide-react';
import { getMedications, addMedication, updateMedication, deleteMedication, updateMedicationStatus, subscribeToStorage } from '../../services/storage';
import { api } from '../../services/api';
import { triggerSimulatedAlarmCycle, evaluateScheduledReminders } from '../../services/reminderEngine';

export const MedicationScheduleManager = () => {
  const [medications, setMedications] = useState(getMedications());
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Development Test Mode state
  const [testSimStatus, setTestSimStatus] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('05:00 PM');
  const [frequency, setFrequency] = useState('Daily');
  const [instructions, setInstructions] = useState('After dinner');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [reminder1Interval, setReminder1Interval] = useState(0);
  const [reminder2Interval, setReminder2Interval] = useState(10);
  const [reminder3Interval, setReminder3Interval] = useState(10);
  const [escalationDelay, setEscalationDelay] = useState(5);

  const fetchTimeline = async () => {
    try {
      const res = await api.getMedicationsTimeline();
      if (res && res.success && res.events) {
        setTimelineEvents(res.events);
      }
    } catch (e) {
      console.warn('Failed to fetch medication timeline:', e);
    }
  };

  useEffect(() => {
    fetchTimeline();
    const unsub = subscribeToStorage(() => {
      setMedications(getMedications());
      fetchTimeline();
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setName('');
    setDosage('');
    setScheduledTime('05:00 PM');
    setFrequency('Daily');
    setInstructions('After dinner');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setReminder1Interval(0);
    setReminder2Interval(10);
    setReminder3Interval(10);
    setEscalationDelay(5);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (med) => {
    setEditingId(med.id);
    setName(med.name || '');
    setDosage(med.dosage || '');
    setScheduledTime(med.scheduledTime || med.scheduled_time || '05:00 PM');
    setFrequency(med.frequency || 'Daily');
    setInstructions(med.instructions || '');
    setStartDate(med.startDate || med.start_date || new Date().toISOString().split('T')[0]);
    setEndDate(med.endDate || med.end_date || '');
    setReminder1Interval(med.reminder1Interval || med.reminder1_interval || 0);
    setReminder2Interval(med.reminder2Interval || med.reminder2_interval || 10);
    setReminder3Interval(med.reminder3Interval || med.reminder3_interval || 10);
    setEscalationDelay(med.escalationDelay || med.escalation_delay || 5);
    setIsAdding(true);
  };

  const handleStatusToggle = (medId, currentStatus) => {
    const nextStatus = currentStatus === 'Verified' ? 'Pending' : 'Verified';
    const updated = updateMedicationStatus(medId, nextStatus);
    setMedications(updated);
    fetchTimeline();
  };

  const handleDelete = (id) => {
    if (confirm('Delete this medication schedule?')) {
      deleteMedication(id);
      fetchTimeline();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || !scheduledTime.trim()) {
      alert('Please fill out Medicine Name, Dosage, and Scheduled Time.');
      return;
    }

    const payload = {
      name: name.trim(),
      dosage: dosage.trim(),
      scheduled_time: scheduledTime.trim(),
      scheduledTime: scheduledTime.trim(),
      frequency,
      instructions: instructions.trim() || 'Take 1 tablet after meal.',
      start_date: startDate,
      end_date: endDate || null,
      reminder1_interval: parseInt(reminder1Interval, 10) || 0,
      reminder2_interval: parseInt(reminder2Interval, 10) || 10,
      reminder3_interval: parseInt(reminder3Interval, 10) || 10,
      escalation_delay: parseInt(escalationDelay, 10) || 5,
    };

    if (editingId) {
      updateMedication(editingId, payload);
    } else {
      addMedication({
        id: 'med-' + Date.now(),
        ...payload,
        status: 'Pending',
        verifiedAt: null,
      });
    }

    // Also persist via API backend
    try {
      await api.addMedication(payload);
    } catch (e) {}

    resetForm();
    fetchTimeline();
    setTimeout(() => {
      evaluateScheduledReminders();
    }, 200);
  };

  // Accelerated Development / Test Mode Simulation
  const handleRunDevTest = async () => {
    setIsSimulating(true);
    setTestSimStatus('Initiating Development Test Mode...');

    // Call backend API test simulation
    try {
      await api.runTestSimulation('pat-1', name.trim() || 'Metformin 500mg');
    } catch (e) {}

    // Run client voice chime simulation
    triggerSimulatedAlarmCycle((stage, msg) => {
      setTestSimStatus(`[Stage ${stage}/4] ${msg}`);
      if (stage === 4) {
        setTimeout(() => setIsSimulating(false), 2000);
      }
      fetchTimeline();
    });
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-3xl font-extrabold flex items-center gap-3">
            <Pill className="w-8 h-8 text-emerald-400" />
            Medication Schedule & Multi-Stage Reminders
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            Configure exact manual times, localized voice prompts, 3-reminder intervals, and caregiver escalation rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isAdding) resetForm();
              else setIsAdding(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            {isAdding ? 'Close Schedule Form' : 'Add New Medication'}
          </button>
        </div>
      </div>

      {/* DEVELOPMENT / TEST MODE BANNER */}
      <div className="bg-amber-950/80 border-2 border-amber-500/60 p-5 rounded-3xl space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">
                DEVELOPMENT / TEST MODE
              </span>
              <h4 className="text-lg font-bold text-white">Accelerated 3-Stage Reminder & Escalation Test Engine</h4>
            </div>
          </div>
          <button
            onClick={handleRunDevTest}
            disabled={isSimulating}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            {isSimulating ? 'Running Simulation...' : 'Run Test Schedule (T+1m Cycle)'}
          </button>
        </div>
        {testSimStatus && (
          <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-2xl text-xs font-mono text-amber-300 flex items-center justify-between">
            <span>{testSimStatus}</span>
            <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          </div>
        )}
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <form onSubmit={handleFormSubmit} className="bg-slate-900 border-2 border-emerald-500/50 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-2xl font-black text-white flex items-center gap-2">
              <Pill className="w-6 h-6 text-emerald-400" />
              {editingId ? 'Edit Medication Schedule' : 'Add New Medication Schedule'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Medicine Name *</label>
              <input
                type="text"
                placeholder="e.g. Metformin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Dosage *</label>
              <input
                type="text"
                placeholder="e.g. 500 mg"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2 col-span-1 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Exact Medication Time * (Hour, Minute & AM/PM Selector)
              </label>
              
              <div className="grid grid-cols-4 gap-2">
                {/* Hour (1 - 12) */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Hour</span>
                  <select
                    value={(() => {
                      const m = (scheduledTime || '').match(/^(\d{1,2}):/);
                      return m ? String(parseInt(m[1], 10)).padStart(2, '0') : '05';
                    })()}
                    onChange={(e) => {
                      const m = (scheduledTime || '05:00 PM').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                      const min = m ? m[2] : '00';
                      const ampm = m ? m[3] : 'PM';
                      setScheduledTime(`${e.target.value}:${min} ${ampm}`);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Minute (00 - 59) */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Minute (00-59)</span>
                  <select
                    value={(() => {
                      const m = (scheduledTime || '').match(/:(\d{2})/);
                      return m ? m[1] : '00';
                    })()}
                    onChange={(e) => {
                      const m = (scheduledTime || '05:00 PM').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                      const hr = m ? String(parseInt(m[1], 10)).padStart(2, '0') : '05';
                      const ampm = m ? m[3] : 'PM';
                      setScheduledTime(`${hr}:${e.target.value} ${ampm}`);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((min) => (
                      <option key={min} value={min}>{min}</option>
                    ))}
                  </select>
                </div>

                {/* AM / PM */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">AM / PM</span>
                  <select
                    value={(() => {
                      const m = (scheduledTime || '').match(/(AM|PM)$/i);
                      return m ? m[1].toUpperCase() : 'PM';
                    })()}
                    onChange={(e) => {
                      const m = (scheduledTime || '05:00 PM').match(/^(\d{1,2}):(\d{2})/);
                      const hr = m ? String(parseInt(m[1], 10)).padStart(2, '0') : '05';
                      const min = m ? m[2] : '00';
                      setScheduledTime(`${hr}:${min} ${e.target.value}`);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                {/* Direct Exact Time Display & Input */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Exact Time</span>
                  <input
                    type="text"
                    placeholder="e.g. 10:37 AM"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-emerald-500/60 rounded-xl text-white font-bold text-sm"
                  />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Full control over every hour (01-12), minute (00-59), and AM/PM for any exact prescription dose.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Every day">Every day</option>
                <option value="Daily">Daily</option>
                <option value="Twice Daily">Twice Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="As Needed">As Needed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Instructions for Echo Spoken Voice</label>
              <input
                type="text"
                placeholder="e.g. Please take it after your meal."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* 3-Reminder & Escalation Configuration */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              Configured Escalation Pipeline (3 Reminders + Caregiver Alert Delay)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 block mb-1">Reminder #1</span>
                <span className="text-emerald-300 font-bold">At {scheduledTime || 'Exact Time'}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 block mb-1">Reminder #2</span>
                <span className="text-emerald-300 font-bold">10 mins after Reminder 1</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 block mb-1">Reminder #3</span>
                <span className="text-amber-300 font-bold">10 mins after Reminder 2</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-slate-400 block mb-1">Caregiver Escalation</span>
                <span className="text-red-400 font-bold">5 mins after Reminder 3</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg"
            >
              Save Medication Schedule
            </button>
          </div>
        </form>
      )}

      {/* Medication Roster */}
      {medications.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          No medications scheduled. Click "Add New Medication" to configure a prescription schedule.
        </div>
      ) : (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-xs text-slate-400 uppercase tracking-widest grid grid-cols-12 gap-4">
            <div className="col-span-4">Medication & Dosage</div>
            <div className="col-span-4">Scheduled Time & Escalation Rules</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-800">
            {medications.map((med) => (
              <div key={med.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-800/40 transition-all">
                <div className="col-span-4">
                  <h4 className="text-xl font-bold text-white">{med.name}</h4>
                  <p className="text-sm font-semibold text-emerald-400">{med.dosage} ({med.frequency || 'Every day'})</p>
                </div>

                <div className="col-span-4">
                  <div className="flex items-center gap-1.5 text-slate-200 text-sm font-extrabold">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    {med.scheduledTime || med.scheduled_time}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{med.instructions}</p>
                </div>

                <div className="col-span-2">
                  <button
                    onClick={() => handleStatusToggle(med.id, med.status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                      med.status === 'Verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {med.status === 'Verified' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Taken
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Pending
                      </>
                    )}
                  </button>
                </div>

                <div className="col-span-2 text-right flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleEdit(med)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title="Edit Schedule"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800"
                    title="Delete Schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEDICATION EVENT OCCURRENCE TIMELINE LOG */}
      <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Medication Event Occurrence Timeline Log
          </h4>
          <button onClick={fetchTimeline} className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Log
          </button>
        </div>

        {timelineEvents.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No medication occurrence events recorded yet today.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Medication</th>
                  <th className="p-3">Scheduled</th>
                  <th className="p-3">Reminder #1</th>
                  <th className="p-3">Reminder #2</th>
                  <th className="p-3">Reminder #3</th>
                  <th className="p-3">Escalated</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {timelineEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{evt.medication_name || 'Medication'} ({evt.dosage || ''})</td>
                    <td className="p-3">{evt.scheduled_time || evt.scheduled_for}</td>
                    <td className="p-3">{evt.reminder_1_sent_at || '—'}</td>
                    <td className="p-3">{evt.reminder_2_sent_at || '—'}</td>
                    <td className="p-3">{evt.reminder_3_sent_at || '—'}</td>
                    <td className="p-3">{evt.escalated_at ? <span className="text-red-400 font-bold">{evt.escalated_at}</span> : '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                        evt.state === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        evt.state === 'CAREGIVER_ESCALATION' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {evt.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
