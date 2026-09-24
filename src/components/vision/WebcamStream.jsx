import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CameraOff, Sparkles } from 'lucide-react';
import { detectAndMatchFace, initFaceApi } from '../../services/faceRecognition';

export const WebcamStream = ({ onFaceDetected, active = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);

  // Bounding box canvas overlay defined before use
  const drawFaceOverlay = useCallback((result) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth || canvas.clientWidth || 640;
    const height = video.videoHeight || canvas.clientHeight || 480;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (result && result.detected && result.box) {
      const { x, y, width: bw, height: bh } = result.box;

      ctx.lineWidth = 4;
      ctx.strokeStyle = result.matched ? '#2563eb' : '#d97706';
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x, y, bw, bh);

      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';

      const cornerLen = 16;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(x + bw - cornerLen, y);
      ctx.lineTo(x + bw, y);
      ctx.lineTo(x + bw, y + cornerLen);
      ctx.stroke();

      if (result.matched && result.person) {
        ctx.fillStyle = result.person.faceColorTag || '#2563eb';
        ctx.fillRect(x, Math.max(0, y - 36), Math.max(160, bw), 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(`Recognized: ${result.person.name}`, x + 8, Math.max(0, y - 14));
      }
    }
  }, []);

  // Strictly control webcam stream based on active prop
  useEffect(() => {
    let activeStream = null;
    const currentVideo = videoRef.current;

    if (!active) {
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        currentVideo.srcObject = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        activeStream = stream;
        if (currentVideo) {
          currentVideo.srcObject = stream;
          currentVideo.play();
          setStreamActive(true);
        }
      } catch (err) {
        console.warn('Webcam permission or device error:', err);
        setCameraError('Camera unavailable or permission denied.');
        setStreamActive(false);
      }
    };

    startCamera();

    // Async init AI models
    initFaceApi().then((ready) => {
      setModelsReady(ready);
    });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        currentVideo.srcObject = null;
      }
    };
  }, [active]);

  // Face detection loop while stream active
  useEffect(() => {
    if (!active || !streamActive) return;

    let animFrameId = null;
    let lastScanTime = 0;

    const runScanLoop = async (timestamp) => {
      if (timestamp - lastScanTime > 250) {
        lastScanTime = timestamp;

        if (videoRef.current && streamActive) {
          const result = await detectAndMatchFace(videoRef.current);
          if (onFaceDetected) {
            onFaceDetected(result);
          }
          drawFaceOverlay(result);
        }
      }
      animFrameId = requestAnimationFrame(runScanLoop);
    };

    animFrameId = requestAnimationFrame(runScanLoop);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [active, streamActive, onFaceDetected, drawFaceOverlay]);

  if (!active) {
    return null;
  }

  return (
    <div className="relative w-full h-full min-h-[300px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl flex items-center justify-center">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 ${
          streamActive ? 'opacity-100' : 'hidden'
        }`}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100 z-10"
      />

      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70 animate-scan-line pointer-events-none z-10" />

      {cameraError && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="p-4 bg-red-500/10 text-red-500 rounded-3xl border border-red-500/20 mb-4">
            <CameraOff className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Camera Access Unavailable</h3>
          <p className="text-slate-400 text-sm max-w-sm">{cameraError}</p>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-semibold text-blue-300">
        <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
        <span>{modelsReady ? 'AI Face Recognition Active' : 'Initializing Vision Engine...'}</span>
      </div>
    </div>
  );
};
