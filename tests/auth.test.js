import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { generateToken } from '../server/middleware/auth.js';
import jwt from 'jsonwebtoken';
import { config } from '../server/config.js';

test('Authentication Engine Tests', async (t) => {
  await t.test('Password Hashing and Comparison', () => {
    const rawPass = 'echocare123';
    const hash = bcrypt.hashSync(rawPass, 10);
    assert.equal(bcrypt.compareSync(rawPass, hash), true);
    assert.equal(bcrypt.compareSync('wrongpass', hash), false);
  });

  await t.test('JWT Issue and Verification', () => {
    const userPayload = { id: 'usr-1', username: 'priya', role: 'PRIMARY_CAREGIVER' };
    const token = generateToken(userPayload);
    assert.ok(token, 'Token should be issued');

    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.id, 'usr-1');
    assert.equal(decoded.username, 'priya');
    assert.equal(decoded.role, 'PRIMARY_CAREGIVER');
  });
});
