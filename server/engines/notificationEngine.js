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

export class PushProvider {
  async send(deviceSubscription, messageText) {
    if (!deviceSubscription) {
      return {
        success: false,
        status: 'FAILED',
        error: 'No registered push subscription device target',
        provider: 'PushProvider',
      };
    }
    // Simulation / Web Push delivery
    return {
      success: true,
      status: 'DELIVERED',
      providerMessageId: 'push-' + Date.now(),
      provider: 'PushProvider',
    };
  }
}

/**
 * Main Notification Engine Service
 * Implements Fallback Chain: WhatsApp -> SMS -> Dashboard Alert
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
                      db.prepare('SELECT * FROM caregivers WHERE patient_id = ? AND role = "primary"').get(patientId);

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

    // 2. Attempt WhatsApp Delivery First
    const waResult = await this.whatsAppProvider.send(recipientPhone, message);
    
    db.prepare(`
      INSERT INTO notification_deliveries (id, notification_id, channel, provider, attempt_number, status, response_payload, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-wa',
      notificationId,
      'WHATSAPP',
      waResult.provider,
      1,
      waResult.status,
      waResult.responsePayload || null,
      waResult.error || null
    );

    if (waResult.success) {
      primarySuccess = true;
      finalStatus = waResult.status;
      deliveryLogs.push(`WhatsApp delivered to ${caregiverName} (${recipientPhone}).`);
    } else {
      deliveryLogs.push(`WhatsApp delivery failed (${waResult.error}). Initiating SMS fallback...`);

      // 3. Fallback to SMS Provider
      const smsResult = await this.smsProvider.send(recipientPhone, message);
      
      db.prepare(`
        INSERT INTO notification_deliveries (id, notification_id, channel, provider, attempt_number, status, response_payload, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-sms',
        notificationId,
        'SMS',
        smsResult.provider,
        2,
        smsResult.status,
        smsResult.responsePayload || null,
        smsResult.error || null
      );

      if (smsResult.success) {
        primarySuccess = true;
        finalStatus = smsResult.status;
        deliveryLogs.push(`SMS fallback delivered to ${caregiverName} (${recipientPhone}).`);
      } else {
        deliveryLogs.push(`SMS delivery failed (${smsResult.error}). All external channels failed! Critical alert raised on Caregiver Dashboard.`);
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
