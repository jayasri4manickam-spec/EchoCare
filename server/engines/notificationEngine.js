import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import { db } from '../db/database.js';
import { config } from '../config.js';

export class WhatsAppProvider {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || config.whatsapp.apiUrl;
    this.apiToken = options.apiToken || config.whatsapp.apiToken;
    this.phoneNumberId = options.phoneNumberId || config.whatsapp.phoneNumberId;
    this.senderNumber = options.senderNumber || config.whatsapp.senderNumber;
  }

  async send(recipientPhone, messageText) {
    if (!this.apiToken || !this.phoneNumberId) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        error: 'WhatsApp API credentials missing (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set)',
        provider: 'WhatsAppProvider (Unconfigured)',
      };
    }

    try {
      // Execute REST POST to WhatsApp API
      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientPhone.replace(/[^\d+]/g, ''),
          type: 'text',
          text: { body: messageText },
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          error: resData.error?.message || `HTTP ${response.status}`,
          provider: 'WhatsAppProvider',
          responsePayload: JSON.stringify(resData),
        };
      }

      return {
        success: true,
        status: 'DELIVERED',
        providerMessageId: resData.messages?.[0]?.id || 'wa-msg-ok',
        provider: 'WhatsAppProvider',
        responsePayload: JSON.stringify(resData),
      };
    } catch (err) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
        provider: 'WhatsAppProvider',
      };
    }
  }
}

export class SMSProvider {
  constructor(options = {}) {
    this.accountSid = options.accountSid || config.sms.accountSid;
    this.authToken = options.authToken || config.sms.authToken;
    this.fromNumber = options.fromNumber || config.sms.fromNumber;
  }

  async send(recipientPhone, messageText) {
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        error: 'SMS API credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set)',
        provider: 'SMSProvider (Unconfigured)',
      };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', recipientPhone);
      params.append('From', this.fromNumber);
      params.append('Body', messageText);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const resData = await response.json();
      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          error: resData.message || `HTTP ${response.status}`,
          provider: 'SMSProvider',
          responsePayload: JSON.stringify(resData),
        };
      }

      return {
        success: true,
        status: 'SENT',
        providerMessageId: resData.sid,
        provider: 'SMSProvider',
        responsePayload: JSON.stringify(resData),
      };
    } catch (err) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message,
        provider: 'SMSProvider',
      };
    }
  }
}

let firebaseAdminApp = null;

function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  try {
    const apps = getAdminApps();
    const serviceAccountPath = config.serviceAccountPath;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (apps.length === 0) {
        firebaseAdminApp = initAdminApp({
          credential: cert(serviceAccount),
        });
      } else {
        firebaseAdminApp = apps[0];
      }
      console.log('✅ Firebase Admin SDK initialized using serviceAccountKey.json file.');
      return firebaseAdminApp;
    }

    const { projectId, clientEmail, privateKey } = config.firebase;
    if (clientEmail && privateKey) {
      if (apps.length === 0) {
        firebaseAdminApp = initAdminApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        firebaseAdminApp = apps[0];
      }
      console.log('✅ Firebase Admin SDK initialized for FCM push notifications.');
      return firebaseAdminApp;
    } else {
      if (apps.length === 0) {
        firebaseAdminApp = initAdminApp({ projectId });
      } else {
        firebaseAdminApp = apps[0];
      }
      return firebaseAdminApp;
    }
  } catch (err) {
    console.warn('[PushProvider] Firebase Admin init notice:', err.message);
    return null;
  }
}

export class PushProvider {
  async send(fcmToken, options = {}) {
    const { title = 'EchoCare Caregiver Alert', message = 'New alert', notificationId, priority = 'NORMAL' } =
      typeof options === 'string' ? { message: options } : options;

    if (!fcmToken) {
      return {
        success: false,
        status: 'UNREGISTERED_TOKEN',
        error: 'No registered FCM device token for caregiver.',
        provider: 'FirebaseFCM',
      };
    }

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const messagePayload = {
          token: fcmToken,
          notification: {
            title,
            body: message,
          },
          data: {
            notificationId: notificationId || ('notif-' + Date.now()),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            timestamp: new Date().toISOString(),
          },
          webpush: {
            headers: {
              Urgency: priority === 'CRITICAL' ? 'high' : 'normal',
            },
            notification: {
              title,
              body: message,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              requireInteraction: priority === 'CRITICAL',
            },
          },
        };

        const messaging = getAdminMessaging(adminApp);
        const response = await messaging.send(messagePayload);
        return {
          success: true,
          status: 'DELIVERED',
          providerMessageId: response,
          provider: 'FirebaseFCM',
          responsePayload: JSON.stringify({ messageId: response }),
        };
      }
    } catch (err) {
      console.error('[PushProvider] FCM push send failed:', err.message);
      const isExpired = err.code === 'messaging/registration-token-not-registered' || err.message.includes('not-registered');
      return {
        success: false,
        status: isExpired ? 'EXPIRED_TOKEN' : 'FAILED',
        error: `FCM Send Error: ${err.message}`,
        provider: 'FirebaseFCM',
        responsePayload: JSON.stringify({ code: err.code, message: err.message }),
      };
    }

    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'Firebase Admin SDK service account key (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) not set in server environment',
      provider: 'FirebaseFCM (Unconfigured)',
    };
  }
}

