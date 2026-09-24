import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, ShieldCheck, Send, Copy, RefreshCw } from 'lucide-react';
import { requestNotificationPermissionAndToken, listenToForegroundMessages } from '../../services/firebase';
import { api } from '../../services/api';

export const CaregiverNotificationCenter = ({ caregiverId = 'cg-1' }) => {
  const [permissionState, setPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [fcmToken, setFcmToken] = useState(localStorage.getItem('echocare_fcm_token') || '');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [foregroundAlert, setForegroundAlert] = useState(null);

  useEffect(() => {
    // Listen for foreground Firebase push notifications
    let unsub = () => {};
    listenToForegroundMessages((payload) => {
      console.log('[NotificationCenter] Foreground FCM message:', payload);
      setForegroundAlert({
        title: payload.notification?.title || payload.data?.title || 'Caregiver Alert',
        body: payload.notification?.body || payload.data?.body || 'New notification received',
        timestamp: new Date().toLocaleTimeString(),
      });
    }).then((unsubFn) => {
      if (unsubFn) unsub = unsubFn;
    });

    return () => unsub();
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await requestNotificationPermissionAndToken();

    if (!result.success) {
      setPermissionState(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
      setStatusMessage({
        type: 'error',
        title: getErrorTitle(result.error),
        text: result.message,
      });
      setLoading(false);
      return;
    }

    // Permission granted and token retrieved!
    const token = result.token;
    setFcmToken(token);
    localStorage.setItem('echocare_fcm_token', token);
    setPermissionState('granted');

    // Register token in EchoCare backend
    const deviceInfo = `${navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser'} (${navigator.platform})`;
    const backendRes = await api.registerFcmDevice(caregiverId, token, deviceInfo);

    if (backendRes.success) {
      setStatusMessage({
        type: 'success',
        title: 'FCM Registration Successful',
        text: backendRes.message || 'Device registered successfully',
      });
    } else {
      setStatusMessage({
        type: 'warning',
        title: 'Token Generated, Backend Sync Notice',
        text: backendRes.error || 'FCM token generated locally but server API save failed. Client fallback active.',
      });
    }

    setLoading(false);
  };

  const handleSendTestNotification = async () => {
    if (!fcmToken) {
      setStatusMessage({
        type: 'error',
        title: 'Registration Token Missing',
        text: 'Please click "Enable Caregiver Notifications" first to register your device token.',
      });
      return;
    }

    setSendingTest(true);
    setStatusMessage(null);

    try {
      const res = await api.sendTestFcmNotification(caregiverId, fcmToken);

      if (res.success && res.result?.success) {
        setStatusMessage({
          type: 'success',
          title: 'FCM Push Dispatched!',
          text: `Real Firebase FCM push notification sent. Message ID: ${res.result.providerMessageId || 'OK'}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          title: 'FCM Dispatch Error',
          text: res.message || res.result?.error || 'Failed to dispatch FCM push notification via server.',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        title: 'FCM Backend Delivery Error',
        text: err.message,
      });
    }

    setSendingTest(false);
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      alert('FCM Token copied to clipboard!');
    }
  };

  function getErrorTitle(code) {
    switch (code) {
      case 'UNSUPPORTED_BROWSER':
        return 'Browser Unsupported';
      case 'PERMISSION_DENIED':
        return 'Notification Permission Blocked';
      case 'PERMISSION_NOT_GRANTED':
        return 'Permission Dismissed';
      case 'FIREBASE_INIT_FAILED':
        return 'Firebase Initialization Failure';
      case 'SERVICE_WORKER_REGISTRATION_FAILED':
        return 'Service Worker Error';
      case 'INVALID_OR_EXPIRED_REGISTRATION':
        return 'Invalid Registration Token';
      default:
        return 'Notification Setup Failed';
    }
  }

  return (
    <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl space-y-6 text-white shadow-xl">
      {/* Real-time Foreground Push Alert Banner */}
      {foregroundAlert && (
        <div className="p-4 bg-emerald-950 border-2 border-emerald-600 rounded-2xl flex items-start justify-between gap-4 animate-bounce">
          <div className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-emerald-100 flex items-center gap-2">
                {foregroundAlert.title}
                <span className="text-xs font-normal text-emerald-400">({foregroundAlert.timestamp})</span>
              </h4>
              <p className="text-emerald-200 text-sm">{foregroundAlert.body}</p>
            </div>
          </div>
          <button
            onClick={() => setForegroundAlert(null)}
            className="text-xs text-emerald-400 hover:text-white font-bold uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-2xl text-emerald-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              Firebase Cloud Messaging (FCM) Push System
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Real-time Web Push alerts to caregiver devices for critical medication & emergency SOS events
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {permissionState === 'granted' && fcmToken ? (
            <span className="px-3 py-1.5 bg-emerald-950 border border-emerald-700 text-emerald-300 font-extrabold text-xs rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              FCM ACTIVE & REGISTERED
            </span>
          ) : permissionState === 'denied' ? (
            <span className="px-3 py-1.5 bg-red-950 border border-red-800 text-red-300 font-extrabold text-xs rounded-full flex items-center gap-1.5">
              <BellOff className="w-4 h-4 text-red-400" />
              PERMISSION BLOCKED
            </span>
          ) : permissionState === 'unsupported' ? (
            <span className="px-3 py-1.5 bg-amber-950 border border-amber-800 text-amber-300 font-extrabold text-xs rounded-full flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              UNSUPPORTED BROWSER
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-xs rounded-full flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-slate-400" />
              NOT ENABLED YET
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enable Caregiver Notifications Button */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-base text-slate-200">1. Browser Device Registration</h4>
            <p className="text-slate-400 text-xs mt-1">
              Request browser notification permissions, register service worker (`/firebase-messaging-sw.js`), and obtain FCM device token.
            </p>
          </div>

          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              permissionState === 'granted' && fcmToken
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Registering FCM Device...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                {permissionState === 'granted' && fcmToken ? 'Enable Caregiver Notifications (Re-register)' : 'Enable Caregiver Notifications'}
              </>
            )}
          </button>
        </div>

        {/* Send Test Notification Button */}
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-slate-200">2. Protected Real FCM Test Action</h4>
              <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-black uppercase rounded">
                Real FCM Push
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Dispatch a real Firebase Cloud Messaging push notification via EchoCare backend to this registered device token.
            </p>
          </div>

          <button
            onClick={handleSendTestNotification}
            disabled={sendingTest || !fcmToken}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingTest ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Dispatching Real FCM Push...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test Notification
              </>
            )}
          </button>
        </div>
      </div>

      {/* FCM Token Details Bar */}
      {fcmToken && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Registered FCM Device Token
            </span>
            <button
              onClick={handleCopyToken}
              className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
            >
              <Copy className="w-3 h-3" />
              Copy Token
            </button>
          </div>
          <p className="text-slate-300 text-xs font-mono break-all bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            {fcmToken}
          </p>
        </div>
      )}

      {/* Feedback & Error Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
              : statusMessage.type === 'warning'
              ? 'bg-amber-950 border-amber-800 text-amber-200'
              : 'bg-red-950 border-red-800 text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          )}
          <div>
            <h5 className="font-bold">{statusMessage.title}</h5>
            <p className="text-xs opacity-90 mt-0.5">{statusMessage.text}</p>
          </div>
        </div>
      )}
    </div>
  );
};
