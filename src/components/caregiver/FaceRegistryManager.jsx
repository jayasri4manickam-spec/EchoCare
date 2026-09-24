import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, Upload, Trash2, Heart, Sparkles, Check, Phone, ShieldCheck } from 'lucide-react';
import { getCaregivers, addCaregiver, deleteCaregiver, subscribeToStorage } from '../../services/storage';
import { getFaceDescriptor } from '../../services/faceRecognition';

export const FaceRegistryManager = () => {
  const [caregivers, setCaregivers] = useState(getCaregivers());
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [phone, setPhone] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [descriptors, setDescriptors] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToStorage(() => {
      setCaregivers(getCaregivers());
    });
    return unsub;
  }, []);

  // Handle live webcam capture lifecycle
  useEffect(() => {
    let activeStream = null;

    if (!isCapturing) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        alert('Could not access webcam for face enrollment.');
        setIsCapturing(false);
      }
    };

    startWebcam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isCapturing]);

  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhotoDataUrl(dataUrl);

    // Extract face descriptor
    const desc = await getFaceDescriptor(canvas);
    setDescriptors(desc);

    // Stop webcam
    setIsCapturing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      setPhotoDataUrl(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        const desc = await getFaceDescriptor(img);
        setDescriptors(desc);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !relation) {
      alert('Please fill out Name and Relationship.');
      return;
    }

    const newRelative = {
      id: 'rel-' + Date.now(),
      name,
      relation,
      lastVisited: 'Just enrolled',
      memoryNote,
      phone: phone || '+1 (555) 000-0000',
      avatar: photoDataUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      descriptor: descriptors,
      receiveEmergencyAlerts: true,
      primaryContact: false,
      faceColorTag: '#' + Math.floor(Math.random() * 16777215).toString(16),
    };

    const updated = addCaregiver(newRelative);
    setCaregivers(updated);

    setName('');
    setRelation('');
    setMemoryNote('');
    setPhone('');
    setPhotoDataUrl('');
    setDescriptors(null);
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this registered face profile?')) {
      deleteCaregiver(id);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-3xl font-extrabold">Face Recognition & Memory Registry</h2>
          <p className="text-slate-400">
            Enrolled faces trigger personal spoken memory whispers when detected by visitor room cameras.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          {isAdding ? 'Close Enrollment' : 'Register New Face'}
        </button>
      </div>

      {/* Enrollment Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border-2 border-blue-500/50 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 animate-in fade-in">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            Register Face & Contextual Memory Note
          </h3>

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
                <label className="block text-sm font-bold text-slate-300 mb-1">Contact Phone</label>
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
                  Memory Whisper Note (Spoken on Recognition)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Brought homemade sambar yesterday and helped water the garden."
                  value={memoryNote}
                  onChange={(e) => setMemoryNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
                />
              </div>
            </div>

            {/* Photo Capture Column */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              {photoDataUrl ? (
                <div className="relative text-center">
                  <img src={photoDataUrl} alt="Preview" className="w-48 h-48 rounded-2xl object-cover border-4 border-blue-400" />
                  <span className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-lg border border-emerald-500/40">
                    <Check className="w-4 h-4" /> Face Descriptor Generated
                  </span>
                </div>
              ) : isCapturing ? (
                <div className="relative w-full h-48 bg-black rounded-2xl overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleTakeSnapshot}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-lg"
                  >
                    Take Snapshot
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-slate-900 rounded-full flex items-center justify-center text-slate-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-slate-300 text-sm font-semibold">
                    Provide a face photo for AI recognition matching
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setIsCapturing(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" /> Live Webcam
                    </button>
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-4 h-4" /> Upload File
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg"
            >
              Register Face Profile
            </button>
          </div>
        </form>
      )}

      {/* Registered Faces Roster */}
      {caregivers.length === 0 ? (
        <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          No registered faces yet. Click "Register New Face" to enroll family members.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caregivers.map((person) => (
            <div
              key={person.id}
              className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-4">
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-white">{person.name}</h4>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-blue-400 font-semibold text-sm">{person.relation}</p>
                </div>
              </div>

              {person.memoryNote && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    Spoken Memory Whisper
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
