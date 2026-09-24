import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../server/db/database.js';
import { processEchoMessage } from '../server/engines/orchestratorEngine.js';

test('Echo Orchestrator & Memory Engine Tests', async (t) => {
  initDatabase();

  await t.test('Deterministic Intent Parsing - Greeting', () => {
    const res = processEchoMessage({ text: 'Echo', language: 'en-IN' });
    assert.equal(res.recognizedIntent, 'GREETING');
    assert.ok(res.responseText.includes('Margaret'));
  });

  await t.test('Personal Memory Graph Query - No Hallucination', () => {
    const resPriya = processEchoMessage({ text: 'Who is Priya?', language: 'en-IN' });
    assert.equal(resPriya.recognizedIntent, 'FAMILY_QUERY');
    assert.ok(resPriya.responseText.includes('Daughter'));

    const resUnknown = processEchoMessage({ text: 'Who is Uncle Bob?', language: 'en-IN' });
    assert.ok(resUnknown.responseText.includes("don't have that family member saved"));
  });

  await t.test('Repeated Question Mode Context Retention', () => {
    const turn1 = processEchoMessage({ text: 'When is Priya coming?', language: 'en-IN' });
    assert.equal(turn1.recognizedIntent, 'FAMILY_QUERY');

    const turn2 = processEchoMessage({ text: 'When is Priya coming?', language: 'en-IN' });
    assert.equal(turn2.repeatCount, 2);
    assert.ok(turn2.responseText.includes('Priya is still expected'));
  });

  await t.test('Distress & Delusion Safety Policy', () => {
    const resDistress = processEchoMessage({ text: "I'm scared and alone", language: 'en-IN' });
    assert.equal(resDistress.recognizedIntent, 'DISTRESS');
    assert.equal(resDistress.agentSource, 'SAFETY_DEESCALATION_AGENT');
    assert.ok(resDistress.responseText.includes('completely safe here with me'));
  });

  await t.test('Medication Query and Verification Intent', () => {
    const resMed = processEchoMessage({ text: 'When is my medicine?', language: 'en-IN' });
    assert.equal(resMed.recognizedIntent, 'MEDICATION_QUERY');

    const resConf = processEchoMessage({ text: 'Yes I already took it', language: 'en-IN' });
    assert.equal(resConf.recognizedIntent, 'MEDICATION_CONFIRMATION');
    assert.ok(resConf.responseText.includes('marked') || resConf.responseText.includes('taken'));
  });
});
