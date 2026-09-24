import React, { useState, useRef, useEffect } from 'react';
import { Pill, CheckCircle2, AlertTriangle, X, Camera, ScanText, Volume2, HelpCircle } from 'lucide-react';
import { scanPillImage } from '../../services/pillOCR';
import confetti from 'canvas-confetti';

export const PillScannerModal = ({ isOpen, onClose, pendingMedications }) => {
  const videoRef = useRef(null);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (pendingMedications && pendingMedications.length > 0 && !selectedMedId) {
      setSelectedMedId(pendingMedications[0].id);
    }
  }, [pendingMedications, selectedMedId]);

  // Handle explicit camera stream lifecycle
  useEffect(() => {
    let activeStream = null;

    if (!isOpen) {
      setCameraActive(false);
      setScanResult(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Webcam start error in PillScannerModal:', err);
        setCameraActive(false);
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
  }, [isOpen]);

  if (!isOpen) return null;

  const targetMed = pendingMedications ? pendingMedications.find((m) => m.id === selectedMedId) : null;

  const handleCaptureAndScan = async () => {
    setIsScanning(true);
    setScanResult(null);

    try {
      let imageInput = null;

      if (videoRef.current && cameraActive) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        imageInput = canvas;
      }

      const res = await scanPillImage(imageInput, selectedMedId);
      setScanResult(res);

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('OCR scan exception:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border-4 border-slate-300 rounded-3xl shadow-2xl p-6 sm:p-8 my-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Pill className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">Scan Medicine Bottle</h2>
              <p className="text-slate-600 font-medium text-base">
                Hold your pill bottle or prescription strip up to the camera
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Selected Target Medication Banner */}
        {targetMed && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                Target Scheduled Medication
              </span>
              <h3 className="text-2xl font-bold text-slate-900">
                {targetMed.name} ({targetMed.dosage})
              </h3>
              <p className="text-slate-600 text-sm font-medium">{targetMed.instructions}</p>
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-xl text-sm">
              Due at {targetMed.scheduledTime}
            </div>
          </div>
        )}

        {/* Camera Viewport */}
        <div className="relative w-full h-64 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-300 flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

          {/* Guide Overlay */}
          <div className="absolute inset-8 sm:inset-12 border-4 border-dashed border-blue-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
            <span className="text-xs font-bold text-blue-900 bg-white/90 px-3 py-1 rounded-full self-start backdrop-blur-md shadow-sm">
              Align bottle label text inside box
            </span>
          </div>

          {isScanning && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <ScanText className="w-12 h-12 text-blue-400 animate-spin" />
              <p className="text-xl font-bold text-white">Extracting text via Tesseract Vision OCR...</p>
            </div>
          )}
        </div>

        {/* Feedback Banner */}
        {scanResult && (
          <div
            className={`p-5 rounded-2xl border-2 animate-in fade-in ${
              scanResult.success
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                : 'bg-red-50 border-red-400 text-red-900'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white shrink-0 shadow-sm">
                {scanResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div>
                <h4 className="text-2xl font-black">
                  {scanResult.success ? 'Verification MATCHED' : 'Verification MISMATCH'}
                </h4>
                <p className="text-lg font-semibold mt-1">{scanResult.message}</p>
                {scanResult.extractedText && (
                  <div className="mt-2 text-xs font-mono bg-white/80 p-2 rounded-lg border border-slate-200">
                    Extracted OCR Text: "{scanResult.extractedText.slice(0, 100)}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleCaptureAndScan}
            disabled={isScanning}
            className="w-full sm:w-auto flex-1 py-5 px-8 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-2xl rounded-2xl shadow-md transition-all flex items-center justify-center gap-3"
          >
            <Camera className="w-8 h-8" />
            Scan & Verify Medicine
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-5 px-8 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xl rounded-2xl border border-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
