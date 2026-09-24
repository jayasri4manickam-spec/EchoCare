import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit2, Upload, Phone, X } from 'lucide-react';
import { getCaregivers, addCaregiver, updateCaregiver, deleteCaregiver, subscribeToStorage } from '../../services/storage';

export const CaregiverDirectoryManager = () => {
  const [caregivers, setCaregivers] = useState(getCaregivers());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [receiveAlerts, setReceiveAlerts] = useState(true);
  const [primaryContact, setPrimaryContact] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setCaregivers(getCaregivers());
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setName('');
    setRelation('');
    setPhone('');
    setPhotoDataUrl('');
    setMemoryNote('');
    setReceiveAlerts(true);
    setPrimaryContact(false);
    setValidationError('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (person) => {
    setEditingId(person.id);
    setName(person.name || '');
    setRelation(person.relation || '');
    setPhone(person.phone || '');
    setPhotoDataUrl(person.avatar || '');
    setMemoryNote(person.memoryNote || '');
    setReceiveAlerts(person.receiveEmergencyAlerts !== false);
    setPrimaryContact(Boolean(person.primaryContact));
    setIsAdding(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoDataUrl(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !relation.trim() || !phone.trim()) {
      setValidationError('Please fill out Name, Relationship, and Phone Number.');
      return;
    }

    const payload = {
      name: name.trim(),
      relation: relation.trim(),
      phone: phone.trim(),
      avatar: photoDataUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      memoryNote: memoryNote.trim(),
      receiveEmergencyAlerts: receiveAlerts,
      primaryContact: primaryContact,
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      updateCaregiver(editingId, payload);
    } else {
      addCaregiver({
        id: 'rel-' + Date.now(),
        ...payload,
        createdAt: new Date().toISOString(),
        descriptor: null,
        faceColorTag: '#' + Math.floor(Math.random() * 16777215).toString(16),
      });
    }

    resetForm();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteCaregiver(id);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-3xl font-extrabold">Caregiver Directory & Contact Management</h2>
          <p className="text-slate-400">
            Manage authorized caregiver contacts, emergency alert permissions, and personal memory notes.
          </p>
        </div>
        <button
          onClick={() => {
            if (isAdding) resetForm();
            else setIsAdding(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all"
        >
          <UserPlus className="w-5 h-5" />
          {isAdding ? 'Close Form' : 'Add New Contact'}
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border-2 border-blue-500/50 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl animate-in fade-in">
          <h3 className="text-2xl font-bold flex items-center justify-between">
            <span>{editingId ? 'Edit Contact Details' : 'Add New Caregiver / Family Contact'}</span>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </h3>

          {validationError && (
            <div className="p-4 bg-red-500/20 border border-red-500 text-red-300 font-bold rounded-xl text-sm">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Ramaswamy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Relationship *</label>
                <input
                  type="text"
                  placeholder="e.g. Daughter, Grandson, Nurse"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-300 mb-1">
                  Contextual Memory Note (Spoken to patient on recognition)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Visits every Sunday and usually brings homemade food."
                  value={memoryNote}
                  onChange={(e) => setMemoryNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>
            </div>

            {/* Photo & Permissions Column */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Photo Preview */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">Contact Photo</label>
                <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <img
                    src={photoDataUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'}
                    alt="Contact Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-400"
                  />
                  <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiveAlerts}
                    onChange={(e) => setReceiveAlerts(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded"
                  />
                  <span className="text-sm font-bold text-slate-200">Receive Emergency SOS Alerts</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primaryContact}
                    onChange={(e) => setPrimaryContact(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded"
                  />
                  <span className="text-sm font-bold text-amber-300">Designate as Primary Emergency Contact</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg"
                >
                  Save Contact
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Directory Grid */}
      {caregivers.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          No caregiver contacts added yet. Click "Add New Contact" to register family members.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caregivers.map((person) => (
            <div
              key={person.id}
              className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start gap-4">
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-400"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-white">{person.name}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(person)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-blue-400 font-semibold text-sm">{person.relation}</p>
                  <p className="text-slate-400 text-xs font-mono flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-slate-500" /> {person.phone}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {person.primaryContact && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded border border-amber-500/40">
                        Primary
                      </span>
                    )}
                    {person.receiveEmergencyAlerts && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 font-bold text-xs rounded border border-red-500/40">
                        SOS Alerts
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {person.memoryNote && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    Memory Note
                  </span>
                  <p className="text-sm font-medium text-slate-300">"{person.memoryNote}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
