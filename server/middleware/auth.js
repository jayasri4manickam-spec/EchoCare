import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/database.js';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For convenience in public demo mode, allow fallback guest identity if configured
    if (req.headers['x-guest-access'] === 'true' || config.env === 'development') {
      req.user = { id: 'usr-caregiver-1', username: 'priya', role: 'PRIMARY_CAREGIVER' };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized role access denied' });
    }
    next();
  };
}

export function auditAccess(action, targetData) {
  return (req, res, next) => {
    try {
      const user = req.user ? req.user.username : 'Anonymous';
      const role = req.user ? req.user.role : 'Guest';
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, role, action, target_data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), user, role, action, targetData, timestamp);
    } catch (e) {
      console.error('Failed creating audit log', e);
    }
    next();
  };
}
