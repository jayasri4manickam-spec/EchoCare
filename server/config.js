import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: process.env.PORT || 5001,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'echocare_default_jwt_secret_dev_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DATABASE_URL || path.join(__dirname, 'db/echocare.db'),
  
  // WhatsApp Provider Configuration
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    senderNumber: process.env.WHATSAPP_SENDER_NUMBER || '+14155238886',
  },

  // SMS Provider Configuration
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '+18005550199',
  },

  // Push Notification Configuration
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  },

  // Optional AI API Key (Enrichment only)
  optionalAiApiKey: process.env.OPTIONAL_AI_API_KEY || '',

  // Firebase Admin Credentials (Backend Push Notifications)
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'config/serviceAccountKey.json'),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'echocare-8c29e',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  },
};