/**
 * Main Notification Engine Service
 * Implements Fallback Chain: FCM Web Push -> WhatsApp -> SMS -> Dashboard Alert
 */
export class NotificationService {
  constructor() {
    this.whatsAppProvider = new WhatsAppProvider();
    this.smsProvider = new SMSProvider();
    this.pushProvider = new PushProvider();
  }

  async dispatchNotification({ patientId, caregiverId, eventType, priority = 'NORMAL', message }) {
    const notificationId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    
    // Fetch Caregiver Profile
    const caregiver = db.prepare('SELECT * FROM caregivers WHERE id = ?').get(caregiverId) ||
                      db.prepare("SELECT * FROM caregivers WHERE patient_id = ? AND role = 'primary'").get(patientId);

    const recipientPhone = caregiver ? caregiver.phone_number : '+18005550199';
    const caregiverName = caregiver ? caregiver.name : 'Primary Caregiver';

    // 1. Insert Initial Notification Record
    db.prepare(`
      INSERT INTO notifications (id, patient_id, recipient_caregiver_id, event_type, priority, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(notificationId, patientId, caregiver ? caregiver.id : null, eventType, priority, message, 'QUEUED');

    const deliveryLogs = [];
    let finalStatus = 'FAILED';
    let primarySuccess = false;
    let attemptCount = 1;

    // 2. Attempt FCM Push Delivery First if caregiver has registered FCM device token
    if (caregiver && caregiver.fcm_token) {
      const pushResult = await this.pushProvider.send(caregiver.fcm_token, {
        title: `EchoCare: ${eventType.replace(/_/g, ' ')}`,
        message,
        notificationId,
        priority,
      });

      db.prepare(`
        INSERT INTO notification_deliveries (id, notification_id, channel, provider, attempt_number, status, response_payload, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-fcm',
        notificationId,
        'PUSH',
        pushResult.provider,
        attemptCount++,
        pushResult.status,
        pushResult.responsePayload || null,
        pushResult.error || null
      );

      if (pushResult.success) {
        primarySuccess = true;
        finalStatus = pushResult.status;
        deliveryLogs.push(`Firebase FCM Push delivered to ${caregiverName}'s registered device.`);
      } else {
        deliveryLogs.push(`Firebase FCM Push attempt (${pushResult.error}). Continuing to SMS fallback...`);
      }
    }

    // 3. Fallback to SMS Provider
    if (!primarySuccess) {
      const smsResult = await this.smsProvider.send(recipientPhone, message);
      
      db.prepare(`
        INSERT INTO notification_deliveries (id, notification_id, channel, provider, attempt_number, status, response_payload, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-sms',
        notificationId,
        'SMS',
        smsResult.provider,
        attemptCount++,
        smsResult.status,
        smsResult.responsePayload || null,
        smsResult.error || null
      );

      if (smsResult.success) {
        primarySuccess = true;
        if (finalStatus === 'FAILED') finalStatus = smsResult.status;
        deliveryLogs.push(`SMS fallback delivered to ${caregiverName} (${recipientPhone}).`);
      } else {
        deliveryLogs.push(`SMS delivery failed (${smsResult.error}). All external channels failed! Alert logged on Caregiver Dashboard.`);
        finalStatus = 'FAILED';
      }
    }

    // Update Notification Status in Database
    db.prepare(`
      UPDATE notifications
      SET status = ?, failure_reason = ?
      WHERE id = ?
    `).run(finalStatus, primarySuccess ? null : deliveryLogs.join(' | '), notificationId);

    // Record Event in Longitudinal Care Timeline
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.prepare(`
      INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      patientId,
      timeStr,
      dateStr,
      'Safety',
      `Caregiver Alert (${eventType})`,
      `${message}. Status: ${finalStatus}. ${deliveryLogs[deliveryLogs.length - 1]}`,
      'Notification Engine',
      priority === 'CRITICAL' ? 'AlertTriangle' : 'Bell'
    );

    return {
      notificationId,
      status: finalStatus,
      recipient: caregiverName,
      recipientPhone,
      deliveryLogs,
      primarySuccess,
    };
  }

  acknowledgeNotification(notificationId, acknowledgedBy = 'Caregiver User') {
    const timeNow = new Date().toISOString();
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);

    if (!notif) return { success: false, error: 'Notification not found' };

    db.prepare(`
      UPDATE notifications
      SET status = 'ACKNOWLEDGED', acknowledged_at = ?
      WHERE id = ?
    `).run(timeNow, notificationId);

    // Stop active emergency escalation for this patient
    db.prepare(`
      UPDATE emergency_escalations
      SET status = 'ACKNOWLEDGED', stopped_at = ?, stopped_by = ?
      WHERE patient_id = ? AND status = 'ACTIVE'
    `).run(timeNow, acknowledgedBy, notif.patient_id);

    // Log timeline entry
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.prepare(`
      INSERT INTO timeline_events (id, patient_id, timestamp, date_str, category, title, detail, source, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tl-ack-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      notif.patient_id,
      timeStr,
      dateStr,
      'Safety',
      'Caregiver Acknowledged Alert',
      `Caregiver ${acknowledgedBy} acknowledged alert '${notif.event_type}'. Escalation stopped.`,
      'Caregiver Action',
      'CheckCircle'
    );

    return { success: true, notificationId, status: 'ACKNOWLEDGED' };
  }
}

export const notificationService = new NotificationService();
